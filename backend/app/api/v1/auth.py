# HealthVault AI — Auth Routes
# POST /api/v1/auth/register — Fast 3-field onboarding + issue JWT
# POST /api/v1/auth/login    — Verify credentials + issue JWT
# GET  /api/v1/auth/me        — Current user profile (Bearer token)

import logging
import random
import string
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import create_access_token, hash_password, verify_password
from app.api.deps import get_current_user
from app.models.user import User
from app.models.privacy import PrivacySettings
from app.schemas.auth import UserRegisterRequest, UserLogin, TokenResponse
from app.schemas.user import UserResponse
from app.services.security_service import generate_emergency_token

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/auth", tags=["Auth"])


# ---------------------------------------------------------------------------
# POST /api/v1/auth/register
# ---------------------------------------------------------------------------
@router.post(
    "/register",
    response_model=TokenResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register with Full Name, Email & Password — instant JWT issued",
)
async def register(
    body: UserRegisterRequest,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Fast 3-field onboarding.

    Within a single DB transaction this endpoint:
    1. Checks for duplicate email.
    2. Creates the ``users`` row (auth + identifiers).
    3. Creates the ``privacy_settings`` row with defaults.
    4. Provisions ``health_id`` and ``emergency_token``.
    5. Returns a signed JWT + full user envelope.
    """
    # Check for duplicate email
    existing = await db.scalar(
        select(User).where(User.email == body.email)
    )
    if existing:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="A user with this email already exists.",
        )

    health_id = await _generate_unique_health_id(db)

    # 1. Create User (core identity + auth)
    user = User(
        id=uuid.uuid4(),
        email=body.email,
        full_name=body.full_name,
        hashed_password=hash_password(body.password),
        health_id=health_id,
        emergency_token=generate_emergency_token(),
        emergency_enabled=True,
        role="patient",
        created_at=datetime.now(timezone.utc),
    )
    db.add(user)
    await db.flush()

    # 2. Create PrivacySettings (1-to-1, all defaults)
    privacy = PrivacySettings(user_id=user.id)
    db.add(privacy)
    await db.flush()

    # 3. Refresh with eager-loaded relations for response serialization
    stmt = (
        select(User)
        .where(User.id == user.id)
        .options(
            selectinload(User.privacy_settings),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one()

    # 4. Issue JWT with standard claims: sub, health_id, email
    token = create_access_token(
        subject=str(user.id),
        extra_claims={"health_id": user.health_id, "email": user.email},
    )
    logger.info("Registered new user %s (health_id=%s)", user.id, health_id)

    return TokenResponse(
        access_token=token,
        user=UserResponse.model_validate(user),
    )


# ---------------------------------------------------------------------------
# POST /api/v1/auth/login
# ---------------------------------------------------------------------------
@router.post(
    "/login",
    response_model=TokenResponse,
    status_code=status.HTTP_200_OK,
    summary="Authenticate with email + password and receive a JWT",
)
async def login(
    body: UserLogin,
    db: AsyncSession = Depends(get_db),
) -> TokenResponse:
    """Verify credentials and return a signed JWT access token."""
    stmt = (
        select(User)
        .where(User.email == body.email)
        .options(
            selectinload(User.privacy_settings),
        )
    )
    result = await db.execute(stmt)
    user = result.scalar_one_or_none()

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

    # Issue JWT with standard claims: sub, health_id, email
    token = create_access_token(
        subject=str(user.id),
        extra_claims={"health_id": user.health_id, "email": user.email},
    )
    logger.info("User %s logged in successfully", user.id)

    return TokenResponse(
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
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    """Return the profile of the currently authenticated user."""
    return UserResponse.model_validate(current_user)


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
