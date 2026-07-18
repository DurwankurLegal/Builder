import re
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import declarative_base
from sqlalchemy import text
from app.core.config import settings

# A valid tenant schema is strictly lowercase alphanumerics/underscores.
# Anything else is treated as hostile input and never interpolated into SQL.
_SCHEMA_RE = re.compile(r"^[a-z0-9_]+$")


class InvalidTenantError(ValueError):
    """Raised when an X-Tenant-ID cannot map to a safe schema identifier."""

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

def resolve_schema(tenant_id: str) -> str:
    """
    Maps a tenant id to its schema name and hard-validates it. Rejects any
    value that isn't a clean identifier so nothing attacker-controlled can be
    interpolated into `SET search_path` (defense against SQL injection).
    """
    safe_schema = (tenant_id or "public").replace("-", "_").lower()
    if not _SCHEMA_RE.match(safe_schema):
        raise InvalidTenantError(f"Invalid tenant identifier: {tenant_id!r}")
    return safe_schema


# Schemas confirmed to exist. Postgres silently ignores a missing schema in
# `search_path`, which would otherwise let a request for a removed workspace
# fall through to `public` and read/authenticate against the wrong data.
_verified_schemas: set[str] = {"public"}


async def schema_exists(session: AsyncSession, schema: str) -> bool:
    if schema in _verified_schemas:
        return True
    result = await session.execute(
        text("SELECT 1 FROM information_schema.schemata WHERE schema_name = :s"),
        {"s": schema},
    )
    if result.first() is not None:
        _verified_schemas.add(schema)
        return True
    return False


async def get_db_session(tenant_id: str = "public") -> AsyncSession:
    """
    Spawns an async database session mapped explicitly to the active tenant
    schema search path. The schema must actually exist, otherwise the request
    is rejected rather than silently served from `public`.
    """
    safe_schema = resolve_schema(tenant_id)
    session = async_session_maker()
    try:
        if not await schema_exists(session, safe_schema):
            raise InvalidTenantError(f"Unknown workspace: {tenant_id!r}")
        # safe_schema is validated against a strict allowlist regex above
        await session.execute(text(f"SET search_path TO {safe_schema}, public"))
    except Exception:
        await session.close()
        raise
    return session
