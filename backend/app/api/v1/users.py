"""
User account management.

Access model
------------
* **Super Admin** — may manage accounts in ANY workspace. Cross-workspace
  access is granted by switching the `X-Tenant-ID` header; `get_current_user`
  permits the mismatch only for this role.
* **Tenant Admin** — may manage accounts ONLY inside their own workspace. Any
  attempt to target another workspace is rejected at the dependency layer
  because their token is bound to their tenant.

Every mutating operation is written to the audit trail with the acting user,
timestamp, tenant, and client IP. Passwords are only ever stored bcrypt-hashed.
"""
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, text
from typing import List
from app.api.deps import (
    get_db, require_user_admin, require_super_admin, client_ip,
    SUPER_ADMIN, TENANT_ADMIN
)
from app.db.session import (
    async_session_maker, resolve_schema, InvalidTenantError, schema_exists
)
from app.models.models import User, Tenant, AuditLog
from app.schemas.schemas import (
    AdminUserCreate, AdminUserUpdate, AdminUserResponse, PasswordResetRequest,
    ForcePasswordChangeRequest, TenantUserGroup
)
from app.core.security import get_password_hash

router = APIRouter()

ASSIGNABLE_ROLES = ["Super Admin", "Tenant Admin", "Sales Executive"]


async def _tenant_name(request: Request, db: AsyncSession) -> str:
    tenant_id = getattr(request.state, "tenant_id", "public")
    result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
    tenant = result.scalars().first()
    return tenant.name if tenant else tenant_id


async def _audit(db: AsyncSession, request: Request, actor: str, action: str, status_text: str = "Success"):
    db.add(AuditLog(
        tenant=await _tenant_name(request, db),
        user=actor,
        action=action,
        ip=client_ip(request),
        status=status_text
    ))


def _validate_role(role: str, actor: User):
    """A Tenant Admin may never mint or promote to Super Admin (privilege escalation)."""
    if role not in ASSIGNABLE_ROLES:
        raise HTTPException(status_code=400, detail=f"Unknown role '{role}'")
    if role == SUPER_ADMIN and actor.role != SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only a Super Admin may assign the Super Admin role"
        )


async def _get_user_or_404(db: AsyncSession, user_id: int) -> User:
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User account not found in this workspace")
    return user


# ========================================================
# READ
# ========================================================

@router.get("", response_model=List[AdminUserResponse])
async def list_users(
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """Lists user accounts in the ACTIVE workspace (tenant-isolated)."""
    result = await db.execute(select(User).order_by(User.id))
    return result.scalars().all()


@router.get("/all-tenants", response_model=List[TenantUserGroup])
async def list_users_all_tenants(
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_super_admin)
):
    """
    Super Admin only: user accounts across every workspace, grouped by tenant.
    Powers the cross-tenant view in the Admin Console.
    """
    result = await db.execute(select(Tenant).order_by(Tenant.id))
    tenants = result.scalars().all()

    groups: List[dict] = []
    for tenant in tenants:
        # A directory entry can exist without a usable schema (e.g. a tenant
        # created with an id that isn't a valid identifier). Skip those rather
        # than failing the whole listing.
        try:
            schema = resolve_schema(tenant.id)
        except InvalidTenantError:
            continue

        async with async_session_maker() as session:
            if not await schema_exists(session, schema):
                continue
            await session.execute(text(f"SET search_path TO {schema}, public"))
            res = await session.execute(select(User).order_by(User.id))
            users = res.scalars().all()
            groups.append({
                "tenant_id": tenant.id,
                "tenant_name": tenant.name,
                "users": [AdminUserResponse.model_validate(u) for u in users],
            })
    return groups


@router.get("/roles", response_model=List[str])
async def assignable_roles(actor: User = Depends(require_user_admin)):
    """Roles the acting administrator is permitted to assign."""
    if actor.role == SUPER_ADMIN:
        return ASSIGNABLE_ROLES
    return [r for r in ASSIGNABLE_ROLES if r != SUPER_ADMIN]


