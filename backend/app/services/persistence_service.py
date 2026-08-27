# HealthVault AI — Entity Persistence Service
# Structured entity persistence into PostgreSQL via async SQLAlchemy

from datetime import date
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allergy import Allergy
from app.models.biomarker import Biomarker
from app.models.medication import Medication
from app.models.record import MedicalRecord

logger = logging.getLogger("healthvault")


class EntityPersistenceService:
    """Atomic persistence of extracted medical entities into PostgreSQL."""

    async def save_extracted_entities(
        self,
        db: AsyncSession,
        user_id: UUID,
        record_id: UUID,
        document_type: str,
        extracted_data: Dict[str, Any],
    ) -> Dict[str, Any]:
        """Persist extracted entities into PostgreSQL in a single transaction.

        Args:
            db: Async SQLAlchemy session
            user_id: Patient UUID
            record_id: Medical record UUID
            document_type: "prescription" | "lab_report" | "discharge_summary"
            extracted_data: Structured extraction from LangGraph agent

        Returns:
            Aggregated response with counts of saved entities
        """
        try:
            # 1) Update medical_records with extracted_data and metadata
            await self._update_medical_record(db, record_id, extracted_data)

            # 2) Bulk insert medications
            medications_saved = await self._insert_medications(
                db, user_id, record_id, extracted_data.get("medications", [])
            )

            # 3) Upsert allergies (avoid duplicates per user)
            allergies_saved = await self._upsert_allergies(
                db, user_id, extracted_data.get("allergies", [])
            )

            # 4) Insert biomarkers (only for lab reports)
            biomarkers_saved = 0
            if document_type == "lab_report":
                biomarkers = extracted_data.get(
                    "biomarkers", extracted_data.get("lab_biomarkers", [])
                )
                biomarkers_saved = await self._insert_biomarkers(
                    db, user_id, record_id, biomarkers
                )

            await db.commit()

            logger.info(
                "Persisted entities for record %s: medications=%d, allergies=%d, biomarkers=%d",
                record_id,
                medications_saved,
                allergies_saved,
                biomarkers_saved,
            )

            return {
                "medications_saved": medications_saved,
                "allergies_saved": allergies_saved,
                "biomarkers_saved": biomarkers_saved,
            }

        except Exception as exc:
            logger.exception("Entity persistence failed: %s", exc)
            await db.rollback()
            raise

    async def _update_medical_record(
        self, db: AsyncSession, record_id: UUID, extracted_data: Dict[str, Any]
    ) -> None:
        """Update medical_records with extracted_data and metadata."""
        result = await db.execute(
            select(MedicalRecord).where(MedicalRecord.id == record_id)
        )
        record = result.scalar_one_or_none()

        if not record:
            logger.error("MedicalRecord %s not found for update", record_id)
            return

        # Update extracted_data JSONB
        record.extracted_data = extracted_data

        # Update metadata fields if present
        if extracted_data.get("doctor_name"):
            record.doctor_name = str(extracted_data["doctor_name"])
        if extracted_data.get("hospital_name"):
            record.hospital_name = str(extracted_data["hospital_name"])

        consultation_date_val = extracted_data.get("consultation_date")
        if isinstance(consultation_date_val, str) and consultation_date_val:
            try:
                record.consultation_date = date.fromisoformat(consultation_date_val)
            except ValueError:
                logger.warning("Invalid consultation_date format: %s", consultation_date_val)
        elif isinstance(consultation_date_val, date):
            record.consultation_date = consultation_date_val

        db.add(record)
        await db.flush()

    async def _insert_medications(
        self,
        db: AsyncSession,
        user_id: UUID,
        record_id: UUID,
        medications: List[Dict[str, Any]],
    ) -> int:
        """Bulk insert medications linked to user and record."""
        if not medications:
            return 0

        count = 0
        for med_data in medications:
            if not med_data.get("name"):
                continue

            medication = Medication(
                user_id=user_id,
                record_id=record_id,
                name=str(med_data.get("name", "")),
                dosage=str(med_data.get("dosage", "")),
                frequency=str(med_data.get("frequency", "")),
                timing=med_data.get("timing"),
                instructions_en=med_data.get("instructions_en"),
                instructions_ur=med_data.get("instructions_ur"),
                is_active=med_data.get("is_active", True),
            )
            db.add(medication)
            count += 1

        await db.flush()
        return count

    async def _upsert_allergies(
        self, db: AsyncSession, user_id: UUID, allergies: List[Dict[str, Any]]
    ) -> int:
        """Upsert allergies: update if allergen exists for user, else insert."""
        if not allergies:
            return 0

        # Fetch existing allergies for this user
        result = await db.execute(
            select(Allergy).where(Allergy.user_id == user_id)
        )
        existing_allergies = {
            allergy.allergen.lower(): allergy for allergy in result.scalars().all()
        }

        saved_count = 0
        for allergy_data in allergies:
            allergen = str(allergy_data.get("allergen", "")).strip()
            if not allergen:
                continue

            allergen_lower = allergen.lower()
            if allergen_lower in existing_allergies:
                existing = existing_allergies[allergen_lower]
                existing.severity = str(allergy_data.get("severity", "moderate"))
                existing.reaction_details = allergy_data.get("reaction_details")
                db.add(existing)
            else:
                new_allergy = Allergy(
                    user_id=user_id,
                    allergen=allergen,
                    severity=str(allergy_data.get("severity", "moderate")),
                    reaction_details=allergy_data.get("reaction_details"),
                )
                db.add(new_allergy)
                existing_allergies[allergen_lower] = new_allergy

            saved_count += 1

        await db.flush()
        return saved_count

    async def _insert_biomarkers(
        self,
        db: AsyncSession,
        user_id: UUID,
        record_id: UUID,
        biomarkers: List[Dict[str, Any]],
    ) -> int:
        """Bulk insert biomarkers linked to user and record."""
        if not biomarkers:
            return 0

        count = 0
        for bio_data in biomarkers:
            name = bio_data.get("biomarker_name")
            if not name:
                continue

            test_date_val = bio_data.get("test_date")
            if isinstance(test_date_val, str) and test_date_val:
                try:
                    parsed_date = date.fromisoformat(test_date_val)
                except ValueError:
                    parsed_date = date.today()
            elif isinstance(test_date_val, date):
                parsed_date = test_date_val
            else:
                parsed_date = date.today()

            try:
                numeric_val = float(bio_data.get("value", 0.0))
            except (ValueError, TypeError):
                numeric_val = 0.0

            ref_min = bio_data.get("reference_min")
            ref_max = bio_data.get("reference_max")

            biomarker = Biomarker(
                user_id=user_id,
                record_id=record_id,
                biomarker_name=str(name),
                value=numeric_val,
                unit=str(bio_data.get("unit", "")),
                reference_min=float(ref_min) if ref_min is not None else None,
                reference_max=float(ref_max) if ref_max is not None else None,
                status=str(bio_data.get("status", "normal")),
                test_date=parsed_date,
            )
            db.add(biomarker)
            count += 1

        await db.flush()
        return count


persistence_service = EntityPersistenceService()
