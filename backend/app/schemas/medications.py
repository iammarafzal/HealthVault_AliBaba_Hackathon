# HealthVault AI — Medication Management Pydantic Schemas
# Active medication management, toggle, and manual entry.

from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class DosageSchedulePayload(BaseModel):
    """Schedule breakdown for a medication."""
    morning: bool = False
    afternoon: bool = False
    evening: bool = False
    frequency_per_day: int = 1
    meal_relation: str = "unspecified"
    custom_time_instruction: Optional[str] = None


class MedicationDetailResponse(BaseModel):
    """Single medication item returned by management endpoints."""
    id: UUID
    user_id: UUID
    record_id: Optional[UUID] = None
    name: str
    dosage: str
    frequency: str
    timing: Optional[str] = None
    dosage_schedule: Optional[Dict] = None
    instructions_en: Optional[str] = None
    instructions_ur: Optional[str] = None
    is_active: bool = True
    is_manual: bool = False
    time_slots: List[str] = Field(default_factory=list)
    prescription_date: Optional[date] = None
    start_date: Optional[date] = None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MedicationGroupResponse(BaseModel):
    """Medications grouped by their source prescription record."""
    record_id: Optional[UUID] = None
    prescription_date: Optional[date] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    created_at: Optional[datetime] = None
    medications: List[MedicationDetailResponse] = Field(default_factory=list)


class AllMedicationsResponse(BaseModel):
    """Response for GET /medications/all — grouped by prescription."""
    user_id: UUID
    groups: List[MedicationGroupResponse] = Field(default_factory=list)
    total_medications: int = 0
    active_count: int = 0


class ToggleActiveRequest(BaseModel):
    """Request body for PATCH /medications/{id}/toggle-active."""
    is_active: bool


class ToggleActiveResponse(BaseModel):
    """Response after toggling a medication's active state."""
    id: UUID
    name: str
    is_active: bool
    message: str = "Medication status updated."


class ManualMedicationRequest(BaseModel):
    """Request body for POST /medications/manual."""
    name: str = Field(..., min_length=1, max_length=160)
    dosage: str = Field("", max_length=64)
    frequency: str = Field("", max_length=64)
    timing: Optional[str] = Field(None, max_length=64)
    dosage_schedule: Optional[DosageSchedulePayload] = None
    time_slots: List[str] = Field(default_factory=list)
    instructions_en: Optional[str] = None
    instructions_ur: Optional[str] = None
    is_active: bool = True


class ManualMedicationUpdate(BaseModel):
    """Request body for PUT /medications/manual/{medication_id}."""
    name: Optional[str] = Field(None, min_length=1, max_length=160)
    dosage: Optional[str] = Field(None, max_length=64)
    frequency: Optional[str] = Field(None, max_length=64)
    timing: Optional[str] = Field(None, max_length=64)
    dosage_schedule: Optional[DosageSchedulePayload] = None
    time_slots: Optional[List[str]] = None
    instructions_en: Optional[str] = None
    instructions_ur: Optional[str] = None
    is_active: Optional[bool] = None


class ManualMedicationResponse(BaseModel):
    """Response after creating or updating a manual medication entry."""
    id: UUID
    name: str
    dosage: str
    is_active: bool
    is_manual: bool = True
    time_slots: List[str] = Field(default_factory=list)
    message: str = "Medication saved successfully."

    model_config = ConfigDict(from_attributes=True)


class ActiveMedicationsResponse(BaseModel):
    """Response for GET /medications/active — flat list of active meds."""
    user_id: UUID
    medications: List[MedicationDetailResponse] = Field(default_factory=list)
    total: int = 0


class TodayDoseLogsResponse(BaseModel):
    """Response for GET /medications/doses/today."""
    dose_date: date
    dose_logs: Dict[str, bool] = Field(default_factory=dict)


class ToggleDoseLogRequest(BaseModel):
    """Request body for POST /medications/doses/toggle."""
    medication_id: UUID
    time_slot: str = Field(..., max_length=20)
    taken: bool = True
    dose_date: Optional[date] = None


class ToggleDoseLogResponse(BaseModel):
    """Response after toggling a dose log status."""
    medication_id: UUID
    time_slot: str
    dose_date: date
    taken: bool
    taken_at: Optional[datetime] = None
    message: str = "Dose log updated successfully."

