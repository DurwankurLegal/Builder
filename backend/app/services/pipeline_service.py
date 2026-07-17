"""
Shared pipeline domain logic: stage transitions, duplicate validation,
audit trail writing, and AI call result application. Used by both the
REST API router and the background AI calling worker so every pathway
records identical history and audit entries.
"""
import re
from datetime import datetime
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.models import PipelineLead, Lead, Customer, AuditLog, LeadSetting

# Stage transition matrix: current stage -> allowed targets
ALLOWED_TRANSITIONS = {
    "raw": {"called", "qualified", "rejected", "customer"},
    "called": {"database", "qualified", "rejected", "customer"},
    "qualified": {"database", "rejected", "customer"},
}

STAGE_LABELS = {
    "raw": "Raw Leads",
    "called": "Called Leads",
    "qualified": "Qualified Leads",
    "rejected": "Rejected Leads",
    "database": "Leads Database",
    "customer": "Active Customers",
}


def now_stamp() -> str:
    return datetime.now().strftime("%Y-%m-%d %H:%M")


def normalize_phone(phone: str) -> str:
    """Keep the last 10 digits so +91 prefixes and formatting don't defeat dup checks."""
    digits = re.sub(r"\D", "", phone or "")
    return digits[-10:] if len(digits) >= 10 else digits


def add_history(lead: PipelineLead, action: str, user: str):
    history = list(lead.history or [])
    history.insert(0, {"date": now_stamp(), "action": action, "user": user})
    lead.history = history


async def write_audit(db: AsyncSession, tenant: str, user: str, action: str, status: str = "Success"):
    db.add(AuditLog(tenant=tenant, user=user, action=action, ip="127.0.0.1", status=status))


async def get_settings(db: AsyncSession) -> LeadSetting:
    result = await db.execute(select(LeadSetting))
    settings_row = result.scalars().first()
    if not settings_row:
        settings_row = LeadSetting()
        db.add(settings_row)
        await db.flush()
    return settings_row


async def next_pipeline_id(db: AsyncSession) -> str:
    """Generate the next PL-XXXX id from the max existing numeric suffix (delete-safe)."""
    result = await db.execute(select(PipelineLead.id))
    max_num = 1000
    for (pid,) in result.all():
        match = re.match(r"PL-(\d+)", pid or "")
        if match:
            max_num = max(max_num, int(match.group(1)))
    return f"PL-{max_num + 1}"


async def find_duplicate(db: AsyncSession, phone: str, email: str, settings_row: LeadSetting):
    """
    Configurable duplicate detection across the pipeline AND the main leads database.
    Returns a short description of the clash, or None when the lead is unique.
    """
    norm_phone = normalize_phone(phone)
    norm_email = (email or "").strip().lower()

    result = await db.execute(select(PipelineLead.id, PipelineLead.phone, PipelineLead.email))
    for pid, p_phone, p_email in result.all():
        if settings_row.dup_check_phone and norm_phone and normalize_phone(p_phone) == norm_phone:
            return f"phone matches pipeline lead {pid}"
        if settings_row.dup_check_email and norm_email and (p_email or "").strip().lower() == norm_email:
            return f"email matches pipeline lead {pid}"

    result = await db.execute(select(Lead.id, Lead.phone, Lead.email))
    for lid, l_phone, l_email in result.all():
        if settings_row.dup_check_phone and norm_phone and normalize_phone(l_phone) == norm_phone:
            return f"phone matches database lead {lid}"
        if settings_row.dup_check_email and norm_email and (l_email or "").strip().lower() == norm_email:
            return f"email matches database lead {lid}"

    return None


async def next_suffix_id(db: AsyncSession, model, prefix: str, base: int) -> str:
    """
    Generates the next PREFIX-N id from the highest existing numeric suffix.
    Max-based (not count-based) so ids never collide after deletions or when
    multiple code paths mint ids for the same table.
    """
    id_col = model.id if hasattr(model, "id") else model.bookingNo
    result = await db.execute(select(id_col))
    max_num = base
    for (rid,) in result.all():
        match = re.match(rf"{prefix}-(\d+)", rid or "")
        if match:
            max_num = max(max_num, int(match.group(1)))
    return f"{prefix}-{max_num + 1}"


# Backwards-compatible alias (internal callers)
_next_suffix_id = next_suffix_id


