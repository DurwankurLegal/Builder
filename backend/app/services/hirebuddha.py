"""
HireBuddha AI Calling Agent integration (voice automation provider).

Outbound (CRM -> HireBuddha): dispatch_lead() posts a `lead.created` event to
HireBuddha's inbound webhook so their AI voice agent (Priya) places the
qualification call. The lead is parked in "AI Call In Progress" until the
call result arrives.

Inbound (HireBuddha -> CRM): apply_callback() maps HireBuddha's call-result
payload onto the pipeline lead — advancing it Raw -> Called on a connected
call, or scheduling a retry / halting on non-connect outcomes.

Every HTTP exchange in either direction is recorded in integration_logs
(one row per attempt) alongside the standard audit trail, so failed
dispatches and callbacks are fully traceable.
"""
import asyncio
from datetime import datetime

import httpx
from loguru import logger
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.models import IntegrationLog, LeadSetting, PipelineLead
from app.services import pipeline_service

PROVIDER = "hirebuddha"
DISPATCH_ACTOR = "HireBuddha Dispatcher"
CALLBACK_ACTOR = "HireBuddha Agent"

# Raw-lead statuses eligible for (re-)dispatch to HireBuddha
DISPATCH_PENDING_STATUSES = (
    "Pending Call", "Raw Lead",
    "Dispatch Failed - Retry Scheduled", "Call Failed - Retry Scheduled",
)
STATUS_IN_PROGRESS = "AI Call In Progress"
STATUS_DISPATCH_FAILED = "Dispatch Failed - Retry Scheduled"
STATUS_INVALID_NUMBER = "Invalid Number - Halted"

# Callback outcome -> CRM interest classification for connected calls
CONNECTED_OUTCOMES = {
    "interested": "Interested",
    "callback_requested": "Interested",
    "not_interested": "Not Interested",
}
RETRY_OUTCOMES = {"no_answer", "busy"}
HALT_OUTCOMES = {"invalid_number"}


# ------------------------------------------------------------------
# Payload construction
# ------------------------------------------------------------------

def to_e164(phone: str) -> str | None:
    """
    Indian-market E.164 normalization: reduces any stored format to the last
    10 digits and prefixes +91. Returns None when there aren't 10 digits —
    such a lead cannot be dialled and must not be dispatched.
    """
    digits = pipeline_service.normalize_phone(phone)
    return f"+91{digits}" if len(digits) == 10 else None


def split_name(full_name: str) -> tuple[str, str]:
    parts = (full_name or "").strip().split()
    if not parts:
        return "Lead", ""
    return parts[0], " ".join(parts[1:])


def build_lead_payload(lead: PipelineLead) -> dict:
    """Builds the `lead.created` webhook body per the HireBuddha guide v1.0."""
    first_name, last_name = split_name(lead.name)
    created_at = lead.created_at.strftime("%Y-%m-%dT%H:%M:%SZ") if lead.created_at else lead.date
    properties = {
        "first_name": first_name,
        "last_name": last_name,
        "phone": to_e164(lead.phone),
        "email": lead.email,
        "project_interested": lead.project,
        "ad_source": lead.source,
        "budget_range": lead.budget,
        "created_at": created_at,
    }
    return {
        "crm_event": "lead.created",
        "id": lead.id,
        "properties": {k: v for k, v in properties.items() if v},
    }


def resolve_credentials(settings_row: LeadSetting) -> tuple[str, str]:
    """Per-workspace HireBuddha ids, falling back to the global configuration."""
    client_id = (getattr(settings_row, "hb_client_id", None) or settings.HIREBUDDHA_CLIENT_ID or "").strip()
    entity_id = (getattr(settings_row, "hb_entity_id", None) or settings.HIREBUDDHA_ENTITY_ID or "").strip()
    return client_id, entity_id


def is_configured(settings_row: LeadSetting) -> bool:
    client_id, _ = resolve_credentials(settings_row)
    return settings.HIREBUDDHA_ENABLED and bool(client_id)


# ------------------------------------------------------------------
# Outbound dispatch (CRM -> HireBuddha)
# ------------------------------------------------------------------

def _log_exchange(db: AsyncSession, *, direction: str, endpoint: str, lead_id: str | None,
                  request_payload: dict, response_payload: dict, status_code: int | None,
                  outcome: str, error: str | None = None, attempt: int = 1):
    db.add(IntegrationLog(
        provider=PROVIDER,
        direction=direction,
        endpoint=endpoint,
        lead_id=lead_id,
        request_payload=request_payload,
        response_payload=response_payload,
        status_code=status_code,
        outcome=outcome,
        error=error[:1000] if error else None,
        attempt=attempt,
    ))


