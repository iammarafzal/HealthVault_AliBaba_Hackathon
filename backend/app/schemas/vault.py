# HealthVault AI — Vault Pydantic Schemas
# Document extraction, HITL confirmation, and persisted medical record responses.

from datetime import date, datetime
from typing import Any, Dict, List, Literal, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class ExtractedMedication(BaseModel):
    name: str = Field(..., examples=["Tab Solif 5mg"])
    dosage: str = Field("", examples=["0.5 Tablet", "2 Teaspoons"])
    dosage_quantity: Optional[str] = Field(None, examples=["2 Teaspoons", "0.5 Tablet"])
    strength: Optional[str] = Field(None, examples=["5mg", "500mg"])
    frequency: str = Field("", examples=["OD (Once Daily)"])
    timing: Optional[str] = Field(None, examples=["Evening (شام کو)"])
    instructions_en: str = ""
    instructions_ur: str = ""
    fraction: Optional[str] = Field(None, examples=["half", "full", "2_spoons"])
    fraction_label_en: Optional[str] = Field(None, examples=["Half Tablet (0.5)"])
    fraction_label_ur: Optional[str] = Field(None, examples=["آدھی گولی (0.5)"])
    meal_context: Optional[str] = Field(None, examples=["before_meal", "after_meal", "with_meal"])
    meal_context_en: Optional[str] = Field(None, examples=["Before meals", "After meals"])
    meal_context_ur: Optional[str] = Field(None, examples=["کھانے سے پہلے", "کھانے کے بعد"])
    purpose_en: Optional[str] = Field(None, examples=["For urinary bladder control / UTI relief"])
    purpose_ur: Optional[str] = Field(None, examples=["پیشاب کے کنٹرول اور مثانے کے سکون کے لیے"])
    duration: Optional[str] = Field(None, examples=["5 days"])
    duration_ur: Optional[str] = Field(None, examples=["۵ دن"])
    timing_breakdown: Optional[Dict[str, bool]] = Field(
        default_factory=lambda: {"morning": False, "afternoon": False, "night": False}
    )
    audio_script_ur: Optional[str] = Field(
        None,
        examples=["ٹیبلٹ سولف پانچ ملی گرام۔ روزانہ شام کو آدھی گولی پانی کے ساتھ لیں۔ یہ دوا پانچ دن تک جاری رکھیں۔"]
    )
    is_active: bool = True


class ExtractedAllergy(BaseModel):
    allergen: str
    severity: str = "moderate"
    reaction_details: Optional[str] = None


class ExtractedBiomarker(BaseModel):
    analyte_name: str
    value: float
    unit: str
    ref_min: Optional[float] = None
    ref_max: Optional[float] = None
    status: Literal["normal", "high", "low"] = "normal"


class ExtractedEntities(BaseModel):
    doctor_name: Optional[str] = None
    clinic_hospital_name: Optional[str] = None
    consultation_date: Optional[str] = None
    diagnoses: List[str] = Field(default_factory=list)
    medications: List[ExtractedMedication] = Field(default_factory=list)
    allergies: List[str] = Field(default_factory=list)
    biomarkers: List[ExtractedBiomarker] = Field(default_factory=list)
    raw_text: str = ""


class ExtractedDocumentEntities(BaseModel):
    """Schema for validating raw LLM extraction output in the validation_node.

    Unlike ExtractionResponse, this does NOT require DB-generated fields
    (record_id, raw_ocr_text) — it validates only the fields the LLM produces.
    """

    document_type: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    clinic_hospital_name: Optional[str] = None
    consultation_date: Optional[date] = None
    diagnoses: List[str] = Field(default_factory=list)
    medications: List[ExtractedMedication] = Field(default_factory=list)
    allergies: List[ExtractedAllergy] = Field(default_factory=list)
    biomarkers: List[Dict[str, Any]] = Field(default_factory=list)


class DocumentDraftExtractionResponse(BaseModel):
    temp_file_url: str
    is_medical_document: bool = True
    rejection_reason: Optional[str] = None
    detected_document_type: Optional[str] = None
    confidence_score: float = 0.0
    document_type: str = "other_medical"
    extracted_data: Optional[ExtractedEntities] = None


class ConfirmRecordRequest(BaseModel):
    user_id: UUID
    document_type: str
    file_url: str
    confirmed_data: ExtractedEntities


class ExtractionResponse(BaseModel):
    record_id: UUID
    document_type: str  # "prescription" | "lab_report" | "discharge_summary"
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    consultation_date: Optional[date] = None
    diagnoses: List[str] = Field(default_factory=list)
    medications: List[ExtractedMedication] = Field(default_factory=list)
    allergies: List[ExtractedAllergy] = Field(default_factory=list)
    # Lab reports: structured biomarkers (analyte, value, unit, ref range, status)
    biomarkers: List[Dict[str, Any]] = Field(default_factory=list)
    test_name: Optional[str] = None
    test_date: Optional[date] = None
    # Discharge summaries: surgical notes & follow-up clinical instructions
    surgical_notes: List[str] = Field(default_factory=list)
    follow_up_instructions: List[str] = Field(default_factory=list)
    # Persisted document location for client-side preview
    document_url: Optional[str] = None
    raw_ocr_text: str


class MedicalRecordBase(BaseModel):
    document_type: str
    document_url: str
    consultation_date: Optional[date] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None


class MedicationResponse(BaseModel):
    id: UUID
    name: str
    dosage: str
    frequency: str
    timing: Optional[str] = None
    dosage_schedule: Optional[Dict[str, Any]] = None
    instructions_en: Optional[str] = None
    instructions_ur: Optional[str] = None
    fraction: Optional[str] = None
    fraction_label_en: Optional[str] = None
    fraction_label_ur: Optional[str] = None
    meal_context: Optional[str] = None
    meal_context_en: Optional[str] = None
    meal_context_ur: Optional[str] = None
    purpose_en: Optional[str] = None
    purpose_ur: Optional[str] = None
    duration: Optional[str] = None
    duration_ur: Optional[str] = None
    timing_breakdown: Optional[Dict[str, bool]] = None
    audio_script_ur: Optional[str] = None
    is_active: bool = True
    prescription_date: Optional[date] = None

    model_config = ConfigDict(from_attributes=True)


class AllergyResponse(BaseModel):
    id: UUID
    allergen: str
    severity: str = "moderate"
    reaction_details: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


class BiomarkerResponse(BaseModel):
    id: UUID
    biomarker_name: str
    value: float
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    status: str
    test_date: date

    model_config = ConfigDict(from_attributes=True)


class MedicalRecordResponse(MedicalRecordBase):
    id: UUID
    user_id: UUID
    raw_ocr_text: Optional[str] = None
    extracted_data: Dict[str, Any] = Field(default_factory=dict)
    medications: List[MedicationResponse] = Field(default_factory=list)
    allergies: List[AllergyResponse] = Field(default_factory=list)
    biomarkers: List[BiomarkerResponse] = Field(default_factory=list)
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DeleteRecordResponse(BaseModel):
    status: str
    message: str