async def move_lead(db: AsyncSession, lead: PipelineLead, target: str, actor: str, tenant: str) -> str | None:
    """
    Applies a single stage transition (including transfer record creation).
    Returns None on success or a human-readable skip reason. The caller owns
    the transaction commit so bulk moves stay atomic.
    """
    allowed = ALLOWED_TRANSITIONS.get(lead.stage, set())
    if target not in allowed:
        return f"{lead.id}: move {lead.stage} -> {target} not permitted"

    from_label = STAGE_LABELS.get(lead.stage, lead.stage)
    to_label = STAGE_LABELS.get(target, target)

    if target == "called":
        lead.stage = "called"
        lead.status = "Called (Manual)"
        lead.called_at = lead.called_at or now_stamp()
        lead.ai_outcome = lead.ai_outcome or "Marked as called manually by sales user"
    elif target == "qualified":
        lead.stage = "qualified"
        lead.status = "Sales Follow-up"
        lead.contacted_by = lead.contacted_by or actor
        lead.site_visit_status = lead.site_visit_status or "Not Scheduled"
        lead.loan_requirement = lead.loan_requirement or "Pending Assessment"
    elif target == "rejected":
        lead.stage = "rejected"
        lead.status = "Rejected"
    elif target == "database":
        new_id = await _next_suffix_id(db, Lead, "LD", 1000)
        status = "Qualified" if lead.stage == "qualified" else "Contacted"
        db.add(Lead(
            id=new_id,
            date=datetime.now().strftime("%Y-%m-%d"),
            name=lead.name,
            email=lead.email,
            phone=lead.phone,
            project=lead.project,
            budget=lead.budget or "To Be Discussed",
            source=lead.source,
            executive=lead.contacted_by or actor,
            status=status,
            remarks=[],
            history=[{
                "date": datetime.now().strftime("%Y-%m-%d"),
                "detail": f"Transferred from pipeline ({lead.id}) as {status} by {actor}."
            }]
        ))
        lead.stage = "database"
        lead.status = f"Transferred ({status})"
        lead.linked_record_id = new_id
    elif target == "customer":
        cust_id = await _next_suffix_id(db, Customer, "CUST", 5000)
        db.add(Customer(
            id=cust_id,
            lead_id=lead.id,
            name=lead.name,
            email=lead.email,
            phone=lead.phone,
            address="Address unassigned",
            project=lead.project,
            budget=lead.budget or "To Be Discussed",
            executive=lead.contacted_by or actor,
            status="Agreement Pending",
            allocated_unit="Flat unassigned",
            config="2BHK",
            area="1200 sq ft",
            floor="2nd Floor",
            notes=f"Converted directly from lead pipeline record {lead.id}.",
            documents=["PAN Card", "Aadhaar Card"],
            history=[{
                "date": datetime.now().strftime("%Y-%m-%d"),
                "detail": f"Customer created from pipeline lead {lead.id} by {actor}."
            }]
        ))
        lead.stage = "customer"
        lead.status = "Converted to Customer"
        lead.linked_record_id = cust_id

    add_history(lead, f"Stage moved: {from_label} -> {to_label}", actor)
    await write_audit(db, tenant, actor, f"Pipeline lead {lead.id} ({lead.name}) moved from {from_label} to {to_label}.")
    return None


def apply_call_success(lead: PipelineLead, result: dict, actor: str = "AI Calling Agent"):
    """Applies a completed AI call onto the lead and advances it to Called."""
    duration = int(result.get("duration_seconds") or 0)
    lead.stage = "called"
    lead.status = "AI Call Completed"
    lead.interest_status = result.get("interest_status") or "Interested"
    lead.called_at = now_stamp()
    lead.call_duration = f"{duration // 60}m {duration % 60:02d}s"
    lead.ai_outcome = result.get("outcome") or "Call completed"
    lead.ai_summary = result.get("summary")
    lead.ai_confidence = result.get("confidence")
    lead.recording_available = True
    lead.call_attempts = (lead.call_attempts or 0) + 1
    lead.last_call_attempt = now_stamp()
    if result.get("budget"):
        lead.budget = result["budget"]
    add_history(lead, f"AI call completed: {lead.ai_outcome} ({lead.interest_status})", actor)


def apply_call_failure(lead: PipelineLead, retry_limit: int, reason: str, actor: str = "AI Calling Agent"):
    lead.call_attempts = (lead.call_attempts or 0) + 1
    lead.last_call_attempt = now_stamp()
    if lead.call_attempts >= retry_limit:
        lead.status = "Max Call Attempts Reached"
    else:
        lead.status = "Call Failed - Retry Scheduled"
    add_history(lead, f"AI call attempt {lead.call_attempts} failed: {reason}", actor)
