from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db_session, InvalidTenantError
from app.models.models import User

# Define token schema route
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

# Roles permitted to administer user accounts
SUPER_ADMIN = "Super Admin"
TENANT_ADMIN = "Tenant Admin"
USER_ADMIN_ROLES = [SUPER_ADMIN, TENANT_ADMIN]


async def get_db(request: Request):
    """
    Dependency resolver that provisions active database sessions scoped to the client tenant's schema search path.
    """
    tenant_id = getattr(request.state, "tenant_id", "public")
    try:
        session = await get_db_session(tenant_id)
    except InvalidTenantError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid workspace (X-Tenant-ID) header"
        )
    try:
        yield session
    finally:
        await session.close()


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    token: str = Depends(oauth2_scheme)
) -> User:
    """
    Resolves the logged-in user and enforces multi-tenant isolation.

    The token is bound to the workspace it was issued for. Identity is always
    resolved in the TOKEN's workspace, never the caller-supplied header, so a
    token minted in one tenant cannot impersonate a same-named account in
    another. Only a Super Admin may operate across workspaces.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate user session or credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    username: str = payload.get("sub")
    token_tenant: str = payload.get("tenant")
    # Tokens without a tenant binding predate isolation enforcement - reject
    # them so the client re-authenticates and gets a bound token.
    if username is None or token_tenant is None:
        raise credentials_exception

    request_tenant = getattr(request.state, "tenant_id", "public")

    if token_tenant == request_tenant:
        result = await db.execute(select(User).where(User.username == username))
        user = result.scalars().first()
    else:
        # Cross-workspace request: resolve identity in the token's own workspace.
        try:
            identity_session = await get_db_session(token_tenant)
        except InvalidTenantError:
            raise credentials_exception
        try:
            result = await identity_session.execute(select(User).where(User.username == username))
            user = result.scalars().first()
        finally:
            await identity_session.close()

        if user is None:
            raise credentials_exception
        if user.role != SUPER_ADMIN:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cross-workspace access denied: your session is bound to another workspace"
            )

    if user is None:
        raise credentials_exception
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account has been deactivated. Contact your administrator."
        )
    if user.is_locked:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This account is locked. Contact your administrator."
        )

    return user


def check_roles(allowed_roles: list[str]):
    """
    RBAC authorization validation decorator.
    """
    def dependency(user: User = Depends(get_current_user)):
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You do not possess structural permissions for this operation"
            )
        return user
    return dependency


def require_user_admin(user: User = Depends(get_current_user)) -> User:
    """Super Admin or Tenant Admin - the roles allowed to manage user accounts."""
    if user.role not in USER_ADMIN_ROLES:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account management requires an administrator role"
        )
    return user


def require_super_admin(user: User = Depends(get_current_user)) -> User:
    if user.role != SUPER_ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="This operation is restricted to the Super Admin"
        )
    return user


def client_ip(request: Request) -> str:
    """Best-effort client IP for audit records (honours a proxy header if present)."""
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"