@router.get("/{user_id}", response_model=AdminUserResponse)
async def get_user(
    user_id: int,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    return await _get_user_or_404(db, user_id)


# ========================================================
# CREATE / MODIFY
# ========================================================

@router.post("", response_model=AdminUserResponse, status_code=status.HTTP_201_CREATED)
async def create_user(
    payload: AdminUserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """Creates a user account inside the active workspace."""
    _validate_role(payload.role, actor)

    existing = await db.execute(select(User).where(User.username == payload.username))
    if existing.scalars().first():
        raise HTTPException(status_code=409, detail="Username already exists in this workspace")

    existing_email = await db.execute(select(User).where(User.email == payload.email))
    if existing_email.scalars().first():
        raise HTTPException(status_code=409, detail="Email already registered in this workspace")

    user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role,
        is_active=payload.is_active,
        is_locked=False,
        failed_login_attempts=0,
        force_password_change=payload.force_password_change,
    )
    db.add(user)
    await _audit(db, request, actor.username,
                 f"Created user account '{payload.username}' with role {payload.role}.")
    await db.commit()
    return user


@router.put("/{user_id}", response_model=AdminUserResponse)
async def update_user(
    user_id: int,
    payload: AdminUserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """Modifies account details (email, role, active state)."""
    user = await _get_user_or_404(db, user_id)
    data = payload.dict(exclude_unset=True)

    if "role" in data and data["role"]:
        _validate_role(data["role"], actor)
        if user.role == SUPER_ADMIN and actor.role != SUPER_ADMIN:
            raise HTTPException(status_code=403, detail="Only a Super Admin may modify a Super Admin account")

    if "is_active" in data and data["is_active"] is False and user.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")

    if "email" in data and data["email"] and data["email"] != user.email:
        dup = await db.execute(select(User).where(User.email == data["email"]))
        if dup.scalars().first():
            raise HTTPException(status_code=409, detail="Email already registered in this workspace")

    changed = [k for k, v in data.items() if getattr(user, k) != v]
    for key, value in data.items():
        setattr(user, key, value)

    if changed:
        await _audit(db, request, actor.username,
                     f"Updated user '{user.username}' ({', '.join(changed)}).")
    await db.commit()
    return user


@router.delete("/{user_id}")
async def delete_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """
    Permanently removes a user account from the active workspace. Deactivation
    is usually preferable (it preserves the audit history against a real
    account), so this is guarded: no self-deletion, and a Tenant Admin may not
    delete a Super Admin.
    """
    user = await _get_user_or_404(db, user_id)
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot delete your own account")
    if user.role == SUPER_ADMIN and actor.role != SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only a Super Admin may delete a Super Admin account")

    username = user.username
    await db.delete(user)
    await _audit(db, request, actor.username, f"Deleted user account '{username}'.")
    await db.commit()
    return {"detail": f"User account '{username}' deleted", "id": user_id}


# ========================================================
# ACCOUNT ACTIONS
# ========================================================

@router.post("/{user_id}/reset-password", response_model=AdminUserResponse)
async def reset_password(
    user_id: int,
    payload: PasswordResetRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """Administratively resets a user's password (stored bcrypt-hashed only)."""
    user = await _get_user_or_404(db, user_id)
    if user.role == SUPER_ADMIN and actor.role != SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only a Super Admin may reset a Super Admin password")

    user.hashed_password = get_password_hash(payload.new_password)
    user.force_password_change = payload.force_password_change
    user.failed_login_attempts = 0
    await _audit(db, request, actor.username,
                 f"Reset password for user '{user.username}'"
                 f"{' (must change at next login)' if payload.force_password_change else ''}.")
    await db.commit()
    return user


@router.post("/{user_id}/activate", response_model=AdminUserResponse)
async def activate_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    user = await _get_user_or_404(db, user_id)
    user.is_active = True
    await _audit(db, request, actor.username, f"Activated user account '{user.username}'.")
    await db.commit()
    return user


@router.post("/{user_id}/deactivate", response_model=AdminUserResponse)
async def deactivate_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    user = await _get_user_or_404(db, user_id)
    if user.id == actor.id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own account")
    if user.role == SUPER_ADMIN and actor.role != SUPER_ADMIN:
        raise HTTPException(status_code=403, detail="Only a Super Admin may deactivate a Super Admin account")

    user.is_active = False
    await _audit(db, request, actor.username, f"Deactivated user account '{user.username}'.")
    await db.commit()
    return user


@router.post("/{user_id}/unlock", response_model=AdminUserResponse)
async def unlock_user(
    user_id: int,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """Clears a lock caused by repeated failed logins and resets the counter."""
    user = await _get_user_or_404(db, user_id)
    user.is_locked = False
    user.failed_login_attempts = 0
    await _audit(db, request, actor.username, f"Unlocked user account '{user.username}'.")
    await db.commit()
    return user


@router.post("/{user_id}/force-password-change", response_model=AdminUserResponse)
async def set_force_password_change(
    user_id: int,
    payload: ForcePasswordChangeRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    actor: User = Depends(require_user_admin)
):
    """Requires (or clears the requirement) that the user change password at next login."""
    user = await _get_user_or_404(db, user_id)
    user.force_password_change = payload.force_password_change
    verb = "Required" if payload.force_password_change else "Cleared"
    await _audit(db, request, actor.username,
                 f"{verb} password change at next login for '{user.username}'.")
    await db.commit()
    return user
