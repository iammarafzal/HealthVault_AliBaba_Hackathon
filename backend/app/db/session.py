# HealthVault AI — Async Database Engine & Session Pooling
import os
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings

import urllib.parse
from sqlalchemy.engine.url import make_url

RAW_DATABASE_URL = os.getenv("DATABASE_URL", settings.DATABASE_URL)


def sanitize_database_url(url: str) -> str:
    """Ensure postgresql+asyncpg scheme and auto-encode unescaped special characters in passwords."""
    if not url:
        return url

    # Ensure asyncpg dialect prefix
    if url.startswith("postgres://"):
        url = url.replace("postgres://", "postgresql+asyncpg://", 1)
    elif url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)

    # Strip query string for engine creation if present
    clean_url = url.split("?")[0] if "?" in url else url

    # Check if special characters (like '@') in password break URL parsing
    try:
        u = make_url(clean_url)
        if u.host and "@" in u.host:
            raise ValueError("Host contains @ symbol")
    except Exception:
        if "://" in clean_url:
            scheme, rest = clean_url.split("://", 1)
            last_at_idx = rest.rfind("@")
            if last_at_idx != -1:
                userinfo = rest[:last_at_idx]
                host_path = rest[last_at_idx + 1:]
                if ":" in userinfo:
                    user, password = userinfo.split(":", 1)
                    unquoted_pass = urllib.parse.unquote(password)
                    quoted_pass = urllib.parse.quote(unquoted_pass, safe="")
                    clean_url = f"{scheme}://{user}:{quoted_pass}@{host_path}"
    return clean_url


DATABASE_URL = sanitize_database_url(RAW_DATABASE_URL)

# Configure connection args for Supabase Free Tier (PgBouncer / Transaction Mode prepared statement compatibility)
connect_args = {
    "prepared_statement_cache_size": 0,
    "statement_cache_size": 0,
}

# Require SSL for remote cloud databases (Supabase, Neon, Managed Postgres)
if "localhost" not in DATABASE_URL and "127.0.0.1" not in DATABASE_URL:
    connect_args["ssl"] = "require"

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=5,          # Safe limit for Supabase free connection caps
    max_overflow=2,
    pool_pre_ping=True,   # Reconnect automatically after Render spin-down or Supabase disconnects
    pool_recycle=1800,
    connect_args=connect_args,
)

AsyncSessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)

async_session_factory = AsyncSessionLocal


class Base(DeclarativeBase):
    """Shared declarative base for all ORM models."""
    pass


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency: yields an async DB session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
