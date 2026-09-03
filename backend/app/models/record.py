# HealthVault AI — Medical Record ORM Model
# Maps to PostgreSQL 'medical_records' table

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Any, List, Optional

from sqlalchemy import Date, DateTime, ForeignKey, String, Text, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.biomarker import Biomarker
    from app.models.medication import Medication
    from app.models.user import User


class MedicalRecord(Base):
    __tablename__ = "medical_records"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    document_type: Mapped[str] = mapped_column(String(32), nullable=False)
    document_url: Mapped[str] = mapped_column(Text, nullable=False)
    raw_ocr_text: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    extracted_data: Mapped[Any] = mapped_column(
        JSONB, nullable=False, default=dict, server_default=text("'{}'::jsonb")
    )
    consultation_date: Mapped[Optional[date]] = mapped_column(Date, nullable=True)
    doctor_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    hospital_name: Mapped[Optional[str]] = mapped_column(String(160), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="medical_records")
    medications: Mapped[List["Medication"]] = relationship(
        "Medication", back_populates="record"
    )
    biomarkers: Mapped[List["Biomarker"]] = relationship(
        "Biomarker", back_populates="record", cascade="all, delete-orphan"
    )
