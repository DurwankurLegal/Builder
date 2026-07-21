"""
System Settings API: per-workspace company profile, projects directory, and
lead channel configuration. Replaces the prototype's local-state-only
Settings screen with real tenant-scoped persistence. Reads are open to all
authenticated users; writes are admin-only per the SRS role matrix.
"""
from fastapi import APIRouter, Depends, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_db, get_current_user, check_roles
from app.models.models import Tenant, WorkspaceSetting
from app.schemas.schemas import WorkspaceSettingResponse, WorkspaceSettingUpdate
from app.services.pipeline_service import write_audit

router = APIRouter()

ADMIN_ROLES = ["Super Admin", "Tenant Admin"]

# Sensible starter content for a workspace that has never saved settings.
DEFAULT_PROJECTS = [
    {"id": "1", "name": "Sunrise Heights", "location": "Whitefield, Bangalore",
     "rera": "PRM/KA/RERA/1251/446/PR/180516/001790", "units": 120},
    {"id": "2", "name": "Green Meadows", "location": "Sarjapur, Bangalore",
     "rera": "PRM/KA/RERA/1251/308/PR/200211/003254", "units": 85},
    {"id": "3", "name": "Royal Residency", "location": "Indiranagar, Bangalore",
     "rera": "PRM/KA/RERA/1251/310/PR/191024/002980", "units": 45},
]
DEFAULT_CHANNELS = [
    {"name": "Google Ads", "enabled": True},
    {"name": "Facebook Ads", "enabled": True},
    {"name": "Referral", "enabled": True},
    {"name": "Direct Visit", "enabled": True},
    {"name": "Newspaper", "enabled": False},
    {"name": "Website Form", "enabled": True},
]


async def _get_or_create(db: AsyncSession) -> WorkspaceSetting:
    result = await db.execute(select(WorkspaceSetting))
    row = result.scalars().first()
    if not row:
        row = WorkspaceSetting(company={}, projects=DEFAULT_PROJECTS, channels=DEFAULT_CHANNELS)
        db.add(row)
        await db.flush()
    return row


@router.get("/workspace", response_model=WorkspaceSettingResponse)
async def get_workspace_settings(db: AsyncSession = Depends(get_db), user=Depends(get_current_user)):
    row = await _get_or_create(db)
    await db.commit()
    return row


@router.put("/workspace", response_model=WorkspaceSettingResponse)
async def update_workspace_settings(
    payload: WorkspaceSettingUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user=Depends(check_roles(ADMIN_ROLES)),
):
    row = await _get_or_create(db)
    update_data = payload.dict(exclude_unset=True)
    for key, value in update_data.items():
        setattr(row, key, value)
    row.updated_by = user.username

    tenant_id = getattr(request.state, "tenant_id", "public")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    await write_audit(db, tenant.name if tenant else tenant_id, user.username,
                      f"Workspace settings updated ({', '.join(update_data)}).")
    await db.commit()
    return row
