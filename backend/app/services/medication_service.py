# HealthVault AI — Medication Management Service
# Handles prescription versioning, active medication management, and invalidation.

import logging
import re
from collections import defaultdict
from datetime import date, datetime, timezone
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.medication import Medication, MedicationDoseLog
from app.models.record import MedicalRecord

logger = logging.getLogger("healthvault")



# ── Sig-string → schedule normaliser ────────────────────────────────

_SIG_MAP = [
    # Numeric sig: 1-0-0, 1-0-1, 1-1-0, 1-1-1, 0-0-1, 0-1-0
    (re.compile(r'^[12]\s*[-+]\s*0\s*[-+]\s*0'), {"morning": True, "afternoon": False, "evening": False}),
    (re.compile(r'^[12]\s*[-+]\s*0\s*[-+]\s*1'), {"morning": True, "afternoon": False, "evening": True}),
    (re.compile(r'^[12]\s*[-+]\s*1\s*[-+]\s*0'), {"morning": True, "afternoon": True, "evening": False}),
    (re.compile(r'^[12]\s*[-+]\s*1\s*[-+]\s*1'), {"morning": True, "afternoon": True, "evening": True}),
    (re.compile(r'^0\s*[-+]\s*0\s*[-+]\s*1'), {"morning": False, "afternoon": False, "evening": True}),
    (re.compile(r'^0\s*[-+]\s*1\s*[-+]\s*0'), {"morning": False, "afternoon": True, "evening": False}),
    (re.compile(r'^0\s*[-+]\s*1\s*[-+]\s*1'), {"morning": False, "afternoon": True, "evening": True}),
    # Two-part sig
    (re.compile(r'^1\s*[-+]\s*1$'), {"morning": True, "afternoon": False, "evening": True}),
    (re.compile(r'^1\s*[-+]\s*0$'), {"morning": True, "afternoon": False, "evening": False}),
    (re.compile(r'^0\s*[-+]\s*1$'), {"morning": False, "afternoon": False, "evening": True}),
]

_KEYWORD_MAP = [
    (["tds", "tid", "thrice"], {"morning": True, "afternoon": True, "evening": True}),
    (["bd", "bid", "twice"], {"morning": True, "afternoon": False, "evening": True}),
    (["od morning", "morning"], {"morning": True, "afternoon": False, "evening": False}),
    (["od noon", "noon", "afternoon", "lunch"], {"morning": False, "afternoon": True, "evening": False}),
    (["od night", "night", "evening", "bedtime", "bed"], {"morning": False, "afternoon": False, "evening": True}),
    # Urdu
    (["\u062a\u06cc\u0646 \u0628\u0627\u0631", "\u062a\u0646 \u0628\u0627\u0631"], {"morning": True, "afternoon": True, "evening": True}),
    (["\u062f\u0648 \u0628\u0627\u0631", "\u0635\u0628\u062d \u0648 \u0634\u0627\u0645"], {"morning": True, "afternoon": False, "evening": True}),
    (["\u0635\u0628\u062d \u06a9\u0648", "\u0635\u0628\u062d"], {"morning": True, "afternoon": False, "evening": False}),
    (["\u062f\u0648\u067e\u06be\u0631 \u06a9\u0648", "\u062f\u0648\u067e\u06be\u0631"], {"morning": False, "afternoon": True, "evening": False}),
    (["\u0634\u0627\u0645 \u06a9\u0648", "\u0631\u0627\u062a \u06a9\u0648", "\u0634\u0627\u0645", "\u0631\u0627\u062a"], {"morning": False, "afternoon": False, "evening": True}),
]


def _parse_sig_string(text: str) -> Optional[Dict[str, bool]]:
    """Try to extract morning/afternoon/evening from a sig or timing string."""
    lower = text.lower().strip()
    if not lower:
        return None
    for pattern, schedule in _SIG_MAP:
        if pattern.search(lower):
            return dict(schedule)
    for keywords, schedule in _KEYWORD_MAP:
        for kw in keywords:
            if kw.lower() in lower:
                return dict(schedule)
    return None


