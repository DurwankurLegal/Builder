from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from datetime import datetime
from app.api.deps import get_db, get_current_user, client_ip
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User, AuditLog, Tenant
from app.schemas.schemas import (
    UserLogin, Token, UserResponse, UserCreate, ChangePasswordRequest
)

router = APIRouter()

# Failed attempts tolerated before the account is locked automatically
MAX_FAILED_LOGIN_ATTEMPTS = 5


async def _tenant_label(db: AsyncSession, tenant_id: str) -> str:
    """Human-readable workspace name for audit records (falls back to the id)."""
    try:
        result = await db.execute(select(Tenant).where(Tenant.id == tenant_id))
        tenant = result.scalars().first()
        return tenant.name if tenant else tenant_id
    except Exception:
        return tenant_id


def _audit(db: AsyncSession, tenant: str, username: str, action: str, ip: str, status_text: str = "Success"):
    db.add(AuditLog(tenant=tenant, user=username, action=action, ip=ip, status=status_text))


@router.post("/login", response_model=Token)
async def login(payload: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    """
    Validates credentials against the active tenant schema and issues a
    workspace-bound JWT. Enforces account state (deactivated / locked) and
    auto-locks the account after repeated failed attempts.
    """
    tenant_id = getattr(request.state, "tenant_id", "public")
    tenant_label = await _tenant_label(db, tenant_id)
    ip = client_ip(request)

    # Quick safety seed: If no users exist, seed default user
    result = await db.execute(select(User))
    users = result.scalars().all()
    if not users:
        default_user = User(
            username="admin",
            email="admin@buildercrm.io",
            hashed_password=get_password_hash("admin"),
            role="Super Admin"
        )
        db.add(default_user)
        await db.commit()
        await db.refresh(default_user)

    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalars().first()

    invalid_credentials = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Incorrect username or password specification"
    )

    if not user:
        _audit(db, tenant_label, payload.username, "Failed login: unknown username.", ip, "Failed")
        await db.commit()
        raise invalid_credentials

    if user.is_locked:
        _audit(db, tenant_label, user.username, "Login blocked: account is locked.", ip, "Failed")
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is locked. Contact your administrator to unlock it."
        )

    if not user.is_active:
        _audit(db, tenant_label, user.username, "Login blocked: account is deactivated.", ip, "Failed")
        await db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact your administrator."
        )

    if not verify_password(payload.password, user.hashed_password):
        user.failed_login_attempts = (user.failed_login_attempts or 0) + 1
        if user.failed_login_attempts >= MAX_FAILED_LOGIN_ATTEMPTS:
            user.is_locked = True
            _audit(db, tenant_label, user.username,
                   f"Account locked automatically after {user.failed_login_attempts} failed login attempts.",
                   ip, "Failed")
        else:
            _audit(db, tenant_label, user.username,
                   f"Failed login attempt {user.failed_login_attempts}.", ip, "Failed")
        await db.commit()
        raise invalid_credentials

    # Successful authentication
    user.failed_login_attempts = 0
    user.last_login = datetime.utcnow()
    _audit(db, tenant_label, user.username, "User signed in successfully.", ip)
    await db.commit()

    access_token = create_access_token(subject=user.username, tenant=tenant_id)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "email": user.email,
            "role": user.role
        },
        "force_password_change": bool(user.force_password_change)
    }


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Lets the signed-in user change their own password. Clears any pending
    force-password-change flag. Passwords are stored bcrypt-hashed only.
    """
    tenant_id = getattr(request.state, "tenant_id", "public")
    tenant_label = await _tenant_label(db, tenant_id)

    result = await db.execute(select(User).where(User.username == current_user.username))
    user = result.scalars().first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if not verify_password(payload.current_password, user.hashed_password):
        _audit(db, tenant_label, user.username, "Password change failed: incorrect current password.",
               client_ip(request), "Failed")
        await db.commit()
        raise HTTPException(status_code=400, detail="Current password is incorrect")

    if payload.current_password == payload.new_password:
        raise HTTPException(status_code=400, detail="New password must differ from the current password")

    user.hashed_password = get_password_hash(payload.new_password)
    user.force_password_change = False
    _audit(db, tenant_label, user.username, "User changed their own password.", client_ip(request))
    await db.commit()
    return {"detail": "Password updated successfully"}

@router.get("/me", response_model=UserResponse)
async def read_current_user(current_user: User = Depends(get_current_user)):
    """
    Returns active user context details.
    """
    return current_user

@router.post("/register", response_model=UserResponse)
async def create_user(payload: UserCreate, db: AsyncSession = Depends(get_db)):
    """
    Allows registering user login accounts under the active tenant context.
    """
    result = await db.execute(select(User).where(User.username == payload.username))
    user = result.scalars().first()
    if user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username is already registered under this workspace"
        )
        
    new_user = User(
        username=payload.username,
        email=payload.email,
        hashed_password=get_password_hash(payload.password),
        role=payload.role
    )
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    return new_user
