# HealthVault AI — Drug Interaction & Allergy Guard Routes
# POST /api/v1/interactions/check — Validates proposed medications against active regimens & known allergies

from fastapi import APIRouter, HTTPException, status

from app.core.config import settings
from app.core.mock_data import MOCK_INTERACTION_ALERT
from app.schemas.interactions import InteractionCheckRequest, InteractionCheckResponse

router = APIRouter(prefix="/interactions", tags=["Interactions"])


@router.post(
    "/check",
    response_model=InteractionCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Check drug-drug and drug-allergy interactions for proposed medications",
)
async def check_drug_interactions(
    request: InteractionCheckRequest,
) -> InteractionCheckResponse:
    """Evaluates potential conflicts between proposed drugs, active medications, and user allergies with bilingual alerts."""
    if settings.USE_MOCK:
        return MOCK_INTERACTION_ALERT

    # Future task: Qwen Drug Guard agent execution
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Drug interaction agent is being initialized. Set USE_MOCK=True for testing.",
    )
