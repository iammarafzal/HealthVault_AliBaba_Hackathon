# HealthVault AI — User Pydantic Schemas
# Unified User, UserProfile, PrivacySettings, QR, and Emergency Toggle schemas

import re
from datetime import date, datetime
from typing import Any, List, Optional
from uuid import UUID

from pydantic import BaseModel, ConfigDict, EmailStr, Field, computed_field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Emergency Contacts
# ---------------------------------------------------------------------------
class EmergencyContactBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=100, examples=["Ali Raza"])
    relation: str = Field(..., min_length=2, max_length=50, examples=["Son"])
    phone: str = Field(..., min_length=7, max_length=30, examples=["+92-300-1234567"])
    is_primary: bool = False
    priority_order: int = 1
    contact_health_id: Optional[str] = Field(None, max_length=100, description="HealthVault ID or email of contact")

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: str) -> str:
        cleaned = re.sub(r"[^\d+]", "", v.strip())
        if len(cleaned) < 7:
            raise ValueError("Invalid phone number format")
        return v.strip()


class EmergencyContactCreate(EmergencyContactBase):
    """Input schema for creating a new emergency contact."""
    pass


class EmergencyContactUpdate(BaseModel):
    """Partial update schema for editing an emergency contact."""
    name: Optional[str] = Field(None, min_length=2, max_length=100)
    relation: Optional[str] = Field(None, min_length=2, max_length=50)
    phone: Optional[str] = Field(None, min_length=7, max_length=30)
    is_primary: Optional[bool] = None
    priority_order: Optional[int] = None
    contact_health_id: Optional[str] = Field(None, max_length=100)

    @field_validator("phone")
    @classmethod
    def validate_phone(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        cleaned = re.sub(r"[^\d+]", "", v.strip())
        if len(cleaned) < 7:
            raise ValueError("Invalid phone number format")
        return v.strip()


class EmergencyContactResponse(EmergencyContactBase):
    """Serialized emergency contact returned to the client."""
    id: Optional[UUID] = None
    user_id: Optional[UUID] = None
    contact_health_id: Optional[str] = None
    contact_user_id: Optional[UUID] = None
    linked_user_id: Optional[UUID] = None
    is_linked: bool = False

    model_config = ConfigDict(from_attributes=True)


# ---------------------------------------------------------------------------
# User Profile (vitals & demographics)
# ---------------------------------------------------------------------------
class UserProfileResponse(BaseModel):
    """Vitals and demographics nested inside UserResponse."""
    full_name: str = ""
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    emergency_contacts: List[dict] = []
    notified_ice_id: Optional[UUID] = None

    model_config = ConfigDict(from_attributes=True)


class UserProfileUpdate(BaseModel):
    """Partial update payload for the profile update flow."""
    full_name: Optional[str] = None
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    emergency_contacts: Optional[List[dict]] = None
    notified_ice_id: Optional[UUID] = None


# ---------------------------------------------------------------------------
# Privacy Settings
# ---------------------------------------------------------------------------
class PrivacySettings(BaseModel):
    """Internal Pydantic mirror of the PrivacySettings ORM row."""
    show_blood_group: bool = True
    show_allergies: bool = True
    show_active_meds: bool = True
    show_chronic_conditions: bool = True
    show_emergency_contacts: bool = True
    show_emergency_notes: bool = True
    emergency_notes: Optional[str] = Field(
        None,
        max_length=250,
        description="Concise directive for first responders under 250 characters",
    )
    enable_scan_alerts: bool = True
    enable_ice_scan_alerts: bool = True
    qr_revoked: bool = False
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("emergency_notes")
    @classmethod
    def validate_and_sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        # Replace multiple consecutive newlines, carriage returns, or tabs with a single space
        sanitized = re.sub(r"[\r\n\t]+", " ", v).strip()
        # Collapse multiple spaces into one
        sanitized = re.sub(r"\s{2,}", " ", sanitized)
        if len(sanitized) > 250:
            raise ValueError("Emergency notes must not exceed 250 characters.")
        return sanitized if sanitized else None

    @model_validator(mode="before")
    @classmethod
    def default_scan_alerts(cls, data: Any) -> Any:
        if hasattr(data, "__dict__"):
            if getattr(data, "enable_scan_alerts", None) is None:
                setattr(data, "enable_scan_alerts", True)
            if getattr(data, "enable_ice_scan_alerts", None) is None:
                setattr(data, "enable_ice_scan_alerts", True)
            if getattr(data, "show_emergency_notes", None) is None:
                setattr(data, "show_emergency_notes", True)
        elif isinstance(data, dict):
            if data.get("enable_scan_alerts") is None:
                data["enable_scan_alerts"] = True
            if data.get("enable_ice_scan_alerts") is None:
                data["enable_ice_scan_alerts"] = True
            if data.get("show_emergency_notes") is None:
                data["show_emergency_notes"] = True
        return data


class PrivacySettingsUpdate(BaseModel):
    """Partial update schema — all fields optional."""
    show_blood_group: Optional[bool] = None
    show_allergies: Optional[bool] = None
    show_active_meds: Optional[bool] = None
    show_chronic_conditions: Optional[bool] = None
    show_emergency_contacts: Optional[bool] = None
    show_emergency_notes: Optional[bool] = None
    emergency_notes: Optional[str] = None
    enable_scan_alerts: Optional[bool] = None
    enable_ice_scan_alerts: Optional[bool] = None
    qr_revoked: Optional[bool] = None

    @field_validator("emergency_notes")
    @classmethod
    def validate_and_sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        if v is None:
            return None
        sanitized = re.sub(r"[\r\n\t]+", " ", v).strip()
        sanitized = re.sub(r"\s{2,}", " ", sanitized)
        if len(sanitized) > 250:
            raise ValueError("Emergency notes must not exceed 250 characters.")
        return sanitized


class PrivacySettingsResponse(BaseModel):
    """Serialized current privacy flags returned to the client."""
    user_id: UUID
    show_blood_group: bool = True
    show_allergies: bool = True
    show_active_meds: bool = True
    show_chronic_conditions: bool = True
    show_emergency_contacts: bool = True
    show_emergency_notes: bool = True
    emergency_notes: Optional[str] = None
    enable_scan_alerts: bool = True
    enable_ice_scan_alerts: bool = True
    qr_revoked: bool = False
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

    @field_validator("emergency_notes")
    @classmethod
    def validate_and_sanitize_notes(cls, v: Optional[str]) -> Optional[str]:
        if not v:
            return None
        sanitized = re.sub(r"[\r\n\t]+", " ", v).strip()
        sanitized = re.sub(r"\s{2,}", " ", sanitized)
        if len(sanitized) > 250:
            raise ValueError("Emergency notes must not exceed 250 characters.")
        return sanitized if sanitized else None

    @model_validator(mode="before")
    @classmethod
    def default_scan_alerts(cls, data: Any) -> Any:
        if hasattr(data, "__dict__"):
            if getattr(data, "enable_scan_alerts", None) is None:
                setattr(data, "enable_scan_alerts", True)
            if getattr(data, "enable_ice_scan_alerts", None) is None:
                setattr(data, "enable_ice_scan_alerts", True)
            if getattr(data, "show_emergency_notes", None) is None:
                setattr(data, "show_emergency_notes", True)
        elif isinstance(data, dict):
            if data.get("enable_scan_alerts") is None:
                data["enable_scan_alerts"] = True
            if data.get("enable_ice_scan_alerts") is None:
                data["enable_ice_scan_alerts"] = True
            if data.get("show_emergency_notes") is None:
                data["show_emergency_notes"] = True
        return data


# ---------------------------------------------------------------------------
# Top-level User Response (returned by /auth/me, /user/profile, /auth/register)
# ---------------------------------------------------------------------------
class UserResponse(BaseModel):
    """Full user envelope including nested profile, privacy, and completeness."""
    id: UUID
    health_id: str
    email: EmailStr
    full_name: str = ""
    phone: Optional[str] = None
    blood_group: Optional[str] = None
    date_of_birth: Optional[date] = None
    gender: Optional[str] = None
    emergency_contacts: List[dict] = []
    emergency_enabled: bool = True
    notified_ice_id: Optional[UUID] = None
    role: str = "patient"
    profile: Optional[UserProfileResponse] = None
    privacy: Optional[PrivacySettingsResponse] = Field(default=None, validation_alias="privacy_settings")

    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    @model_validator(mode="before")
    @classmethod
    def build_nested_profile(cls, data: Any) -> Any:
        """Ensure profile sub-object is populated whether validating ORM or dict."""
        if hasattr(data, "__dict__") or not isinstance(data, dict):
            # ORM object
            full_name = getattr(data, "full_name", "") or ""
            phone = getattr(data, "phone", None)
            blood_group = getattr(data, "blood_group", None)
            date_of_birth = getattr(data, "date_of_birth", None)
            gender = getattr(data, "gender", None)
            contacts = getattr(data, "emergency_contacts", []) or []
            notified_ice_id = getattr(data, "notified_ice_id", None)
            privacy = getattr(data, "privacy_settings", None)

            profile_obj = UserProfileResponse(
                full_name=full_name,
                phone=phone,
                blood_group=blood_group,
                date_of_birth=date_of_birth,
                gender=gender,
                emergency_contacts=contacts,
                notified_ice_id=notified_ice_id,
            )

            privacy_obj = None
            if privacy:
                privacy_obj = PrivacySettingsResponse(
                    user_id=getattr(privacy, "user_id", getattr(data, "id", None)),
                    show_blood_group=getattr(privacy, "show_blood_group", True),
                    show_allergies=getattr(privacy, "show_allergies", True),
                    show_active_meds=getattr(privacy, "show_active_meds", True),
                    show_chronic_conditions=getattr(privacy, "show_chronic_conditions", True),
                    show_emergency_contacts=getattr(privacy, "show_emergency_contacts", True),
                    show_emergency_notes=getattr(privacy, "show_emergency_notes", True),
                    emergency_notes=getattr(privacy, "emergency_notes", None),
                    enable_scan_alerts=getattr(privacy, "enable_scan_alerts", True),
                    enable_ice_scan_alerts=getattr(privacy, "enable_ice_scan_alerts", True),
                    qr_revoked=getattr(privacy, "qr_revoked", False),
                    updated_at=getattr(privacy, "updated_at", None),
                )

            return {
                "id": getattr(data, "id", None),
                "health_id": getattr(data, "health_id", ""),
                "email": getattr(data, "email", ""),
                "full_name": full_name,
                "phone": phone,
                "blood_group": blood_group,
                "date_of_birth": date_of_birth,
                "gender": gender,
                "emergency_contacts": contacts,
                "emergency_enabled": getattr(data, "emergency_enabled", True),
                "notified_ice_id": notified_ice_id,
                "role": getattr(data, "role", "patient"),
                "profile": profile_obj,
                "privacy": privacy_obj,
            }
        elif isinstance(data, dict):
            if "profile" not in data or data["profile"] is None:
                data["profile"] = UserProfileResponse(
                    full_name=data.get("full_name", ""),
                    phone=data.get("phone"),
                    blood_group=data.get("blood_group"),
                    date_of_birth=data.get("date_of_birth"),
                    gender=data.get("gender"),
                    emergency_contacts=data.get("emergency_contacts", []) or [],
                )
            if "privacy" not in data and "privacy_settings" in data:
                data["privacy"] = data["privacy_settings"]
        return data

    @computed_field
    @property
    def profile_completeness(self) -> int:
        """Dynamically compute profile completeness as a percentage."""
        fields = [
            self.blood_group,
            self.phone,
            self.date_of_birth,
            self.gender,
        ]
        filled = sum(1 for f in fields if f is not None)
        has_contacts = len(self.emergency_contacts) > 0
        return int((filled + int(has_contacts)) / len(fields) * 100) if fields else 0


# ---------------------------------------------------------------------------
# QR Code & Emergency Toggle
# ---------------------------------------------------------------------------
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


class QRDetailsResponse(BaseModel):
    """Full QR code metadata returned to the authenticated user."""
    health_id: str
    emergency_token: str
    qr_url: str = Field(
        ...,
        examples=["http://localhost:8000/api/v1/emergency/HV-PAK-12345?token=abc123"],
    )
    emergency_enabled: bool


class EmergencyToggleRequest(BaseModel):
    """Body for toggling emergency access on/off."""
    emergency_enabled: bool


class EmergencyToggleResponse(BaseModel):
    """Returned after toggling emergency access."""
    health_id: Optional[str] = None
    emergency_enabled: bool
    message: str


# ---------------------------------------------------------------------------
# Account Management — Email, Password, Deletion
# ---------------------------------------------------------------------------
class UpdateEmailRequest(BaseModel):
    """Request body for changing the authenticated user's email address."""
    new_email: EmailStr = Field(..., examples=["patient@example.com"])
    current_password: str = Field(..., min_length=1)


class ChangePasswordRequest(BaseModel):
    """Request body for changing the authenticated user's password."""
    current_password: str = Field(..., min_length=1)
    new_password: str = Field(..., min_length=6)


class DeleteAccountRequest(BaseModel):
    """Request body for permanent account deletion."""
    password: str = Field(..., min_length=1)
    confirmation_phrase: str = Field(
        ...,
        min_length=1,
        description="Must be the literal string 'DELETE' to confirm.",
    )
