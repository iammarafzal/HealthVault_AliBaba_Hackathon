# HealthVault AI — Dynamic Clinical Biomarker API Routes
# GET /api/v1/biomarkers/summary — Dynamic category & analyte summary
# GET /api/v1/biomarkers/history — Time-series history for a selected analyte
# GET /api/v1/biomarkers/abnormal — Out-of-range clinical attention items
# GET /api/v1/biomarkers/timeline — Backwards compatible timeline aggregation

from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.biomarker import (
    BiomarkerDataPoint,
    BiomarkerHistoryResponse,
    BiomarkerSummaryResponse,
    BiomarkerTimelineResponse,
)
from app.services.biomarker_service import BiomarkerService

router = APIRouter(prefix="/biomarkers", tags=["Biomarkers"])


@router.get(
    "/summary",
    response_model=BiomarkerSummaryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get dynamic biomarker summary grouped by clinical categories",
)
async def get_biomarker_summary(
    user_id: UUID = Query(..., description="Patient UUID"),
    db: AsyncSession = Depends(get_db),
) -> BiomarkerSummaryResponse:
    """Return patient's latest biomarker readings grouped by category with abnormal counts."""
    try:
        return await BiomarkerService.get_biomarker_summary(db=db, user_id=user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve biomarker summary.",
        ) from exc


@router.get(
    "/history",
    response_model=BiomarkerHistoryResponse,
    status_code=status.HTTP_200_OK,
    summary="Get historical time-series for a selected lab analyte",
)
async def get_biomarker_history(
    user_id: UUID = Query(..., description="Patient UUID"),
    test_name: str = Query(..., description="Analytic test name (e.g., Hemoglobin, ALT, HbA1c)"),
    db: AsyncSession = Depends(get_db),
) -> BiomarkerHistoryResponse:
    """Return chronological reading history for a specific lab analyte."""
    try:
        return await BiomarkerService.get_biomarker_history(
            db=db, user_id=user_id, test_name=test_name
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve history for {test_name}.",
        ) from exc


@router.get(
    "/abnormal",
    response_model=List[BiomarkerDataPoint],
    status_code=status.HTTP_200_OK,
    summary="Get out-of-range clinical attention biomarkers",
)
async def get_abnormal_biomarkers(
    user_id: UUID = Query(..., description="Patient UUID"),
    db: AsyncSession = Depends(get_db),
) -> List[BiomarkerDataPoint]:
    """Return list of all out-of-range lab markers for alert banner."""
    try:
        return await BiomarkerService.get_abnormal_biomarkers(db=db, user_id=user_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve abnormal biomarkers.",
        ) from exc


@router.get(
    "/timeline",
    response_model=BiomarkerTimelineResponse,
    status_code=status.HTTP_200_OK,
    summary="Get chronological biomarker timeline (backwards compatible)",
)
async def get_biomarker_timeline(
    user_id: UUID = Query(..., description="Patient UUID"),
    biomarkers: Optional[List[str]] = Query(
        None,
        description="Optional biomarker name filter",
    ),
    metric: Optional[str] = Query(
        None,
        description="Single biomarker name alias",
    ),
    db: AsyncSession = Depends(get_db),
) -> BiomarkerTimelineResponse:
    """Return aggregated, chronologically ordered biomarker series."""
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