def apply_dispatch_failure(lead: PipelineLead, retry_limit: int, reason: str):
    """Retry accounting for a failed hand-off to the dialer platform."""
    lead.call_attempts = (lead.call_attempts or 0) + 1
    lead.last_call_attempt = pipeline_service.now_stamp()
    if lead.call_attempts >= retry_limit:
        lead.status = "Max Call Attempts Reached"
    else:
        lead.status = STATUS_DISPATCH_FAILED
    pipeline_service.add_history(
        lead, f"HireBuddha dispatch attempt {lead.call_attempts} failed: {reason}", DISPATCH_ACTOR)


async def dispatch_lead(db: AsyncSession, lead: PipelineLead, settings_row: LeadSetting,
                        tenant_name: str) -> bool:
    """
    Sends one lead to HireBuddha's inbound webhook. Retries transient HTTP
    failures, logs every attempt, updates the lead's status either way, and
    writes the audit trail. Returns True when the lead was accepted (2xx).
    The caller owns the transaction commit.
    """
    client_id, entity_id = resolve_credentials(settings_row)
    endpoint = f"{settings.HIREBUDDHA_BASE_URL}/webhook/inbound"
    params = {"client_id": client_id, "source": "crm", "event_type": "lead.created"}
    if entity_id:
        params["entity_id"] = entity_id

    phone_e164 = to_e164(lead.phone)
    if not phone_e164:
        lead.status = STATUS_INVALID_NUMBER
        pipeline_service.add_history(
            lead, f"Dispatch blocked: phone '{lead.phone}' is not a dialable 10-digit number", DISPATCH_ACTOR)
        await pipeline_service.write_audit(
            db, tenant_name, DISPATCH_ACTOR,
            f"Lead {lead.id} ({lead.name}) not dispatched: invalid phone number.", status="Failed")
        return False

    payload = build_lead_payload(lead)
    last_error: str | None = None

    for attempt in range(1, settings.HIREBUDDHA_HTTP_RETRIES + 1):
        try:
            async with httpx.AsyncClient(timeout=settings.HIREBUDDHA_HTTP_TIMEOUT_SECONDS) as client:
                response = await client.post(endpoint, params=params, json=payload)
            try:
                body = response.json()
            except Exception:
                body = {"raw_text": response.text[:1000]}

            accepted = 200 <= response.status_code < 300
            _log_exchange(
                db, direction="outbound", endpoint=str(response.request.url), lead_id=lead.id,
                request_payload=payload, response_payload=body, status_code=response.status_code,
                outcome="Success" if accepted else "Failed",
                error=None if accepted else f"HTTP {response.status_code}", attempt=attempt)

            if accepted:
                lead.status = STATUS_IN_PROGRESS
                lead.dispatch_correlation_id = str(body.get("correlation_id") or "") or None
                lead.dispatched_at = pipeline_service.now_stamp()
                lead.call_attempts = (lead.call_attempts or 0) + 1
                lead.last_call_attempt = lead.dispatched_at
                pipeline_service.add_history(
                    lead,
                    f"Dispatched to HireBuddha AI agent (attempt {lead.call_attempts}, "
                    f"correlation {lead.dispatch_correlation_id or 'n/a'})",
                    DISPATCH_ACTOR)
                await pipeline_service.write_audit(
                    db, tenant_name, DISPATCH_ACTOR,
                    f"Lead {lead.id} ({lead.name}) dispatched to HireBuddha for AI calling "
                    f"[correlation {lead.dispatch_correlation_id or 'n/a'}].")
                logger.info(
                    f"HireBuddha dispatch OK: {lead.id} ({lead.name}, {phone_e164}) "
                    f"accepted by {tenant_name} [HTTP {response.status_code}, "
                    f"correlation {lead.dispatch_correlation_id or 'n/a'}].")
                return True

            # Non-2xx: only retry server-side errors; client errors won't heal
            last_error = f"HTTP {response.status_code}: {str(body)[:300]}"
            if response.status_code < 500:
                break
        except httpx.HTTPError as exc:
            last_error = f"{type(exc).__name__}: {exc}"
            _log_exchange(
                db, direction="outbound", endpoint=endpoint, lead_id=lead.id,
                request_payload=payload, response_payload={}, status_code=None,
                outcome="Failed", error=last_error, attempt=attempt)

        if attempt < settings.HIREBUDDHA_HTTP_RETRIES:
            await asyncio.sleep(attempt)  # linear backoff between attempts

    apply_dispatch_failure(lead, settings_row.ai_retry_limit, last_error or "unknown error")
    await pipeline_service.write_audit(
        db, tenant_name, DISPATCH_ACTOR,
        f"Lead {lead.id} ({lead.name}) dispatch to HireBuddha failed: {last_error}.", status="Failed")
    logger.warning(f"HireBuddha dispatch failed for {lead.id}: {last_error}")
    return False


