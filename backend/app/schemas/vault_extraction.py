from typing import List, Optional, Literal, Any, Dict
from pydantic import BaseModel, Field

class DocumentValidationResult(BaseModel):
    is_valid_medical_doc: bool = Field(description="True only if document is a clinical medical record")
    category: Literal["prescription", "lab_report", "radiology", "discharge_summary", "non_medical", "other_medical"] = Field(description="Detected document category")
    rejection_reason: Optional[str] = Field(None, description="Explanation if rejected (non-medical, receipt, selfie, etc)")
    confidence_score: float = Field(ge=0.0, le=1.0, description="Confidence in the classification")

class DosageTimingSchedule(BaseModel):
    morning: bool = Field(False, description="Take in morning / breakfast")
    afternoon: bool = Field(False, description="Take at noon / lunch")
    evening: bool = Field(False, description="Take in evening / dinner / bedtime")
    frequency_per_day: int = Field(1, description="Times per day (e.g., 1, 2, 3)")
    meal_relation: Literal["before_meals", "after_meals", "with_meals", "as_needed", "unspecified"] = Field("unspecified")
    custom_time_instruction: Optional[str] = Field(None, description="e.g., 8:00 AM, 2:00 PM, 8:00 PM")

class ParsedMedication(BaseModel):
    name: str = Field(description="Generic or brand name of medication")
    form: Literal["tablet", "capsule", "syrup", "injection", "drops", "inhaler", "ointment", "other"] = Field("other")
    strength: Optional[str] = Field(None, description="e.g., 500mg, 250mg/5ml")
    dose_quantity: str = Field(description="Exact quantity prescribed, e.g., '2 tablespoons', '1 tablet', '0.5 tablet'")
    schedule: DosageTimingSchedule = Field(description="Extracted daily dosage schedule")
    duration_days: Optional[int] = Field(None, description="Prescribed duration in days")
    urdu_instruction: Optional[str] = Field(None, description="Clear plain Urdu translation of dosage")
    clinical_purpose: Optional[str] = Field(None, description="e.g., pain relief, infection, blood sugar")

class StructuredPrescriptionOutput(BaseModel):
    doctor_name: Optional[str] = Field(None, description="Name of the prescribing doctor")
    clinic_hospital_name: Optional[str] = Field(None, description="Name of the clinic or hospital")
    consultation_date: Optional[str] = Field(None, description="Date of the prescription in ISO format (YYYY-MM-DD) if available")
    diagnoses: List[str] = Field(default_factory=list, description="List of diagnosed conditions")
    medications: List[ParsedMedication] = Field(default_factory=list, description="List of prescribed medications")
    allergies: List[str] = Field(default_factory=list, description="List of recorded allergies")
    summary: Optional[str] = Field(None, description="Brief summary of the clinical note")
    raw_text: Optional[str] = Field(None, description="Raw OCR or extracted text from the document")

class StructuredLabReportOutput(BaseModel):
    doctor_name: Optional[str] = Field(None)
    clinic_hospital_name: Optional[str] = Field(None)
    consultation_date: Optional[str] = Field(None)
    biomarkers: List[Dict[str, Any]] = Field(default_factory=list, description="List of extracted lab biomarkers (test_name, category, value, unit, ref_min, ref_max, ref_range_text, status)")
    raw_text: Optional[str] = Field(None)

class StructuredRadiologyOutput(BaseModel):
    doctor_name: Optional[str] = Field(None)
    clinic_hospital_name: Optional[str] = Field(None)
    consultation_date: Optional[str] = Field(None)
    impression: Optional[str] = Field(None, description="Radiologist's conclusion or impression")
    findings: Optional[str] = Field(None, description="Detailed findings from the scan")
    raw_text: Optional[str] = Field(None)

class StructuredDischargeSummaryOutput(BaseModel):
    doctor_name: Optional[str] = Field(None)
    clinic_hospital_name: Optional[str] = Field(None)
    consultation_date: Optional[str] = Field(None)
    admission_date: Optional[str] = Field(None)
    discharge_date: Optional[str] = Field(None)
    diagnoses: List[str] = Field(default_factory=list)
    medications: List[ParsedMedication] = Field(default_factory=list)
    follow_up_instructions: List[str] = Field(default_factory=list)
    raw_text: Optional[str] = Field(None)
