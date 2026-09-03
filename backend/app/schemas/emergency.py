# HealthVault AI — Emergency Pydantic Schemas
# EmergencyProfileResponse, EmergencyAccessResponse

from typing import List, Optional

from pydantic import BaseModel

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


class EmergencyScanLogResponse(BaseModel):
    """Returned when listing audit scans for the authenticated user."""
    id: str
    scanned_at: str
    ip_address: str
    user_agent: str
    city: Optional[str] = None
