# HealthVault AI — AI Doctor Summary Agent
# Qwen-Max powered clinical briefing generator

import json
import logging
from datetime import date, datetime
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.mock_data import MOCK_DOCTOR_SUMMARY
from app.models.allergy import Allergy
from app.models.biomarker import Biomarker
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.summary import DoctorSummaryResponse
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# System prompt per AGENT_PROMPTS.md §2 — AI Doctor Summary Agent
# ---------------------------------------------------------------------------
_SUMMARY_SYSTEM_PROMPT = (
    "Chief Medical Officer generating a 10-second clinical patient summary. "
    "Synthesize records into JSON. Group active medications; highlight severe "
    "allergies and abnormal biomarkers. RAW JSON only—no markdown, no explanation."
)


class SummaryAgent:
    """Aggregates patient data from PostgreSQL and invokes the LLM provider
    to produce a structured 1-page clinical summary (DoctorSummaryResponse)."""

    # ------------------------------------------------------------------
    # Public entry-point
    # ------------------------------------------------------------------
    @staticmethod
    async def generate_clinical_summary(
        db: AsyncSession,
        user_id: UUID,
    ) -> DoctorSummaryResponse:
        """Build a 10-second clinical briefing for the given patient.

        Raises:
            ValueError: If the user_id does not exist in the database.
        """

        # 1. Fetch patient profile -------------------------------------------
        user = await db.scalar(select(User).where(User.id == user_id))
        if not user:
            raise ValueError(f"User {user_id} not found")

        # 2. Parallel data fetch (all independent queries) --------------------
        active_meds: List[Medication] = (
            await db.scalars(
                select(Medication).where(
                    Medication.user_id == user_id,
                    Medication.is_active.is_(True),
                )
            )
        ).all()

        allergies: List[Allergy] = (
            await db.scalars(
                select(Allergy).where(Allergy.user_id == user_id)
            )
        ).all()

        records: List[MedicalRecord] = (
            await db.scalars(
                select(MedicalRecord).where(MedicalRecord.user_id == user_id)
            )
        ).all()

        abnormal_biomarkers: List[Biomarker] = (
            await db.scalars(
                select(Biomarker).where(
                    Biomarker.user_id == user_id,
                    Biomarker.status != "normal",
                )
            )
        ).all()

        # 3. Aggregate into prompt context -----------------------------------
        patient_json = json.dumps({
            "full_name": user.full_name,
            "health_id": user.health_id,
            "date_of_birth": str(user.date_of_birth) if user.date_of_birth else None,
            "gender": user.gender or "unknown",
            "blood_group": user.blood_group or "N/A",
        }, default=str)

        vault_records_json = json.dumps(
            [
                {
                    "document_type": r.document_type,
                    "consultation_date": str(r.consultation_date) if r.consultation_date else None,
                    "diagnoses": (r.extracted_data or {}).get("diagnoses", []),
                    "doctor_name": r.doctor_name,
                    "hospital_name": r.hospital_name,
                }
                for r in records
            ],
            default=str,
        )

        biomarkers_json = json.dumps(
            [
                {
                    "biomarker_name": b.biomarker_name,
                    "value": float(b.value),
                    "unit": b.unit,
                    "status": b.status,
                    "test_date": str(b.test_date),
                }
                for b in abnormal_biomarkers
            ],
            default=str,
        )

        # 4. Build user prompt — compact context, no redundant schema re-statement
        user_prompt = (
            f"Patient: {patient_json}\n"
            f"Records: {vault_records_json}\n"
            f"Abnormal Biomarkers: {biomarkers_json}\n"
            "Output JSON with keys: patient_name, health_id, age_gender, blood_group, "
            "active_diagnoses, current_medications, known_allergies, surgical_history, "
            "recent_abnormal_biomarkers, risk_factors, clinical_notes."
        )

        # 5. Invoke LLM provider ---------------------------------------------
        provider = get_llm_provider()
        result: Dict[str, Any] = await provider.generate_json(
            prompt=user_prompt,
            system_prompt=_SUMMARY_SYSTEM_PROMPT,
        )

        # 6. Validate / fallback ---------------------------------------------
        if result and "patient_name" in result:
            return DoctorSummaryResponse(**result)

        # Fallback: build deterministic summary from raw DB data
        logger.warning(
            "LLM provider returned empty/invalid summary; building fallback from DB data"
        )
        return SummaryAgent._build_fallback_summary(
            user=user,
            active_meds=active_meds,
            allergies=allergies,
            records=records,
            abnormal_biomarkers=abnormal_biomarkers,
        )

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _compute_age(dob: Optional[date]) -> Optional[int]:
        """Calculate age from date_of_birth."""
        if not dob:
            return None
        today = date.today()
        age = today.year - dob.year
        if (today.month, today.day) < (dob.month, dob.day):
            age -= 1
        return age

    @staticmethod
    def _build_fallback_summary(
        user: User,
        active_meds: List[Medication],
        allergies: List[Allergy],
        records: List[MedicalRecord],
        abnormal_biomarkers: List[Biomarker],
    ) -> DoctorSummaryResponse:
        """Construct a DoctorSummaryResponse directly from DB rows
        when the LLM provider is unavailable or returns invalid data."""

        # Age + gender string
        age = SummaryAgent._compute_age(user.date_of_birth)
        gender_char = (user.gender or "unknown").capitalize()[0]
        age_gender = f"{age}{gender_char}" if age else f"Unknown-{user.gender or 'unknown'}"

        # Active diagnoses: de-duplicated from extracted_data across records
        diagnoses: List[str] = []
        surgical_history: List[str] = []
        seen_dx: set = set()
        for rec in records:
            ext = rec.extracted_data or {}
            for dx in ext.get("diagnoses", []):
                if dx and dx not in seen_dx:
                    seen_dx.add(dx)
                    diagnoses.append(dx)
            # Capture surgical history from discharge summaries
            if rec.document_type == "discharge_summary":
                proc = ext.get("procedures") or ext.get("surgical_history") or []
                surgical_history.extend(proc)

        # Current medications: "Name - Dosage"
        current_medications = [
            f"{m.name} {m.dosage}" for m in active_meds
        ]

        # Known allergies: "Allergen - Severity"
        known_allergies = [
            f"{a.allergen} ({a.severity})" for a in allergies
        ]

        # Recent abnormal biomarkers: "Name: Value Unit - Status"
        recent_abnormal = [
            f"{b.biomarker_name}: {float(b.value)} {b.unit} ({b.status})"
            for b in abnormal_biomarkers
        ]

        # Risk factors: derive from severe allergies + abnormal markers
        risk_factors: List[str] = []
        severe_allergies = [a for a in allergies if a.severity == "severe"]
        if severe_allergies:
            names = ", ".join(a.allergen for a in severe_allergies)
            risk_factors.append(f"Severe allergy risk: {names}")
        if any(b.status == "high" for b in abnormal_biomarkers):
            high_markers = [b.biomarker_name for b in abnormal_biomarkers if b.status == "high"]
            risk_factors.append(f"Elevated biomarkers requiring monitoring: {', '.join(high_markers)}")
        if len(diagnoses) >= 2:
            risk_factors.append("Multi-morbidity: concurrent chronic conditions identified")

        # Clinical notes: 1-paragraph executive summary
        notes_parts = [
            f"{age_gender} patient, blood group {user.blood_group or 'N/A'}."
        ]
        if diagnoses:
            notes_parts.append(f"Active diagnoses include {', '.join(diagnoses)}.")
        if current_medications:
            notes_parts.append(f"Currently on {len(current_medications)} active medication(s).")
        if known_allergies:
            notes_parts.append(f"Known allergies: {', '.join(known_allergies)}.")
        if recent_abnormal:
            notes_parts.append(f"{len(recent_abnormal)} abnormal biomarker(s) flagged for review.")
        clinical_notes = " ".join(notes_parts)

        return DoctorSummaryResponse(
            patient_name=user.full_name,
            health_id=user.health_id,
            age_gender=age_gender,
            blood_group=user.blood_group or "N/A",
            active_diagnoses=diagnoses,
            current_medications=current_medications,
            known_allergies=known_allergies,
            surgical_history=surgical_history,
            recent_abnormal_biomarkers=recent_abnormal,
            risk_factors=risk_factors,
            clinical_notes=clinical_notes,
        )
