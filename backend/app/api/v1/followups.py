"""
Follow-ups Manager API: scheduled relationship tasks (calls, meetings, site
visits, document collection) persisted per workspace. Replaces the old
localStorage-only prototype so tasks are tenant-isolated, shared across the
team, validated server-side, and audit-logged.
"""
from datetime import date as date_cls, datetime
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Optional

from app.api.deps import get_db, get_current_user, check_roles
from app.models.models import FollowUp, Tenant
from app.schemas.schemas import FollowUpCreate, FollowUpResponse
from app.services.pipeline_service import write_audit

router = APIRouter()

ADMIN_ROLES = ["Super Admin", "Tenant Admin"]


async def _tenant_label(request: Request, db: AsyncSession) -> str:
    tenant_id = getattr(request.state, "tenant_id", "public")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    return tenant.name if tenant else tenant_id


def _parse_date(value: str) -> date_cls:
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=422, detail="Task date must be in YYYY-MM-DD format")


@router.get("", response_model=List[FollowUpResponse])
async def list_followups(
    status_filter: Optional[str] = None,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    query = select(FollowUp).order_by(FollowUp.date.desc(), FollowUp.id.desc())
    if status_filter in ("Pending", "Completed"):
        query = query.where(FollowUp.status == status_filter)
    result = await db.execute(query)
    return result.scalars().all()


@router.post("", response_model=FollowUpResponse, status_code=status.HTTP_201_CREATED)
async def create_followup(
    payload: FollowUpCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    """Schedules a task. Business rule: the task date cannot be in the past."""
    task_date = _parse_date(payload.date)
    if task_date < date_cls.today():
        raise HTTPException(status_code=422, detail="Task date cannot be set to a past date")

    task = FollowUp(
        client=payload.client.strip(),
        activity=payload.activity.strip(),
        date=payload.date,
        executive=(payload.executive or user.username).strip(),
        task_type=payload.task_type,
        status="Pending",
        created_by=user.username,
    )
    db.add(task)
    # Flush inside the transaction to obtain the generated id. A post-commit
    # refresh would run on a fresh pooled connection WITHOUT this session's
    # tenant search_path and fail to find the row (expire_on_commit=False
    # keeps the loaded attributes valid after commit).
    await db.flush()
    await write_audit(db, await _tenant_label(request, db), user.username,
                      f"Follow-up scheduled for {task.client} on {task.date} ({task.task_type}).")
    await db.commit()
    return task


@router.post("/{task_id}/toggle", response_model=FollowUpResponse)
async def toggle_followup(
    task_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(get_current_user),
):
    result = await db.execute(select(FollowUp).where(FollowUp.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Follow-up task not found")

    task.status = "Pending" if task.status == "Completed" else "Completed"
    await write_audit(db, await _tenant_label(request, db), user.username,
                      f"Follow-up #{task_id} ({task.client}) marked {task.status}.")
    await db.commit()
    return task


@router.delete("/{task_id}")
async def delete_followup(
    task_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_roles(ADMIN_ROLES)),
):
    result = await db.execute(select(FollowUp).where(FollowUp.id == task_id))
    task = result.scalars().first()
    if not task:
        raise HTTPException(status_code=404, detail="Follow-up task not found")
    await db.delete(task)
    await write_audit(db, await _tenant_label(request, db), user.username,
                      f"Follow-up #{task_id} ({task.client}) deleted.")
    await db.commit()
    return {"deleted": task_id}
