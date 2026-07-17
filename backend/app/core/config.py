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

    class Config:
        case_sensitive = True

settings = Settings()
