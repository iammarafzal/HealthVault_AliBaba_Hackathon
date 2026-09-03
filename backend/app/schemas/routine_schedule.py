# HealthVault AI — Patient Routine Schedule Schemas
# Defines validation schemas for meal timings (Breakfast, Lunch, Dinner) and reminder offsets

import uuid
from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict, Field

TIME_REGEX = r"^([01]\d|2[0-3]):([0-5]\d)$"


class RoutineScheduleBase(BaseModel):
    breakfast_time: str = Field(
        "08:00",
        pattern=TIME_REGEX,
        description="Breakfast time in HH:MM (24-hour) format",
    )
    lunch_time: str = Field(
        "13:30",
        pattern=TIME_REGEX,
        description="Lunch time in HH:MM (24-hour) format",
    )
    dinner_time: str = Field(
        "20:30",
        pattern=TIME_REGEX,
        description="Dinner time in HH:MM (24-hour) format",
    )
    reminder_lead_minutes: int = Field(
        15,
        ge=0,
        le=120,
        description="Alert lead time in minutes before meal or dose time",
    )
    timezone: str = Field(
        "Asia/Karachi",
        description="User's primary local timezone name (IANA format)",
    )


class RoutineScheduleUpdate(BaseModel):
    breakfast_time: Optional[str] = Field(
        None,
        pattern=TIME_REGEX,
        description="Breakfast time in HH:MM (24-hour) format",
    )
    lunch_time: Optional[str] = Field(
        None,
        pattern=TIME_REGEX,
        description="Lunch time in HH:MM (24-hour) format",
    )
    dinner_time: Optional[str] = Field(
        None,
        pattern=TIME_REGEX,
        description="Dinner time in HH:MM (24-hour) format",
    )
    reminder_lead_minutes: Optional[int] = Field(
        None,
        ge=0,
        le=120,
        description="Alert lead time in minutes before meal or dose time",
    )
    timezone: Optional[str] = Field(
        None,
        description="User's primary local timezone name (IANA format)",
    )


class RoutineScheduleResponse(RoutineScheduleBase):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    user_id: uuid.UUID
    updated_at: datetime
