# HealthVault AI — Zero-Login Emergency QR Routes
# GET /api/v1/emergency/{health_id} — Public zero-login emergency medical summary

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.mock_data import MOCK_EMERGENCY_PROFILE
from app.schemas.emergency import EmergencyProfileResponse
from app.services.emergency_service import EmergencyService

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get(
    "/{health_id}",
    response_model=EmergencyProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public emergency medical profile by Health ID (Zero Login)",
)
async def get_emergency_profile(
    health_id: str,
    db: AsyncSession = Depends(get_db),
) -> EmergencyProfileResponse:
    """Returns critical allergies, active medications, chronic conditions,
    and emergency contacts honoring privacy settings. No auth required."""

    # Fast-path: return deterministic mock when USE_MOCK is enabled
    if settings.USE_MOCK:
        return MOCK_EMERGENCY_PROFILE.model_copy(update={"health_id": health_id})

    try:
        return await EmergencyService.get_emergency_profile_by_health_id(
            db=db,
            health_id=health_id,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve emergency profile. Please try again.",
        ) from exc
