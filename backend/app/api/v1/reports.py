"""
Analytics API: real per-workspace aggregates for the Dashboard and the
Analytical Reports screens, plus the notifications feed. Every number is
computed from live tenant data - nothing is fabricated client-side.
"""
import re
from collections import Counter, defaultdict
from datetime import date, datetime, timedelta
from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List

from app.api.deps import get_db, get_current_user
from app.models.models import Booking, Customer, FollowUp, Lead, PipelineLead
from app.schemas.schemas import NotificationItem, ReportSummary

router = APIRouter()

_MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                 "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]


def parse_inr(value: str | None) -> float:
    """
    Converts Indian currency strings to rupees: '₹85 Lakhs' -> 8.5e6,
    '₹1.2 Crore'/'1.2Cr' -> 1.2e7, plain digit strings pass through.
    Returns 0.0 when nothing numeric is present.
    """
    if not value:
        return 0.0
    text = str(value).lower().replace(",", "")
    match = re.search(r"(\d+(?:\.\d+)?)", text)
    if not match:
        return 0.0
    number = float(match.group(1))
    if "cr" in text:
        return number * 1e7
    if "lakh" in text or re.search(r"\d\s*l\b", text):
        return number * 1e5
    if "k" in text and number < 100000:
        return number * 1e3
    return number


@router.get("/summary", response_model=ReportSummary)
async def report_summary(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """One aggregate payload powering the Dashboard and Reports screens."""
    leads = (await db.execute(select(Lead))).scalars().all()
    customers = (await db.execute(select(Customer))).scalars().all()
    bookings = (await db.execute(select(Booking))).scalars().all()
    pipeline = (await db.execute(select(PipelineLead))).scalars().all()
    followups = (await db.execute(select(FollowUp))).scalars().all()

    today = date.today()
    today_str = today.strftime("%Y-%m-%d")

    # --- Stat cards -------------------------------------------------------
    followups_today = sum(1 for f in followups if f.status == "Pending" and f.date == today_str)
    pending_site_visits = (
        sum(1 for f in followups if f.status == "Pending" and f.task_type == "Site Visit")
        + sum(1 for p in pipeline if p.stage == "qualified" and (p.site_visit_status or "") == "Scheduled")
    )
    monthly_sales_value = sum(
        parse_inr(b.booking_value) for b in bookings
        if b.created_at and b.created_at.year == today.year and b.created_at.month == today.month
    )
    booking_portfolio_value = sum(parse_inr(b.booking_value) for b in bookings)

    # --- Monthly sales trend (last 6 calendar months) ---------------------
    by_month: dict[tuple[int, int], list] = defaultdict(list)
    for b in bookings:
        if b.created_at:
            by_month[(b.created_at.year, b.created_at.month)].append(b)
    monthly_sales = []
    year, month = today.year, today.month
    months: list[tuple[int, int]] = []
    for _ in range(6):
        months.append((year, month))
        month -= 1
        if month == 0:
            year, month = year - 1, 12
    for y, m in reversed(months):
        rows = by_month.get((y, m), [])
        monthly_sales.append({
            "month": _MONTH_LABELS[m - 1],
            "bookings": len(rows),
            "value_cr": round(sum(parse_inr(b.booking_value) for b in rows) / 1e7, 2),
        })

    # --- Lead sources (leads DB + pipeline, real counts) ------------------
    source_counts = Counter([l.source for l in leads if l.source]) + \
        Counter([p.source for p in pipeline if p.source])
    lead_sources = [{"name": name, "value": count}
                    for name, count in source_counts.most_common(8)]

    # --- Executive performance -------------------------------------------
    exec_stats: dict[str, dict] = defaultdict(lambda: {"deals": 0, "pipeline": 0})
    for c in customers:
        if c.executive:
            exec_stats[c.executive]["deals"] += 1
    for l in leads:
        if l.executive and l.status not in ("Converted", "Lost"):
            exec_stats[l.executive]["pipeline"] += 1
    executive_performance = [
        {"name": name, **stats}
        for name, stats in sorted(exec_stats.items(), key=lambda kv: kv[1]["deals"], reverse=True)
    ][:8]

    return {
        "total_leads": len(leads),
        "active_customers": len(customers),
        "deals_closed": len(bookings),
        "deals_lost": sum(1 for l in leads if l.status == "Lost"),
        "followups_today": followups_today,
        "pending_site_visits": pending_site_visits,
        "monthly_sales_value": monthly_sales_value,
        "booking_portfolio_value": booking_portfolio_value,
        "monthly_sales": monthly_sales,
        "lead_sources": lead_sources,
        "executive_performance": executive_performance,
    }


@router.get("/notifications", response_model=List[NotificationItem])
async def notifications(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    """
    Real alert feed for the topbar bell: overdue payment milestones, pending
    follow-ups due today or overdue, and fresh interested AI-called leads.
    """
    items: List[dict] = []
    today = date.today()
    today_str = today.strftime("%Y-%m-%d")

    bookings = (await db.execute(select(Booking))).scalars().all()
    for b in bookings:
        for m in (b.milestones or []):
            due = m.get("dueDate") or ""
            if m.get("status") in ("Pending", "Overdue") and due and due < today_str:
                items.append({
                    "type": "payment",
                    "title": "Milestone payment overdue",
                    "detail": f"{b.bookingNo} ({b.customer_name}): {m.get('milestone')} was due {due}",
                    "date": due,
                })

    followups = (await db.execute(select(FollowUp).where(FollowUp.status == "Pending"))).scalars().all()
    for f in followups:
        if f.date <= today_str:
            items.append({
                "type": "followup",
                "title": "Follow-up due" if f.date == today_str else "Follow-up overdue",
                "detail": f"{f.client}: {f.activity} ({f.executive})",
                "date": f.date,
            })

    week_ago = (today - timedelta(days=7)).strftime("%Y-%m-%d")
    called = (await db.execute(
        select(PipelineLead)
        .where(PipelineLead.stage == "called")
        .where(PipelineLead.interest_status == "Interested")
    )).scalars().all()
    for p in called:
        if (p.called_at or "") >= week_ago:
            items.append({
                "type": "lead",
                "title": "Interested lead awaiting action",
                "detail": f"{p.name} ({p.id}) - {p.ai_outcome or 'AI call completed'}",
                "date": (p.called_at or "")[:10],
            })

    items.sort(key=lambda i: i.get("date") or "", reverse=True)
    return items[:20]
