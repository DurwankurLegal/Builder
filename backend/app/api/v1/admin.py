from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List
from datetime import datetime
from app.api.deps import get_db, get_current_user, check_roles
from app.models.models import Tenant, AuditLog, User
from app.schemas.schemas import TenantCreate, TenantResponse, AuditLogResponse
from app.core.security import get_password_hash

router = APIRouter()

# Schema tables creation helper
SCHEMA_DDL_TEMPLATES = [
    """CREATE TABLE IF NOT EXISTS {schema}.users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(100) UNIQUE NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        hashed_password VARCHAR(255) NOT NULL,
        role VARCHAR(50) DEFAULT 'Sales Executive',
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.leads (
        id VARCHAR(50) PRIMARY KEY,
        date VARCHAR(50) NOT NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        project VARCHAR(255) NOT NULL,
        budget VARCHAR(100) NOT NULL,
        source VARCHAR(100) NOT NULL,
        executive VARCHAR(100) NOT NULL,
        status VARCHAR(50) DEFAULT 'New',
        remarks JSON DEFAULT '[]',
        history JSON DEFAULT '[]'
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.customers (
        id VARCHAR(50) PRIMARY KEY,
        lead_id VARCHAR(50) NULL,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50) NOT NULL,
        address VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL,
        budget VARCHAR(100) NOT NULL,
        executive VARCHAR(100) NOT NULL,
        status VARCHAR(100) DEFAULT 'Agreement Pending',
        allocated_unit VARCHAR(50) NULL,
        config VARCHAR(50) NULL,
        area VARCHAR(50) NULL,
        floor VARCHAR(50) NULL,
        notes VARCHAR(1000) NULL,
        history JSON DEFAULT '[]',
        documents JSON DEFAULT '[]'
    )""",
    """CREATE TABLE IF NOT EXISTS {schema}.bookings (
        bookingNo VARCHAR(50) PRIMARY KEY,
        customer_id VARCHAR(50) NOT NULL,
        customer_name VARCHAR(255) NOT NULL,
        project VARCHAR(255) NOT NULL,
        unit_no VARCHAR(50) NOT NULL,
        slab_area VARCHAR(50) NOT NULL,
        booking_value VARCHAR(100) NOT NULL,
        token_amount VARCHAR(100) NOT NULL,
        payment_plan VARCHAR(255) NOT NULL,
        agreement_status VARCHAR(50) DEFAULT 'Pending',
        registration_status VARCHAR(50) DEFAULT 'Pending',
        milestones JSON DEFAULT '[]'
    )"""
]

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
    db: AsyncSession = Depends(get_db),
    user = Depends(check_roles(["Super Admin"]))
):
    """
    Provisions a new builder workspace tenant, creating dedicated PostgreSQL schemas and tables.
    """
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
    await db.commit()
    await db.refresh(new_tenant)
    
    # Spawn dedicated database schema dynamically
    safe_schema = payload.id.replace("-", "_").lower()
    await db.execute(text(f"CREATE SCHEMA IF NOT EXISTS {safe_schema}"))
    
    # Create tables inside the new schema context
    for ddl in SCHEMA_DDL_TEMPLATES:
        await db.execute(text(ddl.format(schema=safe_schema)))
        
    # Seed default workspace admin user
    hashed_pwd = get_password_hash("admin")
    seed_user_sql = f"""
        INSERT INTO {safe_schema}.users (username, email, hashed_password, role, is_active)
        VALUES ('admin', 'admin@{payload.subdomain}', '{hashed_pwd}', 'Tenant Admin', TRUE)
        ON CONFLICT (username) DO NOTHING
    """
    await db.execute(text(seed_user_sql))
    await db.commit()
    
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

@router.post("/logs")
async def add_audit_log_entry(
    action: str,
    user_name: str,
    tenant_name: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Utility endpoint to append logs manually.
    """
    await db.execute(text("SET search_path TO public"))
    log = AuditLog(
        tenant=tenant_name,
        user=user_name,
        action=action,
        ip="127.0.0.1",
        status="Success"
    )
    db.add(log)
    await db.commit()
    return {"status": "recorded"}
