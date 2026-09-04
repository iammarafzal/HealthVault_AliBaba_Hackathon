# HealthVault AI — Emergency Triage Session ORM Model
# Ephemeral 15-minute device-locked session for emergency QR access

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


class EmergencyTriageSession(Base):
    __tablename__ = "emergency_triage_sessions"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    health_id: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        index=True,
    )
    session_token: Mapped[str] = mapped_column(
        String(128),
        unique=True,
        index=True,
        nullable=False,
    )
    device_fingerprint: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )
