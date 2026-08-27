# HealthVault AI — Zero-Login Emergency QR Routes
# GET /api/v1/emergency/{health_id} — Public zero-login emergency medical summary

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.mock_data import MOCK_EMERGENCY_PROFILE
from app.schemas.emergency import EmergencyProfileResponse

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get(
    "/{health_id}",
    response_model=EmergencyProfileResponse,
    status_code=status.HTTP_200_OK,
    summary="Get public emergency medical profile by Health ID (Zero Login)",
)
async def get_emergency_profile(
    health_id: str,
) -> EmergencyProfileResponse:
    """Returns critical allergies, active medications, chronic conditions, and emergency contacts honoring privacy settings."""
    if settings.USE_MOCK:
        # Return mock emergency profile with requested health_id
        return MOCK_EMERGENCY_PROFILE.model_copy(update={"health_id": health_id})

    # Future task: Live DB query honoring PrivacySettings
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Live emergency profile lookup is being initialized. Set USE_MOCK=True for testing.",
    )
