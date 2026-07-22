"""
AI Calling Agent worker.

A background worker periodically sweeps every tenant workspace for pending
Raw Leads and drives outbound qualification calls through the workspace's
configured voice provider:

  * 'simulation'  — the built-in demo dialer that fabricates plausible call
                    outcomes locally (no external traffic).
  * 'hirebuddha'  — dispatches each lead to the HireBuddha AI voice platform
                    (agent "Priya"); the real call result arrives later via
                    the CRM Update API callback (/integrations/hirebuddha).

Both providers flow through the same pipeline_service pathway used by the
REST API, so leads advance Raw -> Called with identical history, audit
trail, and retry accounting.
"""
import asyncio
import random
import time
from sqlalchemy import select, text
from loguru import logger
from app.db.session import async_session_maker, resolve_schema, schema_exists, InvalidTenantError
from app.models.models import Tenant, PipelineLead
from app.services import pipeline_service, hirebuddha

AGENT_NAME = "AI Calling Agent"
GLOBAL_TICK_SECONDS = 15  # worker heartbeat; per-tenant cadence comes from lead_settings

PENDING_STATUSES = ("Pending Call", "Raw Lead", "Call Failed - Retry Scheduled",
                    "Dispatch Failed - Retry Scheduled")

OUTCOME_PROFILES = [
    {
        "interest_status": "Interested",
        "outcome": "Interested - Requested Site Visit",
        "summary": ("Prospect answered promptly and engaged well. Confirmed an active property search in the "
                    "{project} corridor with a budget around {budget}. Asked detailed questions about carpet area, "
                    "possession timelines and payment plans. Agreed to a site visit this weekend and requested a "
                    "brochure over WhatsApp."),
        "weight": 3,
    },
    {
        "interest_status": "Interested",
        "outcome": "Interested - Wants Callback with Pricing",
        "summary": ("Prospect is comparing options in {project} and one competing project. Budget indicated near "
                    "{budget}. Asked for a detailed cost sheet including registration and GST. Requested a follow-up "
                    "call after reviewing pricing with family."),
        "weight": 3,
    },
    {
        "interest_status": "Interested",
        "outcome": "Warm - Considering Loan Options",
        "summary": ("Prospect showed genuine interest in {project} but needs home-loan pre-approval first. Currently "
                    "speaking with two banks. Asked whether the project has tie-ups for faster sanction. Worth a "
                    "sales follow-up within the week."),
        "weight": 2,
    },
    {
        "interest_status": "Not Interested",
        "outcome": "Not Interested - Budget Mismatch",
        "summary": ("Prospect answered the call but indicated the ticket size for {project} exceeds their current "
                    "budget of {budget}. Not planning to stretch. Open to hearing about smaller configurations if "
                    "launched later."),
        "weight": 2,
    },
    {
        "interest_status": "Not Interested",
        "outcome": "Not Interested - Already Purchased",
        "summary": ("Prospect has recently finalized a property with another developer and asked to be removed from "
                    "the calling list. Call closed politely."),
        "weight": 1,
    },
]

FAILURE_REASONS = [
    "No answer after 6 rings",
    "Number busy on both attempts",
    "Call dropped mid-network handoff",
    "Switched off / not reachable",
]

# per-tenant last cycle timestamps
_last_run: dict[str, float] = {}


def simulate_call(lead: PipelineLead) -> dict:
    """Produces a randomized but plausible AI call result for a lead."""
    profiles = [p for p in OUTCOME_PROFILES for _ in range(p["weight"])]
    profile = random.choice(profiles)
    budget = lead.budget or "₹1 Crore"
    return {
        "interest_status": profile["interest_status"],
        "outcome": profile["outcome"],
        "summary": profile["summary"].format(project=lead.project, budget=budget),
        "duration_seconds": random.randint(45, 380),
        "confidence": round(random.uniform(0.62, 0.98), 2),
    }


async def run_cycle_for_tenant(tenant_id: str, tenant_name: str) -> int:
    """
    Runs one AI calling sweep inside a tenant schema. Returns number of leads processed.
    Each lead is committed atomically with its history + audit rows.
    """
    # Hard-validate before interpolating into SET search_path; a tenant row
    # with a malformed id (or a missing schema) is skipped, never executed.
    try:
        schema = resolve_schema(tenant_id)
    except InvalidTenantError:
        logger.warning(f"AI agent skipping tenant with invalid id: {tenant_id!r}")
        return 0
    processed = 0

    async with async_session_maker() as session:
        if not await schema_exists(session, schema):
            logger.warning(f"AI agent skipping tenant without schema: {tenant_id!r}")
            return 0
        await session.execute(text(f"SET search_path TO {schema}, public"))
        settings_row = await pipeline_service.get_settings(session)

        if not settings_row.ai_calling_enabled:
            await session.commit()
            return 0

        provider = getattr(settings_row, "ai_provider", None) or "simulation"
        if provider == "hirebuddha":
            processed = await _run_hirebuddha_cycle(session, tenant_name, settings_row)
            await session.commit()
            return processed

        result = await session.execute(
            select(PipelineLead)
            .where(PipelineLead.stage == "raw")
            .where(PipelineLead.status.in_(PENDING_STATUSES))
            .where(PipelineLead.call_attempts < settings_row.ai_retry_limit)
            .order_by(PipelineLead.created_at)
            .limit(settings_row.ai_batch_size)
        )
        leads = result.scalars().all()

        for lead in leads:
            await pipeline_service.write_audit(
                session, tenant_name, AGENT_NAME,
                f"AI call initiated for pipeline lead {lead.id} ({lead.name}, attempt {(lead.call_attempts or 0) + 1})."
            )
            if random.random() < 0.72:
                call = simulate_call(lead)
                pipeline_service.apply_call_success(lead, call)
                await pipeline_service.write_audit(
                    session, tenant_name, AGENT_NAME,
                    f"AI call completed for {lead.id} ({lead.name}): {call['outcome']} "
                    f"[confidence {call['confidence']}] - moved to Called Leads."
                )
                if call["interest_status"] == "Interested":
                    await pipeline_service.write_audit(
                        session, tenant_name, AGENT_NAME,
                        f"Notification: {lead.name} ({lead.id}) flagged INTERESTED - sales follow-up recommended.",
                    )
            else:
                reason = random.choice(FAILURE_REASONS)
                pipeline_service.apply_call_failure(lead, settings_row.ai_retry_limit, reason)
                await pipeline_service.write_audit(
                    session, tenant_name, AGENT_NAME,
                    f"AI call attempt for {lead.id} ({lead.name}) failed: {reason}.",
                    status="Failed"
                )
            processed += 1

        await session.commit()

    return processed


