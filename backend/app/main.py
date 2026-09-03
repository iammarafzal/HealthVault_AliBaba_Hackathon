# HealthVault AI FastAPI Application
from contextlib import asynccontextmanager
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.api.router import api_router
from app.core.database import Base, engine
from app.services.storage_service import storage_service
import app.models  # noqa: F401

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("healthvault")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan event handler for startup and shutdown actions."""
    logger.info(f"Starting {settings.PROJECT_NAME} in {settings.ENVIRONMENT} mode...")
    # Ensure all database tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    logger.info("Database schema validated and tables verified.")
    # Ensure the local uploads directory exists before serving files
    await storage_service.ensure_directory()
    logger.info(f"Uploads directory ready at '{settings.UPLOAD_DIR}/'")
    yield
    logger.info(f"Shutting down {settings.PROJECT_NAME}...")



def create_application() -> FastAPI:
    """Application factory for HealthVault AI FastAPI service."""
    app = FastAPI(
        title=settings.PROJECT_NAME,
        version=settings.PROJECT_VERSION,
        openapi_url=f"{settings.API_V1_STR}/openapi.json",
        docs_url=f"{settings.API_V1_STR}/docs",
        redoc_url=f"{settings.API_V1_STR}/redoc",
        lifespan=lifespan,
    )

    # Configure CORS Middleware
    if settings.CORS_ORIGINS:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )

    # Include API Routers
    app.include_router(api_router, prefix=settings.API_V1_STR)

    # Static file serving for locally stored medical documents
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    app.mount(
        "/uploads",
        StaticFiles(directory=settings.UPLOAD_DIR),
        name="uploads",
    )

    @app.get("/", tags=["Root"])
    async def root():
        return {
            "message": f"Welcome to {settings.PROJECT_NAME} API",
            "version": settings.PROJECT_VERSION,
            "docs": f"{settings.API_V1_STR}/docs",
            "environment": settings.ENVIRONMENT,
        }

    @app.get("/health", tags=["Health"])
    async def health_check():
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT,
            "use_mock": settings.USE_MOCK,
        }

    return app


app = create_application()
