# HealthVault AI — Emergency Scan Log ORM Model
# Tracks paramedic/first responder emergency QR scans for real-time audit & ICE alert dispatch

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class EmergencyScanLog(Base):
    __tablename__ = "emergency_scan_logs"

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
    scanned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )
    ip_address: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )
    user_agent: Mapped[str] = mapped_column(
        String(512),
        nullable=False,
        default="unknown",
        server_default="unknown",
    )
    city: Mapped[Optional[str]] = mapped_column(
        String(128),
        nullable=True,
    )
    latitude: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    longitude: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    accuracy_meters: Mapped[Optional[float]] = mapped_column(
        Float,
        nullable=True,
    )
    maps_url: Mapped[Optional[str]] = mapped_column(
        String(500),
        nullable=True,
    )
    location_name: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    device_type: Mapped[Optional[str]] = mapped_column(
        String(100),
        nullable=True,
    )
    is_gps_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        server_default="false",
    )

    # ── Relationships ──────────────────────────────────────────────
    user: Mapped["User"] = relationship("User", back_populates="emergency_scans")

