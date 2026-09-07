from functools import lru_cache
from typing import List, Optional, Union
from pydantic import Field, field_validator, model_validator
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
    DATABASE_URL: str = Field(
        default="postgresql+asyncpg://user:password@localhost:5432/healthvault",
        description="Async PostgreSQL connection string",
    )

    # Local File Storage (served via FastAPI StaticFiles mount)
    UPLOAD_DIR: str = "uploads"
    SERVER_BASE_URL: str = "http://localhost:8000"
    FRONTEND_URL: str = "http://localhost:3000"

    # Authentication & Security
    SECRET_KEY: str = Field(
        default="change-me-to-a-random-secret-key-healthvault-prod-min32bytes",
        min_length=32,
        description="Master cryptographic secret key (min length 32)",
    )
    JWT_SECRET_KEY: Optional[str] = Field(
        default=None,
        min_length=32,
        description="Optional separate secret key for signing JWTs",
    )
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
    ALLOWED_ORIGINS: Optional[Union[List[str], str]] = None

    @field_validator("CORS_ORIGINS", "ALLOWED_ORIGINS", mode="before")
    @classmethod
    def assemble_cors_origins(cls, v: Union[None, str, List[str]]) -> Optional[Union[List[str], str]]:
        if v is None:
            return v
        if isinstance(v, str) and not v.startswith("["):
            return [i.strip() for i in v.split(",") if i.strip()]
        elif isinstance(v, (list, str)):
            return v
        raise ValueError(v)

    @property
    def effective_jwt_secret(self) -> str:
        return self.JWT_SECRET_KEY or self.SECRET_KEY

    @property
    def effective_cors_origins(self) -> List[str]:
        target = self.ALLOWED_ORIGINS if self.ALLOWED_ORIGINS is not None else self.CORS_ORIGINS
        origins: List[str] = []
        if isinstance(target, str):
            origins = [i.strip() for i in target.split(",") if i.strip()]
        elif isinstance(target, list):
            origins = [str(item) for item in target]

        if self.FRONTEND_URL and self.FRONTEND_URL.strip() not in origins:
            origins.append(self.FRONTEND_URL.strip())
        return origins

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        if self.ENVIRONMENT.lower() in ("production", "prod"):
            insecure_defaults = [
                "change-me-to-a-random-secret",
                "change-me-to-a-random-secret-key-healthvault-prod-min32bytes",
                "secret",
                "password",
                "123456",
            ]
            if any(default_str in self.SECRET_KEY.lower() for default_str in insecure_defaults):
                raise ValueError("Production mode requires a strict, non-default SECRET_KEY (min 32 chars).")
            if self.JWT_SECRET_KEY and any(default_str in self.JWT_SECRET_KEY.lower() for default_str in insecure_defaults):
                raise ValueError("Production mode requires a strict, non-default JWT_SECRET_KEY.")

            origins = self.effective_cors_origins
            if "*" in origins or "http://*" in origins:
                raise ValueError("Insecure CORS wildcard ('*') is strictly prohibited in production mode.")
        return self

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
