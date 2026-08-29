# HealthVault AI — Auth Routes
# POST /api/v1/auth/register — Create account + issue JWT
# POST /api/v1/auth/login    — Verify credentials + issue JWT
# GET  /api/v1/auth/me        — Current user profile (Bearer token)

import logging
import random
import string
from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, Header, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate, UserResponse

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------
class LoginRequest(BaseModel):
    email: str = Field(..., examples=["patient@example.com"])
    password: str = Field(..., examples=["Str0ngP@ss"])


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
async def _resolve_user_id(
    authorization: Optional[str] = Header(None),
) -> UUID:
    """Parse the Bearer token from the Authorization header and return the user id."""
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
    from app.core.security import verify_access_token

    subject = verify_access_token(parts[1])
    if not subject:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token.",
        )
    try:
        return UUID(subject)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token subject.",
        )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------
@router.post(
    "/register",
    response_model=TokenOut,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new patient account and return an access token",
)
async def register(
    body: UserCreate,
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    """Create a new user, generate a unique health_id, and return a JWT."""
    # Check for duplicate email
    existing = await db.scalar(
        select(User).where(User.email == body.email)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    # Generate a unique HV-PAK-XXXXX health_id
    health_id = await _generate_unique_health_id(db)

    import uuid
    from datetime import datetime, timezone

    user = User(
        id=uuid.uuid4(),
        full_name=body.full_name,
        email=body.email,
        phone=body.phone,
        hashed_password=hash_password(body.password),
        blood_group=body.blood_group,
        date_of_birth=body.date_of_birth,
        gender=body.gender,
        health_id=health_id,
        role="patient",
        created_at=datetime.now(timezone.utc),
        emergency_contacts=[c.model_dump() for c in body.emergency_contacts],
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token = create_access_token(subject=str(user.id))
    logger.info("Registered new user %s (health_id=%s)", user.id, health_id)

    return TokenOut(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------
@router.post(
    "/login",
    response_model=TokenOut,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with email + password and receive a JWT",
)
async def login(
    body: LoginRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenOut:
    """Verify credentials and return a signed JWT access token."""
    user = await db.scalar(
        select(User).where(User.email == body.email)
    )
    if not user or not user.hashed_password:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not verify_password(body.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    token = create_access_token(subject=str(user.id))
    logger.info("User %s logged in successfully", user.id)

    return TokenOut(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# GET /api/v1/auth/me
# ---------------------------------------------------------------------------
@router.get(
    "/me",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get the authenticated user's profile",
)
async def get_me_profile(
    user_id: UUID = Depends(_resolve_user_id),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Return the profile of the currently authenticated user."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return UserResponse.model_validate(user)


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------
async def _generate_unique_health_id(db: AsyncSession) -> str:
    """Return a collision-free ``HV-PAK-XXXXX`` string."""
    charset = string.ascii_uppercase + string.digits
    for _ in range(10):
        suffix = "".join(random.choices(charset, k=5))
        candidate = f"HV-PAK-{suffix}"
        existing = await db.scalar(
            select(User).where(User.health_id == candidate)
        )
        if not existing:
            return candidate
    raise RuntimeError("Failed to generate a unique health_id after 10 attempts")
