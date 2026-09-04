# HealthVault AI — Push Subscription ORM Model
# Stores Web Push API subscriptions for authenticated browser clients

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import Boolean, DateTime, ForeignKey, String, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class PushSubscription(Base):
    __tablename__ = "push_subscriptions"

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
    endpoint: Mapped[str] = mapped_column(
        Text,
        unique=True,
        nullable=False,
    )
    p256dh: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    auth: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    user_agent: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="push_subscriptions")


class Notification(Base):
    """Persistent in-app notification for alerts, scan notices, and medicine reminders."""
    __tablename__ = "notifications"

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
    type: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="SYSTEM",
    )  # "EMERGENCY_SCAN", "DOSE_REMINDER", "INTERACTION_ALERT", "SYSTEM"
    title_en: Mapped[str] = mapped_column(String(200), nullable=False)
    title_ur: Mapped[str] = mapped_column(String(200), nullable=False)
    message_en: Mapped[str] = mapped_column(Text, nullable=False)
    message_ur: Mapped[str] = mapped_column(Text, nullable=False)
    action_url: Mapped[str] = mapped_column(String(255), nullable=False, default="/")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="notifications")
