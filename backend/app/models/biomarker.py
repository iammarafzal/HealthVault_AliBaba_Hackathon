# HealthVault AI — Biomarker ORM Model
# Maps to PostgreSQL 'biomarkers' time-series table for dynamic clinical analytes

import uuid
from datetime import date, datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Date, DateTime, ForeignKey, Index, Numeric, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.record import MedicalRecord
    from app.models.user import User


class Biomarker(Base):
    __tablename__ = "biomarkers"
    __table_args__ = (
        Index("idx_biomarkers_timeline", "user_id", "biomarker_name", "test_date"),
        Index("idx_biomarkers_category", "user_id", "category"),
    )

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
    record_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("medical_records.id", ondelete="CASCADE"),
        nullable=True,
    )
    biomarker_name: Mapped[str] = mapped_column(String(120), nullable=False)
    category: Mapped[str] = mapped_column(String(64), nullable=False, default="Other")
    value: Mapped[float] = mapped_column(Numeric(10, 2), nullable=False)
    value_text: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    unit: Mapped[str] = mapped_column(String(32), nullable=False, default="")
    reference_min: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    reference_max: Mapped[Optional[float]] = mapped_column(
        Numeric(10, 2), nullable=True
    )
    ref_range_text: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    status: Mapped[str] = mapped_column(String(16), nullable=False, default="normal")
    test_date: Mapped[date] = mapped_column(Date, nullable=False)
    lab_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="biomarkers")
    record: Mapped[Optional["MedicalRecord"]] = relationship(
        "MedicalRecord", back_populates="biomarkers"
    )
