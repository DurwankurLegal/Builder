from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.api.deps import get_db, get_current_user
from app.core.security import get_password_hash, verify_password, create_access_token
from app.models.models import User
from app.schemas.schemas import UserLogin, Token, UserResponse, UserCreate

router = APIRouter()

@router.post("/login", response_model=Token)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)):
    """
    Validates user credentials against the tenant schema and generates a JWT access token.
    """
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
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password specification"
        )
        
    access_token = create_access_token(subject=user.username)
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "username": user.username,
            "email": user.email,
            "role": user.role
        }
    }

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
