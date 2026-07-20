import os
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    PROJECT_NAME: str = "Builder CRM Enterprise Platform"
    API_V1_STR: str = "/api/v1"
    
    # Security Configurations
    SECRET_KEY: str = os.getenv("SECRET_KEY", "SUPER_SECRET_SECURITY_KEY_FOR_JWT_SIGNING_123456789")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Database Configurations
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://postgres:postgres@localhost:5432/buildercrm"
    )
    
    # Redis Configurations
    REDIS_URL: str = os.getenv("REDIS_URL", "redis://localhost:6379/0")
    
    # CORS Origins (Allowed client domains)
    BACKEND_CORS_ORIGINS: list[str] = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ]

    # ------------------------------------------------------------------
    # HireBuddha AI Calling Agent (voice automation provider)
    # ------------------------------------------------------------------
    # Master switch for the outbound dispatch integration. Leads are only
    # dialled through HireBuddha when this is on AND the workspace's
    # ai_provider setting is 'hirebuddha'.
    HIREBUDDHA_ENABLED: bool = os.getenv("HIREBUDDHA_ENABLED", "1").lower() in ("1", "true", "yes")
    HIREBUDDHA_BASE_URL: str = os.getenv("HIREBUDDHA_BASE_URL", "https://app.hirebuddha.com")
    # Default HireBuddha Company ID ("Fortune") and AI agent Entity ID
    # ("Priya - Real Estate Sales Expert"). Workspaces can override both in
    # their pipeline settings (lead_settings.hb_client_id / hb_entity_id).
    HIREBUDDHA_CLIENT_ID: str = os.getenv("HIREBUDDHA_CLIENT_ID", "3ffe9166-8dae-4488-a6a4-387dad47f3f7")
    HIREBUDDHA_ENTITY_ID: str = os.getenv("HIREBUDDHA_ENTITY_ID", "65b0ec26-42c1-4a63-b03e-68692ee30c9b")
    # Shared secret HireBuddha must present (Bearer or X-API-Key) when calling
    # our CRM Update API. Empty = callbacks rejected (fail closed) until set.
    HIREBUDDHA_CALLBACK_TOKEN: str = os.getenv("HIREBUDDHA_CALLBACK_TOKEN", "")
    # Outbound HTTP behaviour
    HIREBUDDHA_HTTP_TIMEOUT_SECONDS: int = int(os.getenv("HIREBUDDHA_HTTP_TIMEOUT_SECONDS", "15"))
    HIREBUDDHA_HTTP_RETRIES: int = int(os.getenv("HIREBUDDHA_HTTP_RETRIES", "3"))
    # A dispatched lead stuck in "AI Call In Progress" longer than this is
    # re-queued for another attempt (callback presumed lost).
    HIREBUDDHA_CALLBACK_TIMEOUT_MINUTES: int = int(os.getenv("HIREBUDDHA_CALLBACK_TIMEOUT_MINUTES", "30"))

    class Config:
        case_sensitive = True

settings = Settings()
