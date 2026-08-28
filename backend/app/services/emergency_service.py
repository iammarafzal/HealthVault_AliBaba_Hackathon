# HealthVault AI — Zero-Login Emergency Profile Service
# Public emergency medical summary with privacy-aware filtering.
# Filtering is delegated to PrivacyFilterService for deterministic, pure logic.

import logging
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allergy import Allergy
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.emergency import EmergencyProfileResponse
from app.schemas.user import PrivacySettings
from app.services.privacy_service import PrivacyFilterService

logger = logging.getLogger("healthvault")


class EmergencyService:
    """Fetches and privacy-filters a patient's emergency profile
    for zero-login public access (QR code / paramedic scenarios)."""

    # ------------------------------------------------------------------
    # Public entry-point
    # ------------------------------------------------------------------
    @staticmethod
    async def get_emergency_profile_by_health_id(
        db: AsyncSession,
        health_id: str,
    ) -> EmergencyProfileResponse:
        """Return a privacy-filtered emergency profile for *health_id*.

        Delegates all privacy filtering to PrivacyFilterService to
        guarantee deterministic, leak-proof output.

        Raises:
            ValueError: If the health_id does not match any user.
        """

        # 1. Lookup user by health_id -------------------------------------------------
        user: Optional[User] = await db.scalar(
            select(User).where(User.health_id == health_id)
        )
        if not user:
            raise ValueError(f"No user found with health_id '{health_id}'")

        # 2. Fetch or create privacy settings (delegated) -----------------------------
        privacy_orm = await PrivacyFilterService.get_user_privacy_settings(
            db=db, user_id=user.id
        )

        # 3. Convert ORM PrivacySettings → Pydantic PrivacySettings ------------------
        privacy = PrivacySettings.model_validate(privacy_orm, from_attributes=True)

        # 4. Revocation short-circuit (delegated to pure filter) ----------------------
        if privacy.qr_revoked:
            return EmergencyProfileResponse(
                health_id=health_id,
                full_name=user.full_name,
                is_revoked=True,
            )

        # 5. Fetch medical data -------------------------------------------------------
        active_meds_orm, severe_allergies_orm, records = await _fetch_medical_data(
            db, user.id
        )

        # 6. Format ORM objects into display strings ----------------------------------
        active_meds: List[str] = [
            f"{m.name} {m.dosage}" for m in active_meds_orm
        ]
        allergies: List[str] = [
            f"{a.allergen} ({a.severity})" for a in severe_allergies_orm
        ]
        chronic_conditions: List[str] = _extract_chronic_conditions(records)

        # 7. Delegate filtering to PrivacyFilterService (pure, deterministic) ---------
        return PrivacyFilterService.filter_emergency_data(
            raw_user_health_id=user.health_id,
            raw_user_full_name=user.full_name,
            raw_user_blood_group=user.blood_group,
            raw_user_emergency_contacts=user.emergency_contacts,
            privacy_settings=privacy,
            active_meds=active_meds,
            allergies=allergies,
            chronic_conditions=chronic_conditions,
        )


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

async def _fetch_medical_data(
    db: AsyncSession,
    user_id: UUID,
) -> tuple[List[Medication], List[Allergy], List[MedicalRecord]]:
    """Fetch active medications, severe allergies, and medical records for a user."""

    active_meds: List[Medication] = (
        await db.scalars(
            select(Medication).where(
                Medication.user_id == user_id,
                Medication.is_active.is_(True),
            )
        )
    ).all()

    # Include moderate and severe allergies for emergency relevance
    severe_allergies: List[Allergy] = (
        await db.scalars(
            select(Allergy).where(
                Allergy.user_id == user_id,
                Allergy.severity.in_(["moderate", "severe"]),
            )
        )
    ).all()

    records: List[MedicalRecord] = (
        await db.scalars(
            select(MedicalRecord).where(MedicalRecord.user_id == user_id)
        )
    ).all()

    return active_meds, severe_allergies, records


def _extract_chronic_conditions(records: List[MedicalRecord]) -> List[str]:
    """Extract unique diagnosis strings from medical records."""
    seen: set = set()
    conditions: List[str] = []
    for rec in records:
        ext = rec.extracted_data or {}
        for dx in ext.get("diagnoses", []):
            if dx and dx not in seen:
                seen.add(dx)
                conditions.append(dx)
    return conditions
