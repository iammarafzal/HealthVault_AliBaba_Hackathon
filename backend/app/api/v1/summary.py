# HealthVault AI — Doctor Summary Routes
# GET /api/v1/summary/generate — Generates a concise 1-page clinical summary for physicians

from uuid import UUID

from fastapi import APIRouter, HTTPException, Query, status

from app.core.config import settings
from app.core.mock_data import MOCK_DOCTOR_SUMMARY
from app.schemas.summary import DoctorSummaryResponse

router = APIRouter(prefix="/summary", tags=["Doctor Summary"])


@router.get(
    "/generate",
    response_model=DoctorSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate a 30-second AI clinical briefing for doctors",
)
async def generate_doctor_summary(
    user_id: UUID = Query(..., description="Target patient UUID"),
) -> DoctorSummaryResponse:
    """Aggregates diagnoses, active medications, allergies, and recent abnormal biomarkers into a concise summary."""
    if settings.USE_MOCK:
        return MOCK_DOCTOR_SUMMARY

    # Future task: Qwen-Plus summary agent execution
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="Summary generator agent is being initialized. Set USE_MOCK=True for testing.",
    )