async def _run_hirebuddha_cycle(session, tenant_name: str, settings_row) -> int:
    """
    One HireBuddha sweep: re-queues leads whose callback never arrived, then
    dispatches the next batch of pending raw leads to the voice platform.
    Leads sit in "AI Call In Progress" until the CRM Update API callback
    lands, so they are never double-dialled. Every step is logged (loguru +
    per-lead integration_logs + audit trail). The caller commits.
    """
    processed = 0

    # 1. Recover leads whose call result never came back
    result = await session.execute(
        select(PipelineLead)
        .where(PipelineLead.stage == "raw")
        .where(PipelineLead.status == hirebuddha.STATUS_IN_PROGRESS)
    )
    requeued = 0
    for lead in result.scalars().all():
        if hirebuddha.requeue_if_callback_overdue(lead, settings_row.ai_retry_limit):
            requeued += 1
            await pipeline_service.write_audit(
                session, tenant_name, hirebuddha.DISPATCH_ACTOR,
                f"Lead {lead.id} re-queued: no HireBuddha callback within "
                f"the configured timeout.", status="Failed")
    if requeued:
        logger.info(f"HireBuddha [{tenant_name}]: re-queued {requeued} lead(s) with no callback.")

    # 2. Find the next batch of pending leads to dispatch
    result = await session.execute(
        select(PipelineLead)
        .where(PipelineLead.stage == "raw")
        .where(PipelineLead.status.in_(hirebuddha.DISPATCH_PENDING_STATUSES))
        .where(PipelineLead.call_attempts < settings_row.ai_retry_limit)
        .order_by(PipelineLead.created_at)
        .limit(settings_row.ai_batch_size)
    )
    pending = result.scalars().all()
    if not pending:
        return 0

    # Only meaningful when there is actually work to dispatch: surface a clear
    # reason if the integration can't run so a "why didn't my lead get called?"
    # is answerable from the logs.
    if not hirebuddha.is_configured(settings_row):
        logger.warning(
            f"HireBuddha [{tenant_name}]: {len(pending)} lead(s) awaiting dispatch but the "
            f"integration is OFF (HIREBUDDHA_ENABLED) or missing a client id - not dispatched.")
        return 0

    logger.info(f"HireBuddha [{tenant_name}]: dispatching {len(pending)} pending lead(s) to the voice agent.")
    for lead in pending:
        await hirebuddha.dispatch_lead(session, lead, settings_row, tenant_name)
        processed += 1

    return processed


async def worker_loop():
    """Endless background loop sweeping all tenants on their configured cadence."""
    logger.info("AI Calling Agent worker started.")
    while True:
        try:
            async with async_session_maker() as session:
                await session.execute(text("SET search_path TO public"))
                result = await session.execute(select(Tenant).where(Tenant.status == "Active"))
                tenants = [(t.id, t.name) for t in result.scalars().all()]

            for tenant_id, tenant_name in tenants:
                # One tenant's failure (bad id, missing schema, transient DB
                # error) must never abort the sweep for every other workspace.
                try:
                    try:
                        schema = resolve_schema(tenant_id)
                    except InvalidTenantError:
                        logger.warning(f"AI agent skipping tenant with invalid id: {tenant_id!r}")
                        continue

                    # respect each workspace's configured calling interval
                    async with async_session_maker() as session:
                        if not await schema_exists(session, schema):
                            logger.warning(f"AI agent skipping tenant without schema: {tenant_id!r}")
                            continue
                        await session.execute(text(f"SET search_path TO {schema}, public"))
                        settings_row = await pipeline_service.get_settings(session)
                        interval = max(settings_row.ai_call_interval_seconds or 45, GLOBAL_TICK_SECONDS)
                        await session.commit()

                    if time.monotonic() - _last_run.get(tenant_id, 0) < interval:
                        continue
                    _last_run[tenant_id] = time.monotonic()

                    count = await run_cycle_for_tenant(tenant_id, tenant_name)
                    if count:
                        logger.info(f"AI Calling Agent processed {count} lead(s) for {tenant_name}.")
                except Exception as exc:
                    logger.error(f"AI Calling Agent error for tenant {tenant_id!r}: {exc}")
        except Exception as exc:
            logger.error(f"AI Calling Agent cycle error: {exc}")

        await asyncio.sleep(GLOBAL_TICK_SECONDS)
