# HealthVault AI — Biomarker Pydantic Schemas
# Generic clinical lab schemas: BiomarkerDataPoint, BiomarkerSeries, BiomarkerSummaryResponse, BiomarkerHistoryResponse

from datetime import date
from typing import List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExtractedBiomarkerItem(BaseModel):
    """Generic extracted biomarker item from lab reports."""
    test_name: str = Field(description="Standard test name (e.g. Hemoglobin, Platelets, ALT, Creatinine, HbA1c)")
    category: str = Field(default="Other", description="Clinical category (e.g. Complete Blood Count, Liver Function, Kidney Function, Diabetes, Lipid Profile, Thyroid, Electrolytes)")
    value: float = Field(description="Numeric value for graphing")
    value_text: Optional[str] = Field(None, description="Qualitative or raw display value")
    unit: str = Field(default="", description="Unit of measurement")
    ref_min: Optional[float] = Field(None, description="Lower normal reference boundary")
    ref_max: Optional[float] = Field(None, description="Upper normal reference boundary")
    ref_range_text: Optional[str] = Field(None, description="Standard reference range text on report")
    status: Literal["normal", "high", "low", "critical"] = Field(default="normal", description="Clinical status flag")
    test_date: Optional[date] = Field(None, description="Date of lab test")
    lab_name: Optional[str] = Field(None, description="Name of testing laboratory")


class BiomarkerDataPoint(BaseModel):
    """Single chronological lab measurement."""
    model_config = ConfigDict(from_attributes=True)

    record_id: Optional[UUID] = None
    biomarker_name: Optional[str] = None
    category: Optional[str] = "Other"
    test_date: date
    value: float
    value_text: Optional[str] = None
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    ref_range_text: Optional[str] = None
    status: str = Field(..., examples=["normal", "low", "high", "critical"])
    lab_name: Optional[str] = None


class BiomarkerSeries(BaseModel):
    """Time-series for one biomarker with analytical metadata."""
    biomarker_name: str
    category: str = Field(..., examples=["Diabetes", "Lipid Profile", "Complete Blood Count"])
    unit: str
    trend: str = Field(..., examples=["stable", "improving", "worsening"])
    data_points: List[BiomarkerDataPoint]


class BiomarkerTimelineResponse(BaseModel):
    """Aggregated response containing all requested biomarker series (backwards compatible)."""
    user_id: UUID
    total_biomarkers: int
    series: List[BiomarkerSeries]


class BiomarkerSummaryResponse(BaseModel):
    """Dynamic summary endpoint response grouping analytes by category."""
    user_id: UUID
    total_tests: int
    abnormal_count: int
    categories: List[str]
    latest_readings: List[BiomarkerDataPoint]
    abnormal_readings: List[BiomarkerDataPoint]


class BiomarkerHistoryResponse(BaseModel):
    """Detailed time-series history for a single selected analyte."""
    user_id: UUID
    test_name: str
    category: str
    unit: str
    latest_value: float
    latest_status: str
    ref_range_text: Optional[str] = None
    ref_min: Optional[float] = None
    ref_max: Optional[float] = None
    trend: str
    history: List[BiomarkerDataPoint]
