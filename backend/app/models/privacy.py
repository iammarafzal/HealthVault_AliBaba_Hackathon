# HealthVault AI — Privacy Settings ORM Model
# Normalized 1-to-1 table for granular triage flags linked to users

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class PrivacySettings(Base):
    __tablename__ = "privacy_settings"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        primary_key=True,
        nullable=False,
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
    show_emergency_notes: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true"
    )
    emergency_notes: Mapped[str | None] = mapped_column(
        String(250), nullable=True
    )
    enable_scan_alerts: Mapped[bool] = mapped_column(
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

