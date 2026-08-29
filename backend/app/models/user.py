# HealthVault AI — User ORM Model
# Maps to PostgreSQL 'users' and 'privacy_settings' tables

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any, List, Optional

from sqlalchemy import (
    Boolean,
    Date,
    DateTime,
    ForeignKey,
    String,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.allergy import Allergy
    from app.models.biomarker import Biomarker
    from app.models.medication import Medication
    from app.models.record import MedicalRecord


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
    full_name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(
        String(255), unique=True, nullable=True
    )
    phone: Mapped[str] = mapped_column(String(32), nullable=False)
    hashed_password: Mapped[Optional[str]] = mapped_column(
        String(255), nullable=True
    )
    role: Mapped[str] = mapped_column(
        String(20), nullable=False, default="patient", server_default="patient"
    )
    blood_group: Mapped[Optional[str]] = mapped_column(String(8), nullable=True)
    date_of_birth: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    gender: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)
    emergency_contacts: Mapped[Any] = mapped_column(
        JSONB, default=list, server_default="'[]'::jsonb"
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    privacy_settings: Mapped[Optional["PrivacySettings"]] = relationship(
        "PrivacySettings", back_populates="user", uselist=False, cascade="all, delete-orphan"
    )
    medical_records: Mapped[List["MedicalRecord"]] = relationship(
        "MedicalRecord", back_populates="user", cascade="all, delete-orphan"
    )
    medications: Mapped[List["Medication"]] = relationship(
        "Medication", back_populates="user", cascade="all, delete-orphan"
    )
    allergies: Mapped[List["Allergy"]] = relationship(
        "Allergy", back_populates="user", cascade="all, delete-orphan"
    )
    biomarkers: Mapped[List["Biomarker"]] = relationship(
        "Biomarker", back_populates="user", cascade="all, delete-orphan"
    )


class PrivacySettings(Base):
    __tablename__ = "privacy_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
    )
    show_blood_group: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    show_allergies: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    show_active_meds: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    show_chronic_conditions: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    show_emergency_contacts: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    qr_revoked: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false"
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="privacy_settings")
