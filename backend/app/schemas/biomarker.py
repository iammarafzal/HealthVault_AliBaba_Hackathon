# HealthVault AI — Biomarker Pydantic Schemas
# BiomarkerDataPoint, BiomarkerSeries, BiomarkerTimelineResponse

from datetime import date
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class BiomarkerDataPoint(BaseModel):
    """Single chronological lab measurement."""
    record_id: UUID
    test_date: date
    value: float
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    status: str = Field(..., examples=["normal", "low", "high"])


class BiomarkerSeries(BaseModel):
    """Time-series for one biomarker with analytical metadata."""
    biomarker_name: str
    category: str = Field(..., examples=["Diabetes", "Lipid Profile", "CBC"])
    unit: str
    trend: str = Field(..., examples=["stable", "improving", "worsening"])
    data_points: List[BiomarkerDataPoint]


class BiomarkerTimelineResponse(BaseModel):
    """Aggregated response containing all requested biomarker series."""
    user_id: UUID
    total_biomarkers: int
    series: List[BiomarkerSeries]
