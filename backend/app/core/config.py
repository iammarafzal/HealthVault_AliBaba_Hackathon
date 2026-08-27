from functools import lru_cache
from typing import List, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    HealthVault AI Application Configuration.
    Loads all secrets and settings from .env via pydantic-settings.
    """
    PROJECT_NAME: str = "HealthVault AI"
    PROJECT_VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    ENVIRONMENT: str = "development"
    DEBUG: bool = True

    # Database
    DATABASE_URL: str = "postgresql+asyncpg://user:password@localhost:5432/healthvault"

    # Local File Storage (served via FastAPI StaticFiles mount)
    UPLOAD_DIR: str = "uploads"
    SERVER_BASE_URL: str = "http://localhost:8000"

    # Authentication & Security
    SECRET_KEY: str = "change-me-to-a-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Alibaba Cloud — DashScope (Qwen LLM / Multi-Agent Pipeline)
    DASHSCOPE_API_KEY: str = ""

    # Alibaba Cloud — Object Storage Service (OSS)
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET_NAME: str = ""
    OSS_ENDPOINT: str = ""

    # Feature Flags
    USE_MOCK: bool = False

    # OCR — PaddleOCR pipeline
    OCR_USE_GPU: bool = False
    OCR_LANG: str = "en"

    # CORS Settings (Accepts list or comma-separated string)
    CORS_ORIGINS: Union[List[str], str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
        "http://localhost:8000",
    ]

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[str, List[str]]) -> List[str]:
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="allow",
    )


@lru_cache()
def get_settings() -> Settings:
    return Settings()


settings: Settings = get_settings()
