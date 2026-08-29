# HealthVault AI — Longitudinal Lab Biomarkers Routes
# GET /api/v1/biomarkers/timeline — Chronological biomarker aggregation

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.schemas.biomarker import BiomarkerTimelineResponse
from app.services.biomarker_service import BiomarkerService

router = APIRouter(prefix="/biomarkers", tags=["Biomarkers"])


@router.get(
    "/timeline",
    response_model=BiomarkerTimelineResponse,
    status_code=status.HTTP_200_OK,
    summary="Get chronological biomarker timeline for a user",
)
async def get_biomarker_timeline(
    user_id: UUID = Query(..., description="Patient UUID"),
    biomarkers: Optional[List[str]] = Query(
        None,
        description="Optional biomarker name filter (e.g. HbA1c, Cholesterol, Hemoglobin)",
    ),
    metric: Optional[str] = Query(
        None,
        description="Single biomarker name alias (API_CONTRACTS §6 compatibility)",
    ),
    db: AsyncSession = Depends(get_db),
) -> BiomarkerTimelineResponse:
    """Return aggregated, chronologically ordered biomarker series.

    Supports optional filtering by biomarker name (case-insensitive,
    alias-aware).  Each series includes trend analysis
    (improving / worsening / stable).

    The ``metric`` query parameter is accepted as a convenience alias
    for specifying a single biomarker name (API_CONTRACTS §6).
    """
    # Merge metric into biomarkers list for unified downstream handling
    effective_names = list(biomarkers) if biomarkers else []
    if metric and metric not in effective_names:
        effective_names.append(metric)

    try:
        return await BiomarkerService.get_biomarker_timeline(
            db=db,
            user_id=user_id,
            biomarker_names=effective_names or None,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve biomarker timeline.",
        ) from exc
