# HealthVault AI — Drug Interaction & Allergy Guard Routes
# POST /api/v1/interactions/check — Validates proposed medications against active regimens & known allergies

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.interaction_agent import DrugInteractionAgent
from app.core.config import settings
from app.core.database import get_db
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
    db: AsyncSession = Depends(get_db),
) -> InteractionCheckResponse:
    """Evaluates potential conflicts between proposed drugs, active medications,
    and user allergies with bilingual safety alerts."""

    # Fast-path: return deterministic mock when USE_MOCK is enabled
    if settings.USE_MOCK:
        return MOCK_INTERACTION_ALERT

    try:
        return await DrugInteractionAgent.check_interactions(
            db=db,
            user_id=request.user_id,
            new_medications=request.new_medications,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to evaluate drug interactions. Please try again.",
        ) from exc
