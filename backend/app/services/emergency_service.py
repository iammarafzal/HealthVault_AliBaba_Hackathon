# HealthVault AI — Zero-Login Emergency Profile Service
# Token-gated emergency medical summary with privacy-aware filtering.
# Filtering is delegated to PrivacyFilterService for deterministic, pure logic.

from datetime import datetime, timezone, timedelta
import hashlib
import hmac
import logging
import secrets
from typing import List, Optional
from uuid import UUID

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.allergy import Allergy
from app.models.emergency_contact import EmergencyContact
from app.models.emergency_scan import EmergencyScanLog
from app.models.medication import Medication
from app.models.notification import Notification
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.emergency import EmergencyAccessResponse, EmergencyProfileResponse
from app.schemas.user import PrivacySettings
from app.services.privacy_service import PrivacyFilterService

logger = logging.getLogger("healthvault")


def get_secure_ntfy_topic_for_patient(patient_id: str) -> str:
    """Generate a deterministic but impossible-to-guess topic derived from the Patient ID and secret key."""
    key = settings.SECRET_KEY.encode()
    msg = f"ntfy-access-{patient_id}".encode()
    signature = hmac.new(key, msg, hashlib.sha256).hexdigest()
    return f"hv-{signature[:20]}"  # Ensure it is alphanumeric/short for ntfy


GEO_CACHE: dict = {}


async def reverse_geocode_coordinates(lat: float, lon: float) -> Optional[str]:
    """Reverse-geocode latitude & longitude into a readable location string via OpenStreetMap Nominatim API."""
    cache_key = f"{lat:.4f},{lon:.4f}"
    if cache_key in GEO_CACHE:
        return GEO_CACHE[cache_key]

    url = f"https://nominatim.openstreetmap.org/reverse?lat={lat}&lon={lon}&format=json"
    headers = {"User-Agent": "HealthVaultAI/1.0 (Emergency Response System)"}

    try:
        async with httpx.AsyncClient(timeout=3.5) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                addr = data.get("address", {})

                suburb = addr.get("suburb") or addr.get("neighbourhood") or addr.get("residential") or addr.get("road") or addr.get("quarter")
                city = addr.get("city") or addr.get("town") or addr.get("city_district") or addr.get("county") or addr.get("state_district")
                country = addr.get("country", "")

                parts = [p for p in [suburb, city, country] if p]
                if parts:
                    result = ", ".join(parts)
                else:
                    result = data.get("display_name", f"{lat:.4f}, {lon:.4f}")

                GEO_CACHE[cache_key] = result
                return result
    except Exception as exc:
        logger.warning("Reverse geocoding failed for %s, %s: %s", lat, lon, exc)

    fallback = f"{lat:.4f}, {lon:.4f}"
    GEO_CACHE[cache_key] = fallback
    return fallback


def parse_device_type(user_agent: str) -> str:
    """Parse device type string from client User-Agent header."""
    ua = (user_agent or "").lower()
    if any(k in ua for k in ["iphone", "android", "mobi", "ipod"]):
        return "Mobile"
    if any(k in ua for k in ["ipad", "tablet"]):
        return "Tablet"
    return "Desktop"


# In-memory dictionary tracking recent alert timestamps per health_id for 15s debounce
_RECENT_DISPATCH_TIMESTAMPS: dict[str, datetime] = {}

