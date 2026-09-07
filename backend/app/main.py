# HealthVault AI FastAPI Production Application
from contextlib import asynccontextmanager
import logging
from pathlib import Path
import httpx
from sqlalchemy import text

from fastapi import FastAPI, Request, Response, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from slowapi.errors import RateLimitExceeded

from app.core.config import settings
from app.core.logging import setup_logging
from app.core.rate_limiter import limiter, _rate_limit_exceeded_handler
from app.api.router import api_router
from app.db.session import Base, engine, async_session_factory
from app.services.storage_service import storage_service
from app.services.notification_service import notification_service
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import app.models  # noqa: F401

logger = setup_logging(settings.ENVIRONMENT)


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
    
    # Create reusable async HTTP client for external integrations
    app.state.http_client = httpx.AsyncClient(timeout=settings.LLM_TIMEOUT_SECONDS)

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

    # Close HTTP client
    try:
        await app.state.http_client.aclose()
        logger.info("Shared HTTP client session closed.")
    except Exception as e:
        logger.warning(f"Error closing HTTP client session: {e}")

    # Dispose database connection pool
    try:
        await engine.dispose()
        logger.info("Database connection pool disposed cleanly.")
    except Exception as e:
        logger.warning(f"Error disposing database engine: {e}")

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

    # Attach slowapi rate limiter to app state
    app.state.limiter = limiter
    app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

    # Configure Restrictive Production Security Headers Middleware
    @app.middleware("http")
    async def add_security_headers(request: Request, call_next):
        response: Response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
        response.headers["Content-Security-Policy"] = (
            "default-src 'self'; "
            "connect-src 'self' https://ntfy.sh https:; "
            "font-src 'self' https: data:; "
            "img-src 'self' data: blob: https:; "
            "style-src 'self' 'unsafe-inline'; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        )
        return response

    # Configure Production CORS Middleware
    origins = settings.effective_cors_origins
    if origins:
        app.add_middleware(
            CORSMiddleware,
            allow_origins=origins,
            allow_credentials=True,
            allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE"],
            allow_headers=["Authorization", "Content-Type", "Accept", "X-Requested-With"],
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
    @app.get("/healthz", tags=["Health"])
    async def health_check():
        """Liveness probe returning 200 OK if FastAPI process is alive."""
        return {
            "status": "healthy",
            "service": settings.PROJECT_NAME,
            "environment": settings.ENVIRONMENT,
            "use_mock": settings.USE_MOCK,
        }

    @app.get("/readyz", tags=["Health"])
    async def readiness_check():
        """Readiness probe checking database connectivity and system status."""
        db_ok = False
        try:
            async with async_session_factory() as session:
                await session.execute(text("SELECT 1"))
                db_ok = True
        except Exception as ex:
            logger.error(f"Readiness check failed: Database connection error: {ex}")

        if db_ok:
            return JSONResponse(
                status_code=status.HTTP_200_OK,
                content={
                    "status": "ready",
                    "database": "connected",
                    "service": settings.PROJECT_NAME,
                    "environment": settings.ENVIRONMENT,
                },
            )
        else:
            return JSONResponse(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                content={
                    "status": "unready",
                    "database": "disconnected",
                    "service": settings.PROJECT_NAME,
                    "environment": settings.ENVIRONMENT,
                },
            )

    return app


app = create_application()
