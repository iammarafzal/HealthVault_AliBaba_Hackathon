# HealthVault AI — Doctor Summary Pydantic Schemas
# DoctorSummaryResponse

from typing import List

from pydantic import BaseModel


class DoctorSummaryResponse(BaseModel):
    patient_name: str
    health_id: str
    age_gender: str
    blood_group: str
    active_diagnoses: List[str]
    current_medications: List[str]
    known_allergies: List[str]
    surgical_history: List[str]
    recent_abnormal_biomarkers: List[str]
    risk_factors: List[str]
    clinical_notes: str
