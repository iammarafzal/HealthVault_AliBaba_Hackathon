# HealthVault AI — User ORM Model
# Core user identity, profile vitals, and emergency settings matching PostgreSQL schema

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, List, Optional

from sqlalchemy import Boolean, Date, DateTime, String, func
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.allergy import Allergy
    from app.models.biomarker import Biomarker
    from app.models.emergency_contact import EmergencyContact
    from app.models.emergency_scan import EmergencyScanLog
    from app.models.medication import Medication, MedicationDoseLog
    from app.models.notification import PushSubscription
    from app.models.privacy import PrivacySettings
    from app.models.record import MedicalRecord
    from app.models.user_schedule import PatientRoutineSchedule


class User(Base):
    __tablename__ = "users"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    health_id: Mapped[str] = mapped_column(
        String(16), unique=True, nullable=False, index=True
    )
    full_name: Mapped[str] = mapped_column(
        String(120), nullable=False, default="", server_default=""
    )
    email: Mapped[str] = mapped_column(
        String(255), unique=True, nullable=False, index=True
    )
    phone: Mapped[Optional[str]] = mapped_column(
        String(32), nullable=True
    )
    hashed_password: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="patient", server_default="patient"
    )
    blood_group: Mapped[Optional[str]] = mapped_column(
        String(8), nullable=True
    )
    date_of_birth: Mapped[Optional[date]] = mapped_column(
        Date, nullable=True
    )
    gender: Mapped[Optional[str]] = mapped_column(
        String(16), nullable=True
    )
    emergency_contacts: Mapped[Optional[List[dict]]] = mapped_column(
        JSONB, default=list, server_default="[]"
    )
    emergency_enabled: Mapped[bool] = mapped_column(
        Boolean, nullable=False, default=True, server_default="true"
    )
    emergency_token: Mapped[Optional[str]] = mapped_column(
        String(64), unique=True, index=True, nullable=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # ── Relationships ──────────────────────────────────────────────
    privacy_settings: Mapped[Optional["PrivacySettings"]] = relationship(
        "PrivacySettings",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
    medical_records: Mapped[List["MedicalRecord"]] = relationship(
        "MedicalRecord", back_populates="user", cascade="all, delete-orphan"
    )
    medications: Mapped[List["Medication"]] = relationship(
        "Medication", back_populates="user", cascade="all, delete-orphan"
    )
    medication_dose_logs: Mapped[List["MedicationDoseLog"]] = relationship(
        "MedicationDoseLog", back_populates="user", cascade="all, delete-orphan"
    )
    allergies: Mapped[List["Allergy"]] = relationship(
        "Allergy", back_populates="user", cascade="all, delete-orphan"
    )
    biomarkers: Mapped[List["Biomarker"]] = relationship(
        "Biomarker", back_populates="user", cascade="all, delete-orphan"
    )
    emergency_scans: Mapped[List["EmergencyScanLog"]] = relationship(
        "EmergencyScanLog", back_populates="user", cascade="all, delete-orphan", order_by="desc(EmergencyScanLog.scanned_at)"
    )
    ice_contacts: Mapped[List["EmergencyContact"]] = relationship(
        "EmergencyContact", back_populates="user", cascade="all, delete-orphan", order_by="desc(EmergencyContact.is_primary), EmergencyContact.priority_order"
    )
    push_subscriptions: Mapped[List["PushSubscription"]] = relationship(
        "PushSubscription", back_populates="user", cascade="all, delete-orphan"
    )
    routine_schedule: Mapped[Optional["PatientRoutineSchedule"]] = relationship(
        "PatientRoutineSchedule",
        back_populates="user",
        uselist=False,
        cascade="all, delete-orphan",
        lazy="selectin",
    )
