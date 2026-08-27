# HealthVault AI — User Pydantic Schemas
# EmergencyContact, UserBase, UserCreate, UserResponse, PrivacySettings

from datetime import date, datetime
from typing import List, Optional
from uuid import UUID

from pydantic import BaseModel, EmailStr, Field


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

    class Config:
        from_attributes = True


class PrivacySettings(BaseModel):
    show_blood_group: bool = True
    show_allergies: bool = True
    show_active_meds: bool = True
    show_chronic_conditions: bool = True
    show_emergency_contacts: bool = True
    qr_revoked: bool = False
    updated_at: datetime

    class Config:
        from_attributes = True
