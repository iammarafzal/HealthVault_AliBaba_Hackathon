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
from app.services.notification_service import notification_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import app.models  # noqa: F401

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("healthvault")


def _resolve_scheduler_timezone():
    """Safely resolve scheduler timezone with fallback to UTC on Windows if needed."""
    try:
        import tzlocal
        return tzlocal.get_localzone()
    except Exception as ex:
        logger.warning(f"Could not load local zone via tzlocal ({ex}). Checking Asia/Karachi or UTC fallback.")
    try:
        import zoneinfo
        return zoneinfo.ZoneInfo("Asia/Karachi")
    except Exception:
        pass
    from datetime import timezone
    return timezone.utc


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

    # Initialize and start in-process APScheduler for medicine planner reminders
    scheduler_tz = _resolve_scheduler_timezone()
    scheduler = AsyncIOScheduler(timezone=scheduler_tz)
    scheduler.add_job(
        notification_service.check_and_dispatch_medicine_reminders,
        "interval",
        minutes=settings.NOTIFICATION_CHECK_INTERVAL_MINUTES,
        id="medicine_reminder_job",
        replace_existing=True,
    )
    scheduler.start()
    logger.info(
        f"APScheduler started: medicine reminders scheduled every {settings.NOTIFICATION_CHECK_INTERVAL_MINUTES} min."
    )

    yield

    # Shutdown scheduler
    try:
        scheduler.shutdown(wait=False)
        logger.info("APScheduler stopped.")
    except Exception as e:
        logger.warning(f"Error shutting down scheduler: {e}")

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
