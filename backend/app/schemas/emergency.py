# HealthVault AI — Emergency Pydantic Schemas
# EmergencyProfileResponse, EmergencyAccessResponse

from typing import List, Optional

from pydantic import BaseModel, computed_field

from app.schemas.user import EmergencyContactResponse


class EmergencyProfileResponse(BaseModel):
    """Legacy schema kept for backward compatibility."""
    health_id: str
    full_name: str
    blood_group: Optional[str] = None
    critical_allergies: List[str] = []
    active_medications: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contacts: List[EmergencyContactResponse] = []
    emergency_notes: Optional[str] = None
    is_revoked: bool = False


class EmergencyDocumentResponse(BaseModel):
    """Emergency document reference with ephemeral signed URL."""
    id: str
    document_type: str
    document_url: str
    signed_url: Optional[str] = None
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    consultation_date: Optional[str] = None
    created_at: Optional[str] = None


class EmergencyAccessResponse(BaseModel):
    """Returned by the token-gated public emergency endpoint."""
    health_id: str
    full_name: str
    blood_group: Optional[str] = None
    critical_allergies: List[str] = []
    active_medications: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contacts: List[EmergencyContactResponse] = []
    emergency_notes: Optional[str] = None
    is_revoked: bool = False
    documents: List[EmergencyDocumentResponse] = []


class EmergencySessionDataResponse(EmergencyAccessResponse):
    """Returned by the protected emergency triage session-data endpoint."""
    expires_in_seconds: int


class ScanLocationUpdate(BaseModel):
    """Payload sent by client when transmitting high-accuracy GPS coordinates."""
    latitude: float
    longitude: float
    accuracy_meters: Optional[float] = None


class EmergencyScanLogResponse(BaseModel):
    """Returned when listing audit scans for the authenticated user."""
    id: str
    scanned_at: str
    ip_address: str
    user_agent: str
    city: Optional[str] = None
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    accuracy_meters: Optional[float] = None
    maps_url: Optional[str] = None
    location_name: Optional[str] = None
    device_type: Optional[str] = None
    is_gps_verified: bool = False
    location: Optional[str] = None


class SharedAlertStreamResponse(BaseModel):
    """Returned by /api/v1/emergency/shared-alert-streams for ICE listeners."""
    patient_id: str = ""
    patient_name: str = ""
    topic: str
    health_id: Optional[str] = None

    @computed_field
    @property
    def patientName(self) -> str:
        return self.patient_name

    @computed_field
    @property
    def patientId(self) -> str:
        return self.patient_id

    @computed_field
    @property
    def healthId(self) -> Optional[str]:
        return self.health_id


