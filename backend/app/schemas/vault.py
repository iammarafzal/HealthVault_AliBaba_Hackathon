# HealthVault AI — Vault Pydantic Schemas
# ExtractedMedication, ExtractedAllergy, ExtractionResponse, MedicalRecordBase, MedicalRecordResponse

from datetime import date
from typing import Any, Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field


class ExtractedMedication(BaseModel):
    name: str = Field(..., examples=["Metformin"])
    dosage: str = Field(..., examples=["500mg"])
    frequency: str = Field(..., examples=["BD (Twice Daily)"])
    timing: str = Field(..., examples=["Morning / Night"])
    instructions_en: str
    instructions_ur: str
    is_active: bool = True


class ExtractedAllergy(BaseModel):
    allergen: str
    severity: str = "moderate"
    reaction_details: Optional[str] = None


class ExtractionResponse(BaseModel):
    record_id: UUID
    document_type: str  # "prescription" | "lab_report" | "discharge_summary"
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    consultation_date: Optional[date] = None
    diagnoses: List[str] = []
    medications: List[ExtractedMedication] = []
    allergies: List[ExtractedAllergy] = []
    raw_ocr_text: str


class MedicalRecordBase(BaseModel):
    document_type: str
    document_url: str
    consultation_date: Optional[date] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None


class MedicalRecordResponse(MedicalRecordBase):
    id: UUID
    user_id: UUID
    raw_ocr_text: Optional[str] = None
    extracted_data: Dict[str, Any] = {}
    created_at: str

    class Config:
        from_attributes = True
