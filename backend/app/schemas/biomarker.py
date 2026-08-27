# HealthVault AI — Biomarker Pydantic Schemas
# BiomarkerDataPoint, BiomarkerTimelineResponse

from datetime import date
from typing import List, Optional

from pydantic import BaseModel


class BiomarkerDataPoint(BaseModel):
    test_date: date
    value: float
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    status: str  # "normal" | "low" | "high"


class BiomarkerTimelineResponse(BaseModel):
    biomarker_name: str
    timeline: List[BiomarkerDataPoint]
    summary_insight: str