async def dispatch_emergency_scan_alert_to_ice(
    patient: User,  # The Patient (Father)
    notified_user: Optional[User] = None,  # The ICE Contact (Son)
    city: str = "Unknown",
    maps_url: Optional[str] = None,
    latitude: Optional[float] = None,
    longitude: Optional[float] = None,
    location_name: Optional[str] = None,
    is_gps_verified: bool = False,
) -> bool:
    """Dispatch real-time emergency scan alert to the designated ICE contact via ntfy.sh with a 15-second debounce window."""
    now = datetime.now(timezone.utc)
    health_id = patient.health_id or str(patient.id)
    last_sent = _RECENT_DISPATCH_TIMESTAMPS.get(health_id)

    # 15-second debounce window: drop duplicate trigger if fired within 15 seconds
    if last_sent and (now - last_sent) < timedelta(seconds=15):
        logger.info("Skipping duplicate scan alert for %s (15s debounce active)", health_id)
        return False

    _RECENT_DISPATCH_TIMESTAMPS[health_id] = now

    topic = get_secure_ntfy_topic_for_patient(str(patient.id))
    ntfy_url = f"https://ntfy.sh/{topic}"

    patient_name = patient.full_name or getattr(patient, "name", "") or health_id
    location_hint = f" near {city}" if city and city.lower() != "unknown" else ""

    if is_gps_verified or maps_url:
        loc_str = location_name or city or "Unknown Location"
        title = f"🚨 Emergency Scan: {patient_name}"
        body = f"📍 Precise GPS updated for {patient_name} near {loc_str}. Tap to view live location & timeline."
    else:
        title = f"🚨 Emergency Scan: {patient_name}"
        body = f"Medical ID card for {patient_name} was just scanned{location_hint}. Tap to view live location & timeline."

    click_target = maps_url or f"{settings.FRONTEND_URL}/emergency/activity?health_id={health_id}"

    headers = {
        "Title": title,
        "Priority": "urgent",
        "Tags": "rotating_light,hospital",
        "Click": click_target,
    }
    if maps_url:
        headers["Actions"] = f"view, View on Google Maps, {maps_url}"

    try:
        async with httpx.AsyncClient(timeout=4.0) as client:
            resp = await client.post(ntfy_url, content=body.encode("utf-8"), headers=headers)
            logger.info("Dispatched ntfy scan alert for patient %s to topic %s: status %s", patient.id, topic, resp.status_code)
            return resp.status_code == 200
    except Exception as exc:
        target_info = notified_user.id if notified_user else "designated ICE stream"
        logger.error("Failed to dispatch ntfy scan alert to ICE contact %s: %s", target_info, exc)
        return False


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
                device_type=parse_device_type(user_agent),
                city=city,
                location_name=city,
                is_gps_verified=False,
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
        if privacy.enable_scan_alerts and getattr(privacy, "enable_ice_scan_alerts", True):
            notified_user = None
            if user.notified_ice_id:
                notified_user = await db.scalar(
                    select(User).where(User.id == user.notified_ice_id)
                )

            # Trigger real-time dispatch specifically for the designated ICE contact
            dispatched = await dispatch_emergency_scan_alert_to_ice(
                patient=user,
                notified_user=notified_user,
                city=city or "Unknown",
            )

            # Auto-insert in-app EMERGENCY_SCAN notification for designated contact user (only if not debounced)
            if dispatched:
                target_user_id = notified_user.id if notified_user else None
                if not target_user_id and user.notified_ice_id:
                    target_user_id = user.notified_ice_id
                if not target_user_id:
                    bound_uid = await db.scalar(
                        select(EmergencyContact.contact_user_id).where(
                            EmergencyContact.user_id == user.id,
                            EmergencyContact.contact_user_id.isnot(None),
                        ).order_by(EmergencyContact.is_primary.desc())
                    )
                    target_user_id = bound_uid

                if target_user_id:
                    patient_name = user.full_name or "Family Member"
                    loc_hint = f" near {city}" if city and city.lower() != "unknown" else ""
                    scan_notif = Notification(
                        user_id=target_user_id,
                        type="EMERGENCY_SCAN",
                        title_en=f"🚨 Emergency Scan: {patient_name}",
                        title_ur=f"🚨 ہنگامی اسکین: {patient_name}",
                        message_en=f"Medical ID card for {patient_name} was just scanned{loc_hint}. Tap to view live location & timeline.",
                        message_ur=f"{patient_name} کا میڈیکل آئی ڈی کارڈ اسکین کیا گیا ہے۔ لائیو لوکیشن اور ٹائم لائن دیکھیں۔",
                        action_url=f"/emergency/activity?health_id={user.health_id}",
                        is_read=False,
                    )
                    db.add(scan_notif)
                    try:
                        await db.flush()
                    except Exception as notif_err:
                        logger.warning("Could not persist in-app EMERGENCY_SCAN notification: %s", notif_err)

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

    @staticmethod
    async def get_emergency_profile_by_session(
        db: AsyncSession,
        health_id: str,
    ) -> EmergencyAccessResponse:
        """Fetch privacy-filtered emergency medical profile for an active triage session.

        Does NOT dispatch scan alerts or create duplicate EmergencyScanLog records.
        """
        user: Optional[User] = await db.scalar(
            select(User).where(User.health_id == health_id)
        )
        if not user:
            raise ValueError(f"No user found with health_id '{health_id}'")

        if not user.emergency_enabled:
            raise RuntimeError("Emergency access is disabled for this user.")

        privacy_orm = await PrivacyFilterService.get_user_privacy_settings(
            db=db, user_id=user.id
        )
        if privacy_orm.qr_revoked:
            raise RuntimeError("Emergency QR has been revoked for this user.")

        privacy = PrivacySettings.model_validate(privacy_orm, from_attributes=True)

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

        full_name = getattr(user, "full_name", "") or ""
        blood_group = getattr(user, "blood_group", None)

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
