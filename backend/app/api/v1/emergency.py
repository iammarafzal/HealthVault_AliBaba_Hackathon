# HealthVault AI — Token-Gated Emergency QR Routes
# GET /api/v1/emergency/{health_id}?token={emergency_token}
# Public access requires BOTH health_id AND valid emergency_token.

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.mock_data import MOCK_EMERGENCY_PROFILE
from app.schemas.emergency import EmergencyAccessResponse
from app.services.emergency_service import EmergencyService

router = APIRouter(prefix="/emergency", tags=["Emergency"])


@router.get(
    "/{health_id}",
    response_model=EmergencyAccessResponse,
    status_code=status.HTTP_200_OK,
    summary="Get emergency medical profile (requires health_id + emergency_token)",
)
async def get_emergency_profile(
    health_id: str,
    request: Request,
    token: str = Query(
        ...,
        description="High-entropy access token embedded in physical QR code",
    ),
    db: AsyncSession = Depends(get_db),
) -> EmergencyAccessResponse:
    """Returns critical medical data ONLY when both health_id AND token match.

    Security:
    - 404 if health_id not found (prevents enumeration).
    - 401 if token is missing/invalid (constant-time comparison).
    - 403 if emergency_enabled=False or qr_revoked=True.
    """

    # Fast-path: return deterministic mock when USE_MOCK is enabled
    if settings.USE_MOCK:
        return MOCK_EMERGENCY_PROFILE.model_copy(update={"health_id": health_id})

    # Extract client IP and device info
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        client_ip = forwarded_for.split(",")[0].strip()
    else:
        client_ip = request.client.host if request.client else "127.0.0.1"

    user_agent = request.headers.get("User-Agent", "Unknown Device")

    try:
        return await EmergencyService.get_emergency_profile_with_token(
            db=db,
            health_id=health_id,
            provided_token=token,
            ip_address=client_ip,
            user_agent=user_agent,
        )
    except ValueError as exc:
        # health_id not found → 404 (prevents enumeration)
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Emergency record not found.",
        ) from exc
    except PermissionError as exc:
        # Token mismatch → 401
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired access token.",
        ) from exc
    except RuntimeError as exc:
        msg = str(exc).lower()
        if "disabled" in msg or "revoked" in msg:
            # Emergency disabled or revoked → 403
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(exc),
            ) from exc
        # Other runtime errors → 500
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve emergency profile.",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve emergency profile.",
        ) from exc
