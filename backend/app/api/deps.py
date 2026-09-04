# HealthVault AI — Shared API Dependencies
# get_current_user: extracts JWT from Bearer header, returns the User ORM object

from typing import Optional
from uuid import UUID

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_access_token
from app.models.user import User


async def get_current_user(
    authorization: Optional[str] = Header(None, description="Bearer <JWT>"),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Extract and verify Bearer JWT, fetch user from DB.

    Eagerly loads ``privacy_settings`` so downstream handlers can access
    nested data without extra round-trips.

    Raises HTTP 401 if the header is missing, token is invalid/expired,
    or the user no longer exists.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authorization header missing.",
        )

    parts = authorization.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid Authorization header. Expected 'Bearer <token>'.",
        )

    payload = decode_access_token(parts[1])
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )

    subject = payload.get("sub")
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token missing 'sub' claim.",
        )

    try:
        user_id = UUID(subject)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject.",
        )

    stmt = (
        select(User)
        .where(User.id == user_id)
        .options(
            selectinload(User.privacy_settings),
        )
    )
    user = await db.scalar(stmt)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User no longer exists.",
        )

    return user
