# HealthVault AI — Patient Routine Schedule ORM Model
# Stores customized meal and dose routine timings (Breakfast, Lunch, Dinner) with timezone and offsets

import uuid
from datetime import datetime
from typing import TYPE_CHECKING, Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base

if TYPE_CHECKING:
    from app.models.user import User


class PatientRoutineSchedule(Base):
    __tablename__ = "patient_routine_schedules"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        primary_key=True,
        default=uuid.uuid4,
        server_default=func.gen_random_uuid(),
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    breakfast_time: Mapped[str] = mapped_column(
        String(5),
        default="08:00",
        server_default="08:00",
        nullable=False,
    )
    lunch_time: Mapped[str] = mapped_column(
        String(5),
        default="13:30",
        server_default="13:30",
        nullable=False,
    )
    dinner_time: Mapped[str] = mapped_column(
        String(5),
        default="20:30",
        server_default="20:30",
        nullable=False,
    )
    reminder_lead_minutes: Mapped[int] = mapped_column(
        Integer,
        default=15,
        server_default="15",
        nullable=False,
    )
    timezone: Mapped[str] = mapped_column(
        String(50),
        default="Asia/Karachi",
        server_default="Asia/Karachi",
        nullable=False,
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        default=func.now(),
        server_default=func.now(),
        onupdate=func.now(),
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="routine_schedule")
