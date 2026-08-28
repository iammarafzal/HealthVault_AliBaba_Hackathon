# HealthVault AI — Doctor Summary Routes
# GET /api/v1/summary/generate — Generates a concise 1-page clinical summary for physicians

from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.summary_agent import SummaryAgent
from app.core.config import settings
from app.core.database import get_db
from app.core.mock_data import MOCK_DOCTOR_SUMMARY
from app.schemas.summary import DoctorSummaryResponse

router = APIRouter(prefix="/summary", tags=["Doctor Summary"])


@router.get(
    "/generate",
    response_model=DoctorSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a 10-second AI clinical briefing for doctors",
)
async def generate_doctor_summary(
    user_id: UUID = Query(..., description="Target patient UUID"),
    db: AsyncSession = Depends(get_db),
) -> DoctorSummaryResponse:
    """Aggregates diagnoses, active medications, allergies, and recent abnormal
    biomarkers into a concise 1-page clinical summary via the SummaryAgent."""

    # Fast-path: return deterministic mock when USE_MOCK is enabled
    if settings.USE_MOCK:
        return MOCK_DOCTOR_SUMMARY

    try:
        return await SummaryAgent.generate_clinical_summary(db=db, user_id=user_id)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to generate clinical summary. Please try again.",
        ) from exc
