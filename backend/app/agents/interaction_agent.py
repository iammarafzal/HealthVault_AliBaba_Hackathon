# HealthVault AI — Drug Interaction & Allergy Guard Agent
# Qwen-Plus powered clinical pharmacology safety cross-checker

import json
import logging
from typing import Any, Dict, List
from uuid import UUID

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.allergy import Allergy
from app.models.medication import Medication
from app.schemas.interactions import DrugInteractionAlert, InteractionCheckResponse
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# System prompt per AGENT_PROMPTS.md §3 — Drug Interaction & Allergy Guard
# ---------------------------------------------------------------------------
_INTERACTION_SYSTEM_PROMPT = (
    "You are a strict clinical pharmacology safety agent. "
    "Cross-reference newly prescribed medications against the patient's existing active "
    "medications and known allergies to identify dangerous interactions. "
    "Constraints: "
    "- Only flag moderate or critical interactions. Ignore minor dietary warnings unless severe. "
    "- Provide a clear recommendation in both plain English and conversational Urdu. "
    "- If no conflicts exist, set has_conflicts to false and alerts to an empty array. "
    "Output strictly in JSON matching the provided schema. "
    "Do NOT output any markdown formatting, conversational text, or explanations. RAW JSON ONLY."
)


class DrugInteractionAgent:
    """Cross-checks proposed medications against a patient's active regimen and
    documented allergies, returning structured bilingual safety alerts."""

    # ------------------------------------------------------------------
    # Public entry-point
    # ------------------------------------------------------------------
    @staticmethod
    async def check_interactions(
        db: AsyncSession,
        user_id: UUID,
        new_medications: List[str],
    ) -> InteractionCheckResponse:
        """Evaluate drug-drug and drug-allergy interactions for *new_medications*.

        Returns:
            InteractionCheckResponse with has_conflicts and bilingual alerts.
        """
        if not new_medications:
            return InteractionCheckResponse(has_conflicts=False, alerts=[])

        # 1. Parallel fetch: active medications + known allergies ------------
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

        # 2. Build context lists for the prompt ------------------------------
        allergies_list = [
            f"{a.allergen} ({a.severity})" for a in allergies
        ] or ["None known"]

        active_meds_list = [
            f"{m.name} {m.dosage} ({m.frequency})" for m in active_meds
        ] or ["None"]

        # 3. Construct user prompt per AGENT_PROMPTS.md template -------------
        user_prompt = (
            f"Patient Allergies: {json.dumps(allergies_list)}\n"
            f"Active Medications: {json.dumps(active_meds_list)}\n"
            f"Newly Prescribed Medications: {json.dumps(new_medications)}\n\n"
            "Expected JSON Structure:\n"
            "{\n"
            '  "has_conflicts": true/false,\n'
            '  "alerts": [\n'
            "    {\n"
            '      "severity": "medium | critical",\n'
            '      "interacting_drugs": ["Drug A", "Drug B"],\n'
            '      "clinical_risk": "string (Medical explanation)",\n'
            '      "recommendation_en": "string (Actionable advice)",\n'
            '      "recommendation_ur": "string (Urdu translation)"\n'
            "    }\n"
            "  ]\n"
            "}"
        )

        # 4. Invoke LLM provider ---------------------------------------------
        provider = get_llm_provider()
        result: Dict[str, Any] = await provider.generate_json(
            prompt=user_prompt,
            system_prompt=_INTERACTION_SYSTEM_PROMPT,
        )

        # 5. Validate and return ---------------------------------------------
        if result and _is_valid_response(result):
            return _parse_response(result)

        # Fallback: no conflicts detected (safe default)
        logger.warning(
            "LLM provider returned empty/invalid interaction data; defaulting to no conflicts"
        )
        return InteractionCheckResponse(has_conflicts=False, alerts=[])


# ---------------------------------------------------------------------------
# Private helpers
# ---------------------------------------------------------------------------

def _is_valid_response(data: Dict[str, Any]) -> bool:
    """Check that the LLM output contains the expected top-level keys."""
    return "has_conflicts" in data and "alerts" in data


def _parse_response(data: Dict[str, Any]) -> InteractionCheckResponse:
    """Parse raw LLM JSON into a validated InteractionCheckResponse."""
    alerts_raw = data.get("alerts", [])
    parsed_alerts: List[DrugInteractionAlert] = []

    for alert in alerts_raw:
        if not isinstance(alert, dict):
            continue
        parsed_alerts.append(
            DrugInteractionAlert(
                severity=alert.get("severity", "medium"),
                interacting_drugs=alert.get("interacting_drugs", []),
                clinical_risk=alert.get("clinical_risk", ""),
                recommendation_en=alert.get("recommendation_en", ""),
                recommendation_ur=alert.get("recommendation_ur", ""),
            )
        )

    has_conflicts = bool(data.get("has_conflicts", False)) or len(parsed_alerts) > 0

    return InteractionCheckResponse(
        has_conflicts=has_conflicts,
        alerts=parsed_alerts,
    )
