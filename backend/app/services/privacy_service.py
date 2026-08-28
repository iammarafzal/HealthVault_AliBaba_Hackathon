# HealthVault AI — Privacy Filter Service
# Deterministic, pure filtering layer for emergency profile data.
# Guarantees zero data leakage: unpermitted fields NEVER bypass the filter.

import logging
import random
import string
from typing import List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.user import PrivacySettings as PrivacySettingsORM
from app.models.user import User
from app.schemas.emergency import EmergencyProfileResponse
from app.schemas.user import EmergencyContact, PrivacySettings, PrivacySettingsUpdate

logger = logging.getLogger("healthvault")


class PrivacyFilterService:
    """Pure, deterministic privacy filtering for emergency profile data.

    This service is the single source of truth for applying granular
    visibility controls. It contains no side-effects and performs no
    database I/O in its filter method, ensuring zero data leakage.
    """

    # ------------------------------------------------------------------
    # Core filter — pure function, no DB access
    # ------------------------------------------------------------------
    @staticmethod
    def filter_emergency_data(
        raw_user_health_id: str,
        raw_user_full_name: str,
        raw_user_blood_group: str | None,
        raw_user_emergency_contacts: list,
        privacy_settings: PrivacySettings,
        active_meds: List[str],
        allergies: List[str],
        chronic_conditions: List[str],
    ) -> EmergencyProfileResponse:
        """Apply privacy flags and return a filtered EmergencyProfileResponse.

        Args:
            raw_user_health_id: Patient health identifier.
            raw_user_full_name: Patient full name (always visible).
            raw_user_blood_group: Patient blood group or None.
            raw_user_emergency_contacts: Raw JSONB list of contact dicts.
            privacy_settings: Validated PrivacySettings Pydantic model.
            active_meds: Pre-formatted medication strings ["Name dosage", ...].
            allergies: Pre-formatted allergy strings ["Allergen (severity)", ...].
            chronic_conditions: Pre-formatted diagnosis strings.

        Returns:
            EmergencyProfileResponse with fields masked per privacy flags.
        """

        # Revocation short-circuit — mask ALL medical and contact data
        if privacy_settings.qr_revoked:
            return EmergencyProfileResponse(
                health_id=raw_user_health_id,
                full_name=raw_user_full_name,
                is_revoked=True,
            )

        # Granular visibility controls
        blood_group: str | None = (
            raw_user_blood_group if privacy_settings.show_blood_group else None
        )

        critical_allergies: List[str] = (
            allergies if privacy_settings.show_allergies else []
        )

        active_medications: List[str] = (
            active_meds if privacy_settings.show_active_meds else []
        )

        conditions: List[str] = (
            chronic_conditions if privacy_settings.show_chronic_conditions else []
        )

        emergency_contacts: List[EmergencyContact] = []
        if privacy_settings.show_emergency_contacts:
            for contact_data in raw_user_emergency_contacts or []:
                if isinstance(contact_data, dict):
                    emergency_contacts.append(
                        EmergencyContact(
                            name=contact_data.get("name", ""),
                            relation=contact_data.get("relation", ""),
                            phone=contact_data.get("phone", ""),
                        )
                    )

        return EmergencyProfileResponse(
            health_id=raw_user_health_id,
            full_name=raw_user_full_name,
            blood_group=blood_group,
            critical_allergies=critical_allergies,
            active_medications=active_medications,
            chronic_conditions=conditions,
            emergency_contacts=emergency_contacts,
            is_revoked=False,
        )

    # ------------------------------------------------------------------
    # DB helpers — privacy settings CRUD
    # ------------------------------------------------------------------
    @staticmethod
    async def get_user_privacy_settings(
        db: AsyncSession,
        user_id: UUID,
    ) -> PrivacySettingsORM:
        """Fetch privacy settings for *user_id*, creating defaults if absent.

        Returns:
            PrivacySettings ORM instance (never None).
        """
        privacy: PrivacySettingsORM | None = await db.scalar(
            select(PrivacySettingsORM).where(
                PrivacySettingsORM.user_id == user_id
            )
        )
        if not privacy:
            privacy = PrivacySettingsORM(
                user_id=user_id,
                show_blood_group=True,
                show_allergies=True,
                show_active_meds=True,
                show_chronic_conditions=True,
                show_emergency_contacts=True,
                qr_revoked=False,
            )
            db.add(privacy)
            await db.flush()
            logger.info("Created default PrivacySettings for user %s", user_id)

        return privacy

    @staticmethod
    async def update_user_privacy_settings(
        db: AsyncSession,
        user_id: UUID,
        update_data: PrivacySettingsUpdate,
    ) -> PrivacySettingsORM:
        """Apply partial updates to a user's privacy settings.

        Only explicitly provided (non-None) fields are written.
        Returns the updated PrivacySettings ORM instance.

        Raises:
            ValueError: If no privacy settings row exists for *user_id*.
        """
        privacy: PrivacySettingsORM | None = await db.scalar(
            select(PrivacySettingsORM).where(
                PrivacySettingsORM.user_id == user_id
            )
        )
        if not privacy:
            raise ValueError(
                f"No privacy settings found for user_id '{user_id}'"
            )

        # Apply only the fields that were explicitly set
        update_dict = update_data.model_dump(exclude_unset=True)
        for field, value in update_dict.items():
            setattr(privacy, field, value)

        await db.flush()
        logger.info("Updated PrivacySettings for user %s: %s", user_id, update_dict)

        return privacy

    # ------------------------------------------------------------------
    # QR regeneration
    # ------------------------------------------------------------------
    @staticmethod
    async def regenerate_health_id(
        db: AsyncSession,
        user_id: UUID,
    ) -> User:
        """Generate a new unique health_id for the user, invalidating any prior QR codes.

        The new ID follows the format ``HV-PAK-XXXXX`` where ``XXXXX`` is 5
        random alphanumeric characters (uppercase + digits).

        After regeneration the ``qr_revoked`` flag is reset to ``False`` so
        the new QR code is immediately active.

        Raises:
            ValueError: If the user does not exist.
        """
        user: User | None = await db.scalar(
            select(User).where(User.id == user_id)
        )
        if not user:
            raise ValueError(f"No user found with id '{user_id}'")

        # Generate a collision-free health_id
        new_health_id = await PrivacyFilterService._generate_unique_health_id(db)
        user.health_id = new_health_id

        # Reset revocation so the new QR is immediately usable
        privacy = await PrivacyFilterService.get_user_privacy_settings(db, user_id)
        privacy.qr_revoked = False

        await db.flush()
        logger.info(
            "Regenerated health_id for user %s: %s → %s",
            user_id,
            user.health_id,
            new_health_id,
        )

        return user

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    @staticmethod
    async def _generate_unique_health_id(db: AsyncSession) -> str:
        """Return a collision-free ``HV-PAK-XXXXX`` string.

        Tries up to 10 random candidates before giving up (extremely unlikely).
        """
        charset = string.ascii_uppercase + string.digits
        for _ in range(10):
            suffix = "".join(random.choices(charset, k=5))
            candidate = f"HV-PAK-{suffix}"
            existing = await db.scalar(
                select(User).where(User.health_id == candidate)
            )
            if not existing:
                return candidate

        raise RuntimeError("Failed to generate a unique health_id after 10 attempts")
