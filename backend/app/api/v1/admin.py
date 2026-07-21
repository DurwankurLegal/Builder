from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List
from datetime import datetime
from app.api.deps import get_db, get_current_user, check_roles, client_ip
from app.db.session import resolve_schema, InvalidTenantError
from app.models.models import Tenant, AuditLog, User
from app.schemas.schemas import TenantCreate, TenantResponse, AuditLogResponse
from app.core.security import get_password_hash

router = APIRouter()

@router.get("/tenants", response_model=List[TenantResponse])
async def list_tenants(
    db: AsyncSession = Depends(get_db),
    user = Depends(check_roles(["Super Admin"]))
):
    """
    Lists system-wide tenant registries (Super Admin only).
    """
    # Enforce public schema mapping for global table queries
    await db.execute(text("SET search_path TO public"))
    result = await db.execute(select(Tenant))
    tenants = result.scalars().all()
    return tenants

@router.post("/tenants", response_model=TenantResponse)
async def create_tenant(
    payload: TenantCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    user = Depends(check_roles(["Super Admin"]))
):
    """
    Provisions a new builder workspace tenant with its dedicated PostgreSQL
    schema. Uses the same DDL set as the seed (single source of truth), so a
    provisioned workspace gets EVERY table the application needs - including
    the lead pipeline and integration tables.
    """
    # Hard-validate the id before it goes anywhere near a schema name
    try:
        safe_schema = resolve_schema(payload.id)
    except InvalidTenantError:
        raise HTTPException(status_code=400,
                            detail="Tenant ID may only contain letters, digits, hyphens and underscores")

    await db.execute(text("SET search_path TO public"))
    result = await db.execute(select(Tenant).where(Tenant.id == payload.id))
    existing = result.scalars().first()
    if existing:
        raise HTTPException(status_code=400, detail="Tenant ID is already occupied")

    new_tenant = Tenant(
        id=payload.id,
        name=payload.name,
        subdomain=payload.subdomain,
        tier=payload.tier,
        userQuota=payload.userQuota,
        storageQuota=payload.storageQuota,
        storageUsed=0.0,
        brandingColor="#4f46e5",
        status="Active"
    )
    db.add(new_tenant)

    # Full workspace schema - shared DDL with the seed so nothing is missed
    from app.db.seed import SCHEMA_TABLES_DDL, USER_COLUMN_MIGRATIONS, HIREBUDDHA_COLUMN_MIGRATIONS
    await db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {safe_schema}"))
    for ddl in SCHEMA_TABLES_DDL:
        await db.execute(text(ddl.format(schema=safe_schema)))
    for alter in USER_COLUMN_MIGRATIONS + HIREBUDDHA_COLUMN_MIGRATIONS:
        await db.execute(text(alter.format(schema=safe_schema)))

    # Seed the workspace admin (parameterized - no string-built SQL)
    await db.execute(
        text(f"""
            INSERT INTO {safe_schema}.users (username, email, hashed_password, role, is_active, force_password_change)
            VALUES ('admin', :email, :pwd, 'Tenant Admin', TRUE, TRUE)
            ON CONFLICT (username) DO NOTHING
        """),
        {"email": f"admin@{payload.subdomain}", "pwd": get_password_hash("admin")},
    )
    await db.execute(
        text(f"INSERT INTO {safe_schema}.lead_settings (dup_check_phone, dup_check_email) "
             f"SELECT TRUE, TRUE WHERE NOT EXISTS (SELECT 1 FROM {safe_schema}.lead_settings)")
    )
    db.add(AuditLog(tenant=payload.name, user=user.username,
                    action=f"Workspace '{payload.id}' provisioned (tier {payload.tier}).",
                    ip=client_ip(request), status="Success"))
    await db.commit()
    await db.refresh(new_tenant)
    return new_tenant

@router.get("/logs", response_model=List[AuditLogResponse])
async def list_audit_logs(
    db: AsyncSession = Depends(get_db),
    user = Depends(check_roles(["Super Admin"]))
):
    """
    Retrieves global audit trail logs.
    """
    await db.execute(text("SET search_path TO public"))
    result = await db.execute(select(AuditLog).order_by(AuditLog.date.desc()))
    logs = result.scalars().all()
    return logs

# NOTE: the old unauthenticated POST /admin/logs endpoint was removed in the
# QA security pass - it let unauthenticated callers forge audit-trail entries.
# Audit records are written exclusively server-side by the application.
