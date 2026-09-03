# HealthVault AI — Medication Management Routes
# GET  /api/v1/medications/all            — all medications grouped by prescription
# GET  /api/v1/medications/active         — active-only medications for the planner
# PATCH /api/v1/medications/{id}/toggle-active — toggle is_active flag
# POST /api/v1/medications/manual         — manually add an OTC / unlisted medicine

import logging
from datetime import date
from typing import Any, Dict, List
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.medication import MedicationDoseLog
from app.models.user import User
from app.schemas.medications import (
    ActiveMedicationsResponse,
    AllMedicationsResponse,
    ManualMedicationRequest,
    ManualMedicationResponse,
    ManualMedicationUpdate,
    MedicationDetailResponse,
    MedicationGroupResponse,
    TodayDoseLogsResponse,
    ToggleActiveRequest,
    ToggleActiveResponse,
    ToggleDoseLogRequest,
    ToggleDoseLogResponse,
)
from app.services.medication_service import medication_service
from app.services.notification_service import notification_service

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/medications", tags=["Medications"])


@router.get(
    "/doses/today",
    response_model=TodayDoseLogsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get today's dose logs for current user",
)
async def get_today_doses(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TodayDoseLogsResponse:
    """Return map of taken dose logs for today."""
    data = await medication_service.get_today_dose_logs(db, current_user.id)
    return TodayDoseLogsResponse(
        dose_date=data["dose_date"],
        dose_logs=data["dose_logs"],
    )


@router.post(
    "/doses/toggle",
    response_model=ToggleDoseLogResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle dose taken status for today",
)
async def toggle_dose(
    payload: ToggleDoseLogRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ToggleDoseLogResponse:
    """Record or update dose taken status."""
    log_entry = await medication_service.toggle_dose_log(
        db=db,
        user_id=current_user.id,
        medication_id=payload.medication_id,
        time_slot=payload.time_slot,
        taken=payload.taken,
        target_date=payload.dose_date,
    )

    # If marked taken, inspect if all active medications for this slot are now complete
    if payload.taken:
        try:
            effective_date = payload.dose_date or date.today()
            all_active = await medication_service.get_active_medications(db, current_user.id)
            slot_meds = [
                m for m in all_active
                if notification_service.is_medication_scheduled_for_slot(m, payload.time_slot)
            ]
            if slot_meds:
                slot_med_ids = [m.id for m in slot_meds]
                slot_alias = (
                    ["morning"]
                    if payload.time_slot == "morning"
                    else (["afternoon", "noon"] if payload.time_slot in ("afternoon", "noon") else ["night", "evening"])
                )
                stmt = select(MedicationDoseLog).where(
                    MedicationDoseLog.user_id == current_user.id,
                    MedicationDoseLog.dose_date == effective_date,
                    MedicationDoseLog.time_slot.in_(slot_alias),
                    MedicationDoseLog.medication_id.in_(slot_med_ids),
                    MedicationDoseLog.taken.is_(True),
                )
                res = await db.execute(stmt)
                taken_ids = {l.medication_id for l in res.scalars().all()}
                if set(slot_med_ids).issubset(taken_ids):
                    await notification_service.dismiss_slot_notification(
                        db=db,
                        user_id=current_user.id,
                        slot=payload.time_slot,
                        target_date=effective_date,
                    )
        except Exception as e:
            logger.warning(f"Error checking notification auto-dismissal: {e}")

    return ToggleDoseLogResponse(
        medication_id=log_entry.medication_id,
        time_slot=log_entry.time_slot,
        dose_date=log_entry.dose_date,
        taken=log_entry.taken,
        taken_at=log_entry.taken_at,
        message=f"Dose marked as {'taken' if log_entry.taken else 'pending'}.",
    )


def _build_detail_response(m) -> MedicationDetailResponse:
    slots = medication_service.extract_time_slots(m)
    detail = MedicationDetailResponse.model_validate(m)
    detail.is_manual = getattr(m, "is_manual", False) or (m.record_id is None)
    detail.time_slots = slots
    return detail


@router.get(
    "/active",
    response_model=ActiveMedicationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get active medications for the Daily Planner",
)
async def get_active_medications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ActiveMedicationsResponse:
    """Return only medications where is_active = True.

    Consumed directly by the Daily Medicine Planner to display
    the patient's current dosage schedule.
    """
    meds = await medication_service.get_active_medications(db, current_user.id)
    return ActiveMedicationsResponse(
        user_id=current_user.id,
        medications=[_build_detail_response(m) for m in meds],
        total=len(meds),
    )


@router.get(
    "/all",
    response_model=AllMedicationsResponse,
    status_code=status.HTTP_200_OK,
    summary="Get all medications grouped by prescription record",
)
async def get_all_medications(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> AllMedicationsResponse:
    """Return every medication across the patient's history, grouped by
    the prescription record they originated from.

    Each group includes the prescription date, doctor, and hospital so the
    frontend can display origin tags like 'From Prescription: Aug 24, 2024'.
    """
    data = await medication_service.get_all_medications_grouped(db, current_user.id)

    groups: List[MedicationGroupResponse] = []
    for g in data["groups"]:
        groups.append(
            MedicationGroupResponse(
                record_id=g["record_id"],
                prescription_date=g["prescription_date"],
                doctor_name=g["doctor_name"],
                hospital_name=g["hospital_name"],
                created_at=g["created_at"],
                medications=[
                    _build_detail_response(m)
                    for m in g["medications"]
                ],
            )
        )

    return AllMedicationsResponse(
        user_id=data["user_id"],
        groups=groups,
        total_medications=data["total_medications"],
        active_count=data["active_count"],
    )


@router.patch(
    "/{medication_id}/toggle-active",
    response_model=ToggleActiveResponse,
    status_code=status.HTTP_200_OK,
    summary="Toggle a medication's active / inactive status",
)
async def toggle_medication_active(
    medication_id: UUID,
    payload: ToggleActiveRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ToggleActiveResponse:
    """Flip the is_active flag for a single medication.

    The Daily Planner automatically reflects this change in real time
    because it queries only active medications.
    """
    med = await medication_service.toggle_medication_active(
        db=db,
        user_id=current_user.id,
        medication_id=medication_id,
        is_active=payload.is_active,
    )
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found or does not belong to this user.",
        )

    state_label = "activated" if payload.is_active else "deactivated"
    return ToggleActiveResponse(
        id=med.id,
        name=med.name,
        is_active=med.is_active,
        message=f"'{med.name}' has been {state_label}.",
    )


@router.post(
    "/manual",
    response_model=ManualMedicationResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Manually add an over-the-counter or unlisted medicine",
)
async def add_manual_medication(
    payload: ManualMedicationRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ManualMedicationResponse:
    """Add a medication that was not extracted from a prescription document.

    Useful for OTC drugs, supplements, or medicines the patient wants to
    track in the Daily Planner without a formal prescription.
    """
    schedule_dict = payload.dosage_schedule.model_dump() if payload.dosage_schedule else None

    med = await medication_service.add_manual_medication(
        db=db,
        user_id=current_user.id,
        name=payload.name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        timing=payload.timing,
        dosage_schedule=schedule_dict,
        time_slots=payload.time_slots,
        instructions_en=payload.instructions_en,
        instructions_ur=payload.instructions_ur,
        is_active=payload.is_active,
    )

    slots = medication_service.extract_time_slots(med)
    return ManualMedicationResponse(
        id=med.id,
        name=med.name,
        dosage=med.dosage,
        is_active=med.is_active,
        is_manual=True,
        time_slots=slots,
        message="Medication added successfully.",
    )


@router.put(
    "/manual/{medication_id}",
    response_model=ManualMedicationResponse,
    status_code=status.HTTP_200_OK,
    summary="Update a manually-entered medication",
)
async def update_manual_medication(
    medication_id: UUID,
    payload: ManualMedicationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> ManualMedicationResponse:
    """Update name, dosage, frequency, instructions, or time slots for a manual medication."""
    schedule_dict = payload.dosage_schedule.model_dump() if payload.dosage_schedule else None

    med = await medication_service.update_manual_medication(
        db=db,
        user_id=current_user.id,
        medication_id=medication_id,
        name=payload.name,
        dosage=payload.dosage,
        frequency=payload.frequency,
        timing=payload.timing,
        dosage_schedule=schedule_dict,
        time_slots=payload.time_slots,
        instructions_en=payload.instructions_en,
        instructions_ur=payload.instructions_ur,
        is_active=payload.is_active,
    )
    if not med:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Manual medication not found or not owned by user.",
        )

    slots = medication_service.extract_time_slots(med)
    return ManualMedicationResponse(
        id=med.id,
        name=med.name,
        dosage=med.dosage,
        is_active=med.is_active,
        is_manual=True,
        time_slots=slots,
        message="Medication updated successfully.",
    )


@router.delete(
    "/manual/{medication_id}",
    status_code=status.HTTP_200_OK,
    summary="Delete a manually-entered medication",
)
async def delete_manual_medication(
    medication_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> Dict[str, Any]:
    """Delete an OTC/manual medication and its associated dose logs."""
    success = await medication_service.delete_manual_medication(
        db=db,
        user_id=current_user.id,
        medication_id=medication_id,
    )
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Medication not found or cannot be deleted.",
        )

    return {"message": "Medication deleted successfully.", "id": str(medication_id)}
