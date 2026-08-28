# HealthVault AI — Voice Intent Resolution Agent
# Bilingual (Urdu/English) medical intent classifier with context-grounded responses.
# Uses pluggable LLM provider (DashScope Qwen / Gemini / Mock) with safety triage.

import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allergy import Allergy
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.voice import VoiceIntentResponse
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# Emergency keyword sets for safety triage (case-insensitive)
# ---------------------------------------------------------------------------
_EMERGENCY_KEYWORDS_EN = {
    "chest pain", "chest tightness", "difficulty breathing", "can't breathe",
    "cannot breathe", "shortness of breath", "unconscious", "fainted",
    "severe bleeding", "heavy bleeding", "anaphylaxis", "heart attack",
    "stroke", "seizure", "paralysis", "blue lips", "choking",
    "overdose", "suicidal", "poison",
}

_EMERGENCY_KEYWORDS_UR = {
    "سینے کا درد", "سانس لینے میں دشواری", "سانس نہیں",
    "بے ہوشی", "بے ہوش", "شدید خون", "دل کا دورہ",
    "فالج", "مرگی", "زہر", "اوور ڈوز",
}

# Valid intents the LLM may return
_VALID_INTENTS = {
    "medication_schedule",
    "dosage_inquiry",
    "symptom_triage",
    "emergency_sos",
    "general_inquiry",
}

# System prompt — token-optimised for single-pass JSON output
_SYSTEM_PROMPT = """\
Bilingual (Urdu/English) medical intent agent for HealthVault AI.

Classify intent (choose ONE): medication_schedule | dosage_inquiry | symptom_triage | emergency_sos | general_inquiry.

Rules:
- Ground answers in the patient's medical context provided.
- Emergency symptoms → intent=emergency_sos, requires_emergency_care=true.
- Provide answers in BOTH English (answer_en) and Urdu Nastaliq (answer_ur).
- Include medical disclaimer in both answers.
- RAW JSON only. No markdown, no explanation.

JSON keys: intent, entities_detected{medications_mentioned,symptoms_mentioned,dosages_mentioned}, answer_en, answer_ur, requires_emergency_care (bool), confidence (0-1).
"""


def _has_emergency_keywords(text: str) -> bool:
    """Return True if the query text contains emergency-indicating keywords."""
    text_lower = text.lower()
    for kw in _EMERGENCY_KEYWORDS_EN:
        if kw in text_lower:
            return True
    # Check Urdu keywords (Unicode comparison)
    for kw in _EMERGENCY_KEYWORDS_UR:
        if kw in text:
            return True
    return False


class VoiceIntentAgent:
    """Bilingual voice intent resolver with patient-context grounding."""

    @staticmethod
    async def resolve_intent(
        db: AsyncSession,
        user_id: UUID,
        query_text: str,
    ) -> VoiceIntentResponse:
        """Classify intent and generate a context-grounded bilingual response.

        Args:
            db: Async database session.
            user_id: Patient UUID.
            query_text: Transcribed voice query (Urdu or English).

        Returns:
            VoiceIntentResponse with intent, entities, bilingual answers.

        Raises:
            ValueError: If the user is not found.
        """
        # 1. Fetch patient context --------------------------------------------------
        user, active_meds, allergies, diagnoses = await _fetch_patient_context(
            db, user_id
        )
        if not user:
            raise ValueError(f"No user found with id '{user_id}'")

        patient_context = _build_patient_context_json(
            user, active_meds, allergies, diagnoses
        )

        # 2. Pre-check: emergency keyword triage -----------------------------------
        pre_emergency = _has_emergency_keywords(query_text)

        # 3. Build user prompt — compact context + query
        user_prompt = (
            f"Patient Context: {patient_context}\n"
            f"Voice Query: \"{query_text}\""
        )

        # 4. Invoke LLM provider ---------------------------------------------------
        llm = get_llm_provider()
        raw_result = await llm.generate_json(
            prompt=user_prompt,
            system_prompt=_SYSTEM_PROMPT,
        )

        # 5. Parse and validate ----------------------------------------------------
        response = _parse_llm_response(raw_result, query_text, pre_emergency)

        return response


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

async def _fetch_patient_context(
    db: AsyncSession,
    user_id: UUID,
) -> tuple:
    """Fetch user, active medications, allergies, and diagnoses."""
    user = await db.scalar(select(User).where(User.id == user_id))

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

    # Extract unique diagnoses from medical records
    diagnoses: List[str] = []
    seen: set = set()
    for rec in records:
        ext = rec.extracted_data or {}
        for dx in ext.get("diagnoses", []):
            if dx and dx not in seen:
                seen.add(dx)
                diagnoses.append(dx)

    return user, active_meds, allergies, diagnoses


