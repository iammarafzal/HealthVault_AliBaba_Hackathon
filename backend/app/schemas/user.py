# HealthVault AI — User Pydantic Schemas
# EmergencyContact, UserBase, UserCreate, UserResponse, PrivacySettings

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EmergencyContact(BaseModel):
    name: str = Field(..., examples=["Ali Khan"])
    relation: str = Field(..., examples=["Brother"])
    phone: str = Field(..., examples=["+92-300-1234567"])


class UserBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: str
    blood_group: Optional[str] = "B+"
    date_of_birth: Optional[date] = None
    gender: Optional[str] = "male"
    emergency_contacts: List[EmergencyContact] = []


class UserCreate(UserBase):
    password: str


class UserResponse(UserBase):
    id: UUID
    health_id: str
    role: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class PrivacySettings(BaseModel):
    show_blood_group: bool = True
    show_allergies: bool = True
    show_active_meds: bool = True
    show_chronic_conditions: bool = True
    show_emergency_contacts: bool = True
    qr_revoked: bool = False
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class PrivacySettingsUpdate(BaseModel):
    """Partial update schema — all fields optional."""
    show_blood_group: Optional[bool] = None
    show_allergies: Optional[bool] = None
    show_active_meds: Optional[bool] = None
    show_chronic_conditions: Optional[bool] = None
    show_emergency_contacts: Optional[bool] = None
    qr_revoked: Optional[bool] = None


class PrivacySettingsResponse(BaseModel):
    """Serialized current privacy flags returned to the client."""
    user_id: UUID
    show_blood_group: bool
    show_allergies: bool
    show_active_meds: bool
    show_chronic_conditions: bool
    show_emergency_contacts: bool
    qr_revoked: bool
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


class QRRegenerateRequest(BaseModel):
    """Request body for QR regeneration — identifies the authenticated user."""
    user_id: UUID


class QRRegenerateResponse(BaseModel):
    """Returned after a successful health_id regeneration."""
    health_id: str
    qr_data_url: str = Field(
        ...,
        examples=["http://localhost:8000/api/v1/emergency/HV-PAK-12345"],
    )
    created_at: datetime