def requeue_if_callback_overdue(lead: PipelineLead, retry_limit: int) -> bool:
    """
    A lead stuck in "AI Call In Progress" past the callback timeout is
    presumed lost (dropped callback / provider issue) and re-queued within
    the retry budget. Returns True when the lead's state changed.
    """
    if lead.status != STATUS_IN_PROGRESS or not lead.dispatched_at:
        return False
    try:
        dispatched = datetime.strptime(lead.dispatched_at, "%Y-%m-%d %H:%M")
    except ValueError:
        return False
    age_minutes = (datetime.now() - dispatched).total_seconds() / 60
    if age_minutes < settings.HIREBUDDHA_CALLBACK_TIMEOUT_MINUTES:
        return False

    if (lead.call_attempts or 0) >= retry_limit:
        lead.status = "Max Call Attempts Reached"
    else:
        lead.status = STATUS_DISPATCH_FAILED
    pipeline_service.add_history(
        lead,
        f"No call result received within {settings.HIREBUDDHA_CALLBACK_TIMEOUT_MINUTES} minutes - "
        f"{'retry scheduled' if lead.status == STATUS_DISPATCH_FAILED else 'retry budget exhausted'}",
        DISPATCH_ACTOR)
    return True


# ------------------------------------------------------------------
# Inbound callback application (HireBuddha -> CRM)
# ------------------------------------------------------------------

def format_duration(value) -> str | None:
    """Accepts integer seconds or a preformatted string; renders 'Xm YYs'."""
    if value is None or value == "":
        return None
    try:
        seconds = int(value)
    except (TypeError, ValueError):
        return str(value)
    return f"{seconds // 60}m {seconds % 60:02d}s"


def _format_iso_stamp(value: str | None) -> str | None:
    """ISO-8601 -> the 'YYYY-MM-DD HH:MM' format used across the pipeline."""
    if not value:
        return None
    try:
        return datetime.fromisoformat(str(value).replace("Z", "+00:00")).strftime("%Y-%m-%d %H:%M")
    except ValueError:
        return str(value)


def apply_callback(lead: PipelineLead, payload, retry_limit: int) -> str:
    """
    Maps a validated HireBuddha call result onto the lead. Returns the action
    taken: 'advanced' (moved to Called), 'retry' (non-connect, re-queued),
    or 'halted' (invalid number / retries exhausted).
    """
    outcome = payload.call_outcome
    now = pipeline_service.now_stamp()

    # The dispatch already counted this attempt; only count it here when the
    # callback arrived for a lead we did not dispatch ourselves.
    if lead.status != STATUS_IN_PROGRESS:
        lead.call_attempts = (lead.call_attempts or 0) + 1
    lead.last_call_attempt = now

    # Call intelligence stored on every outcome
    lead.disposition = outcome
    lead.lead_temperature = payload.lead_temperature
    lead.ai_summary = payload.call_summary or lead.ai_summary
    lead.ai_notes = payload.ai_notes or lead.ai_notes
    lead.callback_received_at = now
    recording = payload.call_recording_url or payload.recording_url
    if recording:
        lead.call_recording_url = recording
        lead.recording_available = True
    duration = format_duration(payload.call_duration)
    if duration:
        lead.call_duration = duration

    if outcome in CONNECTED_OUTCOMES:
        lead.stage = "called"
        lead.status = "AI Call Completed"
        lead.interest_status = CONNECTED_OUTCOMES[outcome]
        lead.called_at = _format_iso_stamp(payload.updated_at) or now
        lead.ai_outcome = payload.next_action or outcome.replace("_", " ").title()
        lead.next_followup_date = _format_iso_stamp(payload.next_action_date)
        pipeline_service.add_history(
            lead,
            f"AI call completed via HireBuddha: {outcome} ({lead.interest_status}"
            f"{', ' + payload.lead_temperature if payload.lead_temperature else ''})",
            payload.updated_by or CALLBACK_ACTOR)
        return "advanced"

    if outcome in HALT_OUTCOMES:
        lead.status = STATUS_INVALID_NUMBER
        pipeline_service.add_history(
            lead, f"HireBuddha reported an invalid number - calling halted",
            payload.updated_by or CALLBACK_ACTOR)
        return "halted"

    # Non-connect outcomes (no_answer / busy): keep the lead in Raw with
    # retry accounting so the dispatcher tries again within the budget.
    if (lead.call_attempts or 0) >= retry_limit:
        lead.status = "Max Call Attempts Reached"
        action = "halted"
    else:
        lead.status = "Call Failed - Retry Scheduled"
        action = "retry"
    pipeline_service.add_history(
        lead, f"AI call attempt {lead.call_attempts} did not connect ({outcome})",
        payload.updated_by or CALLBACK_ACTOR)
    return action
