"""
AI Calling Agent simulation.

A background worker periodically sweeps every tenant workspace for pending
Raw Leads, simulates outbound qualification calls, and applies the outcome
through the same pipeline_service pathway used by the REST API — so leads
automatically advance Raw -> Called with full history, audit trail, and
retry accounting. An external dialer platform can replace this worker by
driving the /pipeline/ai REST endpoints instead.
"""
import asyncio
import random
import time
from sqlalchemy import select, text
from loguru import logger
from app.db.session import async_session_maker
from app.models.models import Tenant, PipelineLead
from app.services import pipeline_service

AGENT_NAME = "AI Calling Agent"
GLOBAL_TICK_SECONDS = 15  # worker heartbeat; per-tenant cadence comes from lead_settings

PENDING_STATUSES = ("Pending Call", "Call Failed - Retry Scheduled")

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
    schema = tenant_id.replace("-", "_").lower()
    processed = 0

    async with async_session_maker() as session:
        await session.execute(text(f"SET search_path TO {schema}, public"))
        settings_row = await pipeline_service.get_settings(session)

        if not settings_row.ai_calling_enabled:
            await session.commit()
            return 0

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
                schema = tenant_id.replace("-", "_").lower()
                # respect each workspace's configured calling interval
                async with async_session_maker() as session:
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
            logger.error(f"AI Calling Agent cycle error: {exc}")

        await asyncio.sleep(GLOBAL_TICK_SECONDS)
