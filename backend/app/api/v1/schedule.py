# HealthVault AI — Patient Routine Schedule API Endpoints
# Manages personalized daily routine and meal timings (Breakfast, Lunch, Dinner)

import logging
from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.user import User
from app.models.user_schedule import PatientRoutineSchedule
from app.schemas.routine_schedule import (
    RoutineScheduleResponse,
    RoutineScheduleUpdate,
)

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/user/routine-schedule", tags=["Routine Schedule"])


@router.get(
    "",
    response_model=RoutineScheduleResponse,
    status_code=status.HTTP_200_OK,
    summary="Get patient's routine meal schedule timings",
)
async def get_routine_schedule(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoutineScheduleResponse:
    """Retrieve the current patient's routine meal timings, creating defaults if not yet established."""
    stmt = select(PatientRoutineSchedule).where(
        PatientRoutineSchedule.user_id == current_user.id
    )
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()

    if not schedule:
        # Create standard defaults
        schedule = PatientRoutineSchedule(
            user_id=current_user.id,
            breakfast_time="08:00",
            lunch_time="13:30",
            dinner_time="20:30",
            reminder_lead_minutes=15,
            timezone="Asia/Karachi",
        )
        db.add(schedule)
        await db.commit()
        await db.refresh(schedule)
        logger.info(f"Initialized default routine schedule for user {current_user.id}")

    return schedule


@router.put(
    "",
    response_model=RoutineScheduleResponse,
    status_code=status.HTTP_200_OK,
    summary="Update patient's routine meal schedule timings",
)
async def update_routine_schedule(
    payload: RoutineScheduleUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> RoutineScheduleResponse:
    """Update patient routine meal timings, reminder lead minutes, or timezone."""
    stmt = select(PatientRoutineSchedule).where(
        PatientRoutineSchedule.user_id == current_user.id
    )
    result = await db.execute(stmt)
    schedule = result.scalar_one_or_none()

    if not schedule:
        schedule = PatientRoutineSchedule(
            user_id=current_user.id,
            breakfast_time=payload.breakfast_time or "08:00",
            lunch_time=payload.lunch_time or "13:30",
            dinner_time=payload.dinner_time or "20:30",
            reminder_lead_minutes=(
                payload.reminder_lead_minutes
                if payload.reminder_lead_minutes is not None
                else 15
            ),
            timezone=payload.timezone or "Asia/Karachi",
        )
        db.add(schedule)
    else:
        if payload.breakfast_time is not None:
            schedule.breakfast_time = payload.breakfast_time
        if payload.lunch_time is not None:
            schedule.lunch_time = payload.lunch_time
        if payload.dinner_time is not None:
            schedule.dinner_time = payload.dinner_time
        if payload.reminder_lead_minutes is not None:
            schedule.reminder_lead_minutes = payload.reminder_lead_minutes
        if payload.timezone is not None:
            schedule.timezone = payload.timezone

    await db.commit()
    await db.refresh(schedule)
    logger.info(f"Updated routine schedule for user {current_user.id}")

    return schedule
