from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings

# Initialize Async Engine with connection pools
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10
)

# Async Session Maker binding
async_session_maker = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False
)

Base = declarative_base()

async def get_db_session(tenant_id: str = "public") -> AsyncSession:
    """
    Spawns an async database session mapped explicitly to the active tenant schema search path.
    """
    session = async_session_maker()
    # Format and sanitize schema name to prevent injection in SET search_path
    safe_schema = tenant_id.replace("-", "_").lower()
    
    # Execute schema path configuration
    await session.execute(text(f"SET search_path TO {safe_schema}, public"))
    return session
