from fastapi import Depends, HTTPException, status, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.core.config import settings
from app.core.security import decode_token
from app.db.session import get_db_session
from app.models.models import User

# Define token schema route
oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl=f"{settings.API_V1_STR}/auth/login"
)

async def get_db(request: Request):
    """
    Dependency resolver that provisions active database sessions scoped to the client tenant's schema search path.
    """
    tenant_id = getattr(request.state, "tenant_id", "public")
    session = await get_db_session(tenant_id)
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
    Decrypts client JWT tokens and resolves the logged-in user profile inside the tenant context.
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
    if username is None:
        raise credentials_exception
        
    # Execute query under active tenant schema path
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalars().first()
    if user is None:
        raise credentials_exception
        
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