def _build_patient_context_json(
    user: Optional[User],
    active_meds: List[Medication],
    allergies: List[Allergy],
    diagnoses: List[str],
) -> str:
    """Serialize patient context into a JSON string for the LLM prompt."""
    context = {
        "patient_name": user.full_name if user else "Unknown",
        "blood_group": user.blood_group if user else None,
        "active_medications": [
            {"name": m.name, "dosage": m.dosage, "frequency": m.frequency, "timing": m.timing}
            for m in active_meds
        ],
        "known_allergies": [
            {"allergen": a.allergen, "severity": a.severity}
            for a in allergies
        ],
        "past_diagnoses": diagnoses,
    }
    return json.dumps(context, ensure_ascii=False)


def _parse_llm_response(
    raw: Dict[str, Any],
    query_text: str,
    pre_emergency: bool,
) -> VoiceIntentResponse:
    """Validate LLM output and construct the final response.

    Falls back to a safe default if the LLM returned empty/invalid data.
    Enforces emergency_sos override when keywords are detected.
    """
    if not raw:
        return _build_fallback_response(query_text, pre_emergency)

    # Extract fields with safe defaults
    intent = str(raw.get("intent", "general_inquiry")).strip()
    if intent not in _VALID_INTENTS:
        intent = "general_inquiry"

    entities = raw.get("entities_detected", {})
    if not isinstance(entities, dict):
        entities = {}

    answer_en = str(raw.get("answer_en", "")).strip()
    answer_ur = str(raw.get("answer_ur", "")).strip()
    requires_emergency = bool(raw.get("requires_emergency_care", False))
    confidence = raw.get("confidence", 0.0)

    # Clamp confidence to [0, 1]
    try:
        confidence = max(0.0, min(1.0, float(confidence)))
    except (TypeError, ValueError):
        confidence = 0.0

    # Emergency override: if keywords detected, force emergency_sos
    if pre_emergency:
        intent = "emergency_sos"
        requires_emergency = True
        confidence = max(confidence, 0.9)

    # Ensure we have answers (fallback if LLM returned empty strings)
    if not answer_en or not answer_ur:
        fallback = _build_fallback_response(query_text, pre_emergency)
        answer_en = answer_en or fallback.answer_en
        answer_ur = answer_ur or fallback.answer_ur

    return VoiceIntentResponse(
        intent=intent,
        entities_detected=entities,
        answer_en=answer_en,
        answer_ur=answer_ur,
        requires_emergency_care=requires_emergency,
        confidence=confidence,
    )


def _build_fallback_response(
    query_text: str,
    is_emergency: bool,
) -> VoiceIntentResponse:
    """Deterministic fallback when LLM returns empty/invalid data."""
    if is_emergency:
        return VoiceIntentResponse(
            intent="emergency_sos",
            entities_detected={"symptoms_mentioned": [query_text[:100]]},
            answer_en=(
                "This appears to be a medical emergency. Please call emergency "
                "services (1122 in Pakistan) or go to the nearest hospital immediately. "
                "This is not a substitute for professional medical care."
            ),
            answer_ur=(
                "یہ ایک طبی ہنگامی صورتحال لگ رہی ہے۔ براہ کرم فوری طور پر ایمبولینس "
                "(پاکستان میں 1122) کو کال کریں یا قریب ترین ہسپتال جائیں۔ "
                "یہ پیشہ ورانہ طبی دیکھ بھال کا متبادل نہیں ہے۔"
            ),
            requires_emergency_care=True,
            confidence=0.85,
        )

    return VoiceIntentResponse(
        intent="general_inquiry",
        entities_detected={},
        answer_en=(
            "Thank you for your query. Based on your health records, I recommend "
            "consulting your doctor for personalized advice. This is informational "
            "only and not a substitute for professional medical consultation."
        ),
        answer_ur=(
            "آپ کی_query کا شکریہ۔ آپ کے طبی ریکارڈ کی بنیاد پر، میں ذاتی مشورے کے "
            "لیے اپنے ڈاکٹر سے مشورہ کرنے کی تجویز دیتا/دیتی ہوں۔ یہ صرف معلوماتی "
            "ہے اور پیشہ ورانہ طبی مشورے کا متبادل نہیں ہے۔"
        ),
        requires_emergency_care=False,
        confidence=0.5,
    )