def _normalize_schedule(med: Medication) -> Optional[Dict[str, Any]]:
    """Ensure a medication has a well-formed dosage_schedule dict.

    If the stored JSONB already has at least one slot set, return it as-is.
    Otherwise, attempt to parse the `timing` / `frequency` strings.
    """
    sched = med.dosage_schedule
    if sched and isinstance(sched, dict):
        if sched.get("morning") or sched.get("afternoon") or sched.get("evening"):
            return sched

    # Fallback: parse timing + frequency strings
    combined = f"{med.timing or ''} {med.frequency or ''}".strip()
    parsed = _parse_sig_string(combined)
    if parsed:
        freq = sum([parsed["morning"], parsed["afternoon"], parsed["evening"]])
        return {
            "morning": parsed["morning"],
            "afternoon": parsed["afternoon"],
            "evening": parsed["evening"],
            "frequency_per_day": freq or 1,
            "meal_relation": "unspecified",
        }

    # If nothing could be parsed and no schedule exists, default to morning
    if not sched:
        return {
            "morning": True,
            "afternoon": False,
            "evening": False,
            "frequency_per_day": 1,
            "meal_relation": "unspecified",
        }

    return sched


class MedicationService:
    """Service for prescription versioning and active medication management."""

    # ── Ingestion invalidation ──────────────────────────────────────

    async def invalidate_older_prescriptions(
        self,
        db: AsyncSession,
        user_id: UUID,
        new_record_id: UUID,
        new_prescription_date: Optional[date] = None,
    ) -> int:
        """Deactivate all prior medications when a newer prescription is confirmed.

        If the new document has a prescription_date, only older prescriptions are
        invalidated.  Otherwise (date unknown), ALL prior medications for the user
        are deactivated to enforce the 'latest-only' rule.

        Returns the number of medications deactivated.
        """
        effective_date = new_prescription_date or date.today()

        # Find all medications for this user that belong to OTHER records
        # and are currently active.
        stmt = (
            update(Medication)
            .where(
                Medication.user_id == user_id,
                Medication.record_id != new_record_id,
                Medication.is_active.is_(True),
            )
            .values(is_active=False)
        )
        result = await db.execute(stmt)
        deactivated = result.rowcount  # type: ignore[attr-defined]

        if deactivated:
            logger.info(
                "Invalidated %d medications from older prescriptions for user %s "
                "(new record %s, prescription_date=%s)",
                deactivated,
                user_id,
                new_record_id,
                effective_date,
            )

        return deactivated

    # ── Query helpers ───────────────────────────────────────────────

    async def get_active_medications(
        self, db: AsyncSession, user_id: UUID
    ) -> List[Medication]:
        """Return only medications where is_active = True.

        Each medication's dosage_schedule is normalised so the frontend
        can rely on it for multi-slot window filtering.
        """
        stmt = (
            select(Medication)
            .where(
                Medication.user_id == user_id,
                Medication.is_active.is_(True),
            )
            .order_by(Medication.created_at.desc())
        )
        result = await db.execute(stmt)
        meds = list(result.scalars().all())

        # Normalise dosage_schedule for every medication
        for med in meds:
            med.dosage_schedule = _normalize_schedule(med)

        return meds

    async def get_all_medications_grouped(
        self, db: AsyncSession, user_id: UUID
    ) -> Dict[str, Any]:
        """Return all medications grouped by their source prescription record."""
        stmt = (
            select(Medication)
            .where(Medication.user_id == user_id)
            .order_by(Medication.created_at.desc())
        )
        result = await db.execute(stmt)
        all_meds = list(result.scalars().all())

        # Group by record_id
        groups: Dict[Optional[UUID], List[Medication]] = defaultdict(list)
        for med in all_meds:
            groups[med.record_id].append(med)

        # Enrich each group with record metadata
        enriched_groups = []
        for record_id, meds in groups.items():
            group_info: Dict[str, Any] = {
                "record_id": record_id,
                "prescription_date": None,
                "doctor_name": None,
                "hospital_name": None,
                "created_at": meds[0].created_at if meds else None,
                "medications": meds,
            }

            if record_id:
                rec_result = await db.execute(
                    select(MedicalRecord).where(MedicalRecord.id == record_id)
                )
                record = rec_result.scalar_one_or_none()
                if record:
                    group_info["prescription_date"] = record.consultation_date
                    group_info["doctor_name"] = record.doctor_name
                    group_info["hospital_name"] = record.hospital_name
                    group_info["created_at"] = record.created_at

            enriched_groups.append(group_info)

        active_count = sum(1 for m in all_meds if m.is_active)

        return {
            "user_id": user_id,
            "groups": enriched_groups,
            "total_medications": len(all_meds),
            "active_count": active_count,
        }

    # ── Toggle active ───────────────────────────────────────────────

    async def toggle_medication_active(
        self,
        db: AsyncSession,
        user_id: UUID,
        medication_id: UUID,
        is_active: bool,
    ) -> Optional[Medication]:
        """Toggle a single medication's is_active flag.

        Returns the updated Medication or None if not found / not owned.
        """
        stmt = select(Medication).where(
            Medication.id == medication_id,
            Medication.user_id == user_id,
        )
        result = await db.execute(stmt)
        med = result.scalar_one_or_none()
        if not med:
            return None

        med.is_active = is_active
        db.add(med)
        await db.commit()
        await db.refresh(med)
        return med

    # ── Manual add ──────────────────────────────────────────────────

    async def add_manual_medication(
        self,
        db: AsyncSession,
        user_id: UUID,
        name: str,
        dosage: str = "",
        frequency: str = "",
        timing: Optional[str] = None,
        dosage_schedule: Optional[Dict[str, Any]] = None,
        instructions_en: Optional[str] = None,
        instructions_ur: Optional[str] = None,
        is_active: bool = True,
    ) -> Medication:
        """Create a manually-entered medication (OTC / unlisted)."""
        med = Medication(
            user_id=user_id,
            record_id=None,  # manual — no linked prescription
            name=name,
            dosage=dosage,
            frequency=frequency,
            timing=timing,
            dosage_schedule=dosage_schedule,
            instructions_en=instructions_en,
            instructions_ur=instructions_ur,
            is_active=is_active,
        )
        db.add(med)
        await db.commit()
        await db.refresh(med)
        return med

    # ── Dose Logging (Today's adherence & persistence) ───────────────

    async def get_today_dose_logs(
        self,
        db: AsyncSession,
        user_id: UUID,
        target_date: Optional[date] = None,
    ) -> Dict[str, Any]:
        """Return all dose logs for the given user and date as a lookup dict."""
        effective_date = target_date or date.today()
        stmt = select(MedicationDoseLog).where(
            MedicationDoseLog.user_id == user_id,
            MedicationDoseLog.dose_date == effective_date,
        )
        result = await db.execute(stmt)
        logs = list(result.scalars().all())

        dose_map: Dict[str, bool] = {
            f"{log.medication_id}_{log.time_slot}": log.taken
            for log in logs
        }

        return {
            "dose_date": effective_date,
            "dose_logs": dose_map,
        }

    async def toggle_dose_log(
        self,
        db: AsyncSession,
        user_id: UUID,
        medication_id: UUID,
        time_slot: str,
        taken: bool,
        target_date: Optional[date] = None,
    ) -> MedicationDoseLog:
        """Upsert a dose log for a medication slot and date."""
        effective_date = target_date or date.today()
        stmt = select(MedicationDoseLog).where(
            MedicationDoseLog.user_id == user_id,
            MedicationDoseLog.medication_id == medication_id,
            MedicationDoseLog.time_slot == time_slot,
            MedicationDoseLog.dose_date == effective_date,
        )
        result = await db.execute(stmt)
        dose_log = result.scalar_one_or_none()

        now = datetime.now(timezone.utc)
        if dose_log:
            dose_log.taken = taken
            dose_log.taken_at = now if taken else None
        else:
            dose_log = MedicationDoseLog(
                user_id=user_id,
                medication_id=medication_id,
                dose_date=effective_date,
                time_slot=time_slot,
                taken=taken,
                taken_at=now if taken else None,
            )
            db.add(dose_log)

        await db.commit()
        await db.refresh(dose_log)
        return dose_log


medication_service = MedicationService()

