# HealthVault AI — Emergency Pydantic Schemas
# EmergencyProfileResponse

from typing import List, Optional

from pydantic import BaseModel

from app.schemas.user import EmergencyContact


class EmergencyProfileResponse(BaseModel):
    health_id: str
    full_name: str
    blood_group: Optional[str] = None
    critical_allergies: List[str] = []
    active_medications: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contacts: List[EmergencyContact] = []
    is_revoked: bool = False
