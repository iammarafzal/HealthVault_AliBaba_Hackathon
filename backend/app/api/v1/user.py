# HealthVault AI — User Privacy & QR Management Routes
# PATCH /api/v1/user/privacy-settings — Update visibility toggles
# POST  /api/v1/user/regenerate-qr   — Regenerate health_id & QR code

from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.user import User
from app.schemas.user import (
    PrivacySettingsResponse,
    PrivacySettingsUpdate,
    QRRegenerateRequest,
    QRRegenerateResponse,
    UserResponse,
)
from app.services.privacy_service import PrivacyFilterService
from sqlalchemy import select

router = APIRouter(prefix="/user", tags=["User"])


# ---------------------------------------------------------------------------
# GET /api/v1/user/profile?user_id=<uuid>
# ---------------------------------------------------------------------------
@router.get(
    "/profile",
    response_model=UserResponse,
    status_code=status.HTTP_200_OK,
    summary="Get user profile by user_id",
)
async def get_user_profile(
    user_id: UUID = Query(..., description="UUID of the user"),
    db: AsyncSession = Depends(get_db),
) -> UserResponse:
    """Retrieve full profile for the given user_id."""
    user = await db.scalar(select(User).where(User.id == user_id))
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found.",
        )
    return UserResponse.model_validate(user)


# ---------------------------------------------------------------------------
# PATCH /api/v1/user/privacy-settings?user_id=<uuid>
# ---------------------------------------------------------------------------
@router.patch(
    "/privacy-settings",
    response_model=PrivacySettingsResponse,
    status_code=status.HTTP_200_OK,
    summary="Update privacy visibility toggles for the authenticated user",
)
async def update_privacy_settings(
    body: PrivacySettingsUpdate,
    user_id: str = Query(..., description="UUID of the authenticated user"),
    db: AsyncSession = Depends(get_db),
) -> PrivacySettingsResponse:
    """Partially update any combination of privacy boolean flags.

    Query param ``user_id`` identifies the user (in production: JWT subject).
    Only fields explicitly included in the request body are modified.
    """
    # Validate UUID format
    try:
        uid = UUID(user_id)
    except ValueError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid user_id format. Must be a valid UUID.",
        )

    if not body.model_dump(exclude_unset=True):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="At least one privacy field must be provided for update.",
        )

    try:
        privacy_orm = await PrivacyFilterService.update_user_privacy_settings(
            db=db, user_id=uid, update_data=body
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update privacy settings.",
        ) from exc

    return PrivacySettingsResponse(
        user_id=privacy_orm.user_id,
        show_blood_group=privacy_orm.show_blood_group,
        show_allergies=privacy_orm.show_allergies,
        show_active_meds=privacy_orm.show_active_meds,
        show_chronic_conditions=privacy_orm.show_chronic_conditions,
        show_emergency_contacts=privacy_orm.show_emergency_contacts,
        qr_revoked=privacy_orm.qr_revoked,
        updated_at=privacy_orm.updated_at,
    )


# ---------------------------------------------------------------------------
# POST /api/v1/user/regenerate-qr
# ---------------------------------------------------------------------------
@router.post(
    "/regenerate-qr",
    response_model=QRRegenerateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Regenerate health_id and QR code URL for the authenticated user",
)
async def regenerate_qr(
    body: QRRegenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> QRRegenerateResponse:
    """Generate a brand-new unique ``health_id`` for the user.

    Any previously printed / shared QR code will immediately become invalid
    (pointing to a non-existent ID → 404).  The new QR is active by default.
    """
    try:
        user = await PrivacyFilterService.regenerate_health_id(
            db=db, user_id=body.user_id
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to regenerate QR code.",
        ) from exc

    qr_data_url = f"{settings.SERVER_BASE_URL}/api/v1/emergency/{user.health_id}"

    return QRRegenerateResponse(
        health_id=user.health_id,
        qr_data_url=qr_data_url,
        created_at=datetime.now(timezone.utc),
    )
