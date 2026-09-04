from functools import lru_cache
from typing import List, Optional, Union
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
    FRONTEND_URL: str = "http://localhost:3000"

    # Authentication & Security
    SECRET_KEY: str = "change-me-to-a-random-secret"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # Feature Flags
    USE_MOCK: bool = False

    # LLM Latency & Resilience
    LLM_TIMEOUT_SECONDS: float = 15.0

    # OCR — PaddleOCR pipeline
    OCR_USE_GPU: bool = False
    OCR_LANG: str = "en"

    # ----------------------------------------------------------------------
    # Pluggable LLM Configuration (Switch seamlessly between Qwen & Gemini)
    # Options for LLM_PROVIDER: "dashscope" | "qwen" | "gemini" | "mock"
    # ----------------------------------------------------------------------
    LLM_PROVIDER: str = "dashscope"
    LLM_MODEL_NAME: Optional[str] = None  # Explicit override if set

    # ----------------------------------------------------------------------
    # Pluggable Vision LLM Configuration
    # Options for VISION_PROVIDER: "gemini" | "qwen" | "openai" | "groq" | "mock"
    # ----------------------------------------------------------------------
    VISION_PROVIDER: str = "gemini"
    VISION_MODEL: str = "gemini-3.1-flash-lite"

    # Alibaba Cloud — DashScope (Qwen Models: qwen-plus, qwen-max, qwen-turbo)
    DASHSCOPE_API_KEY: Optional[str] = None
    DASHSCOPE_MODEL_NAME: str = "qwen-plus"

    # Google AI Studio — Gemini Models (gemini-1.5-flash, gemini-1.5-pro, gemini-2.0-flash)
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL_NAME: str = "gemini-3.1-flash-lite"

    # OpenAI-compatible Vision Models (gpt-4o, gpt-4o-mini)
    OPENAI_API_KEY: Optional[str] = None

    # Alibaba Cloud — Object Storage Service (OSS)
    OSS_ACCESS_KEY_ID: str = ""
    OSS_ACCESS_KEY_SECRET: str = ""
    OSS_BUCKET_NAME: str = ""
    OSS_ENDPOINT: str = ""

    # Groq — Whisper Speech-to-Text (Urdu ASR)
    GROQ_API_KEY: str = ""
    GROQ_ASR_MODEL: str = "whisper-large-v3"

    # Web Push Notifications & VAPID Configuration
    VAPID_PUBLIC_KEY: str = "BCJEKWTCSiQeMeh0NIMvZvSu6w7skTcAMtQbACSLrETCXNaMMC2O8nXsuWMfgsLIPt-sYAcUphKS1yf7565YJ1Q"
    VAPID_PRIVATE_KEY: str = "-----BEGIN PRIVATE KEY-----\nMIGHAgEAMBMGByqGSM49AgEGCCqGSM49AwEHBG0wawIBAQQgZC3K3rjPVBk9DWMv\nZKfUAl5WdP+Ebho2q0My2OiJwPuhRANCAAQiRClkwkokHjHodDSDL2b0rusO7JE3\nADLUGwAki6xEwlzWjDAtjvJ17LljH4LCyD7frGAHFKYSktcn++euWCdU\n-----END PRIVATE KEY-----\n"
    VAPID_CLAIM_EMAIL: str = "mailto:admin@healthvault.local"
    NOTIFICATION_CHECK_INTERVAL_MINUTES: int = 5

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
