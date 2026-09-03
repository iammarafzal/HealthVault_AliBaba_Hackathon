# HealthVault AI — Zero-Login Emergency Profile Service
# Token-gated emergency medical summary with privacy-aware filtering.
# Filtering is delegated to PrivacyFilterService for deterministic, pure logic.

from datetime import datetime, timezone
import logging
import secrets
from typing import List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allergy import Allergy
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_scan import EmergencyScanLog
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.emergency import EmergencyAccessResponse, EmergencyProfileResponse
from app.schemas.user import PrivacySettings
from app.services.privacy_service import PrivacyFilterService

logger = logging.getLogger("healthvault")


class EmergencyService:
    """Fetches and privacy-filters a patient's emergency profile
    for zero-login public access (QR code / paramedic scenarios)."""

    # ------------------------------------------------------------------
    # Token-gated entry-point (dual-identifier: health_id + emergency_token)
    # ------------------------------------------------------------------
    @staticmethod
    async def get_emergency_profile_with_token(
        db: AsyncSession,
        health_id: str,
        provided_token: str,
        ip_address: str = "unknown",
        user_agent: str = "unknown",
        city: Optional[str] = None,
    ) -> EmergencyAccessResponse:
        """Return a privacy-filtered emergency profile after validating both
        the health_id and the emergency_token.

        Raises:
            ValueError: If the health_id does not match any user.
            PermissionError: If the token does not match (constant-time comparison).
            RuntimeError: If emergency_enabled is False or qr_revoked is True.
        """

        # 1. Lookup user by health_id
        user: Optional[User] = await db.scalar(
            select(User).where(User.health_id == health_id)
        )
        if not user:
            raise ValueError(f"No user found with health_id '{health_id}'")

        # 2. Check emergency_enabled flag
        if not user.emergency_enabled:
            raise RuntimeError("Emergency access is disabled for this user.")

        # 3. Fetch privacy settings and check qr_revoked
        privacy_orm = await PrivacyFilterService.get_user_privacy_settings(
            db=db, user_id=user.id
        )
        if privacy_orm.qr_revoked:
            raise RuntimeError("Emergency QR has been revoked for this user.")

        # 4. Constant-time token comparison (prevents timing attacks)
        stored_token = user.emergency_token or ""
        if not secrets.compare_digest(stored_token, provided_token):
            raise PermissionError("Token mismatch")

        # 5. Convert ORM → Pydantic PrivacySettings
        privacy = PrivacySettings.model_validate(privacy_orm, from_attributes=True)

        # 6. Record Emergency Scan Audit Log
        try:
            scan_log = EmergencyScanLog(
                user_id=user.id,
                ip_address=ip_address or "unknown",
                user_agent=user_agent or "unknown",
                city=city,
                scanned_at=datetime.now(timezone.utc),
            )
            db.add(scan_log)
            await db.flush()
            logger.info(
                "Recorded EmergencyScanLog for user %s from IP %s (UA: %s)",
                user.id,
                ip_address,
                user_agent[:60] if user_agent else "",
            )
        except Exception as exc:
            logger.warning("Failed to record EmergencyScanLog: %s", exc)

        # 7. Dispatch Scan Alert if enabled in privacy settings
        if privacy.enable_scan_alerts:
            contacts = user.emergency_contacts or []
            timestamp_str = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M:%S UTC")
            location_info = f" ({city})" if city else ""
            alert_msg = (
                f"[EMERGENCY SCAN ALERT] Your HealthVault Emergency QR for "
                f"{user.full_name or user.health_id} was scanned at {timestamp_str} "
                f"from IP {ip_address}{location_info}."
            )
            logger.warning(
                "DISPATCHING SMS ALERT to %d contacts: %s",
                len(contacts),
                alert_msg,
            )

        # 8. Fetch medical data
        active_meds_orm, severe_allergies_orm, records = await _fetch_medical_data(
            db, user.id
        )

        # 9. Format ORM objects into display strings
        active_meds: List[str] = [
            f"{m.name} {m.dosage}" for m in active_meds_orm
        ]
        allergies: List[str] = [
            f"{a.allergen} ({a.severity})" for a in severe_allergies_orm
        ]
        chronic_conditions: List[str] = _extract_chronic_conditions(records)

        # 10. Resolve profile data from User
        full_name = getattr(user, "full_name", "") or ""
        blood_group = getattr(user, "blood_group", None)
        
        # Load contacts from emergency_contacts table first
        ec_stmt = (
            select(EmergencyContact)
            .where(EmergencyContact.user_id == user.id)
            .order_by(EmergencyContact.is_primary.desc(), EmergencyContact.priority_order.asc())
        )
        ec_res = await db.scalars(ec_stmt)
        db_contacts = ec_res.all()

        if db_contacts:
            contacts_data = [
                {
                    "id": str(c.id),
                    "name": c.name,
                    "relation": c.relation,
                    "phone": c.phone,
                    "is_primary": c.is_primary,
                    "priority_order": c.priority_order,
                }
                for c in db_contacts
            ]
        else:
            contacts_data = [
                {
                    "id": c.get("id") if isinstance(c, dict) else getattr(c, "id", None),
                    "name": c.get("name") if isinstance(c, dict) else getattr(c, "name", ""),
                    "relation": c.get("relation") if isinstance(c, dict) else getattr(c, "relation", ""),
                    "phone": c.get("phone") if isinstance(c, dict) else getattr(c, "phone", ""),
                    "is_primary": c.get("is_primary", idx == 0) if isinstance(c, dict) else getattr(c, "is_primary", idx == 0),
                    "priority_order": c.get("priority_order", idx + 1) if isinstance(c, dict) else getattr(c, "priority_order", idx + 1),
                }
                for idx, c in enumerate(user.emergency_contacts or [])
            ]

        # 11. Delegate filtering to PrivacyFilterService (pure, deterministic)
        filtered = PrivacyFilterService.filter_emergency_data(
            raw_user_health_id=user.health_id,
            raw_user_full_name=full_name,
            raw_user_blood_group=blood_group,
            raw_user_emergency_contacts=contacts_data,
            privacy_settings=privacy,
            active_meds=active_meds,
            allergies=allergies,
            chronic_conditions=chronic_conditions,
        )

        # 12. Return as EmergencyAccessResponse
        return EmergencyAccessResponse(
            health_id=filtered.health_id,
            full_name=filtered.full_name,
            blood_group=filtered.blood_group,
            critical_allergies=filtered.critical_allergies,
            active_medications=filtered.active_medications,
            chronic_conditions=filtered.chronic_conditions,
            emergency_contacts=filtered.emergency_contacts,
            emergency_notes=filtered.emergency_notes,
        )

    # -----------------------------------------------------------------------
    # Public Read (Legacy / Health ID only)
    # -----------------------------------------------------------------------

    @staticmethod
    async def get_emergency_profile_by_health_id(
        db: AsyncSession,
        health_id: str,
    ) -> EmergencyProfileResponse:
        """Fetch the public emergency view using only the health_id.

        Respects the same privacy controls as the dual-identifier view.
        """
        user: Optional[User] = await db.scalar(
            select(User).where(User.health_id == health_id)
        )
        if not user:
            raise ValueError(f"No user found with health_id '{health_id}'")

        privacy_orm = await PrivacyFilterService.get_user_privacy_settings(
            db=db, user_id=user.id
        )

        privacy = PrivacySettings.model_validate(privacy_orm, from_attributes=True)

        if privacy.qr_revoked:
            full_name = getattr(user, "full_name", "") or ""
            return EmergencyProfileResponse(
                health_id=health_id,
                full_name=full_name,
                is_revoked=True,
            )

        active_meds_orm, severe_allergies_orm, records = await _fetch_medical_data(
            db, user.id
        )

        active_meds: List[str] = [
            f"{m.name} {m.dosage}" for m in active_meds_orm
        ]
        allergies: List[str] = [
            f"{a.allergen} ({a.severity})" for a in severe_allergies_orm
        ]
        chronic_conditions: List[str] = _extract_chronic_conditions(records)

        # Resolve profile data from User
        full_name = getattr(user, "full_name", "") or ""
        blood_group = getattr(user, "blood_group", None)
        contacts_data = [
            {
                "name": c.get("name") if isinstance(c, dict) else getattr(c, "name", ""),
                "relation": c.get("relation") if isinstance(c, dict) else getattr(c, "relation", ""),
                "phone": c.get("phone") if isinstance(c, dict) else getattr(c, "phone", ""),
            }
            for c in (user.emergency_contacts or [])
        ]

        return PrivacyFilterService.filter_emergency_data(
            raw_user_health_id=user.health_id,
            raw_user_full_name=full_name,
            raw_user_blood_group=blood_group,
            raw_user_emergency_contacts=contacts_data,
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
