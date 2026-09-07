# HealthVault AI — Drug Interaction & Allergy Guard Nodes (Workflow B)
# Implements node_load_patient_regimen, node_allergy_crosscheck,
# node_pairwise_drug_check, and node_severity_aggregator.

import json
import logging
from typing import Any, Dict, List, Optional
import uuid

from app.agents.state import InteractionState
from app.core.config import settings
from app.schemas.interactions import DrugInteractionAlert
from app.services.llm_provider import get_llm_provider
from app.services.pharmacopoeia import match_and_correct_brand

logger = logging.getLogger("healthvault")

_INTERACTION_SYSTEM_PROMPT = (
    "Clinical pharmacology safety agent. Cross-reference new medications against "
    "active medications and allergies. Flag only moderate/critical interactions. "
    "Provide bilingual recommendations (EN + UR). "
    "If no conflicts: has_conflicts=false, alerts=[]. "
    "RAW JSON only—no markdown, no explanation."
)

CLINICAL_DISCLAIMER = (
    "Disclaimer: This AI-generated clinical interaction check is intended as an informational clinical decision "
    "support tool. It does not replace the professional medical judgment of a licensed physician or clinical pharmacist."
)


def node_allergy_crosscheck(state: InteractionState) -> Dict[str, Any]:
    """Node 1: Immediate deterministic rule check against patient documented allergies.
    Direct allergen match (e.g. penicillin, aspirin, sulfa) raises a critical allergy conflict.
    """
    candidate_meds = state.get("candidate_medications") or []
    if not candidate_meds and state.get("candidate_medication"):
        candidate_meds = [state["candidate_medication"]]

    allergies = state.get("allergies") or []
    allergy_conflicts: List[Dict[str, Any]] = []

    for med_raw in candidate_meds:
        med_norm = str(med_raw).strip().lower()
        # Also check standard brand correction
        corrected, _, _ = match_and_correct_brand(med_raw)
        corrected_norm = corrected.lower()

        for allergy in allergies:
            allergen = str(allergy.get("allergen", "") if isinstance(allergy, dict) else getattr(allergy, "allergen", "")).strip().lower()
            severity = str(allergy.get("severity", "severe") if isinstance(allergy, dict) else getattr(allergy, "severity", "severe")).lower()

            if allergen and (allergen in med_norm or allergen in corrected_norm or med_norm in allergen):
                allergy_conflicts.append({
                    "severity": "critical" if severity in ["severe", "high", "anaphylaxis"] else "moderate",
                    "interacting_drugs": [med_raw, f"Documented Allergy: {allergen.title()}"],
                    "clinical_risk": f"Patient has documented allergy to {allergen.title()}. High risk of hypersensitivity reaction.",
                    "recommendation_en": f"Do not administer {med_raw}. Alternative medication required due to documented {allergen.title()} allergy.",
                    "recommendation_ur": f"مریض کو {allergen.title()} سے الرجی ہے۔ {med_raw} کا استعمال مت کریں۔",
                })

    has_allergy_conflict = len(allergy_conflicts) > 0
    return {
        "candidate_medications": candidate_meds,
        "allergy_conflicts": allergy_conflicts,
        "has_conflicts": state.get("has_conflicts", False) or has_allergy_conflict,
    }


async def node_pairwise_drug_check(state: InteractionState) -> Dict[str, Any]:
    """Node 2: Pairwise evaluation of candidate drugs against active regimen.
    Uses structured prompt or mock fallback.
    """
    candidate_meds = state.get("candidate_medications") or []
    active_meds = state.get("active_medications") or []

    if not candidate_meds:
        return {"drug_conflicts": []}

    # If mock mode active
    if settings.USE_MOCK:
        from app.core.mock_data import MOCK_INTERACTION_ALERT
        mock_alerts = [a.model_dump() for a in MOCK_INTERACTION_ALERT.alerts]
        return {
            "drug_conflicts": mock_alerts,
        }

    # Format active med strings
    active_med_names = []
    for m in active_meds:
        if isinstance(m, dict):
            name = m.get("name", "")
            dose = m.get("dosage", "")
            freq = m.get("frequency", "")
            active_med_names.append(f"{name} {dose} ({freq})".strip())
        else:
            active_med_names.append(str(m))

    if not active_med_names:
        return {"drug_conflicts": []}

    prompt = (
        f"Active Medications: {json.dumps(active_med_names)}\n"
        f"Newly Prescribed: {json.dumps(candidate_meds)}\n"
        "Output JSON with keys: has_conflicts (bool), alerts[] with: "
        "severity, interacting_drugs, clinical_risk, recommendation_en, recommendation_ur."
    )

    try:
        provider = get_llm_provider()
        result = await provider.generate_json(
            prompt=prompt,
            system_prompt=_INTERACTION_SYSTEM_PROMPT,
        )

        alerts = result.get("alerts", []) if result else []
        return {"drug_conflicts": alerts}
    except Exception as exc:
        logger.warning("LLM pairwise drug check encountered error: %s", exc)
        return {"drug_conflicts": [], "errors": [str(exc)]}


def node_severity_aggregator(state: InteractionState) -> Dict[str, Any]:
    """Node 3: Synthesizes interaction severities ('critical', 'moderate', 'safe')
    and attaches clinical disclaimers.
    """
    allergy_conflicts = state.get("allergy_conflicts") or []
    drug_conflicts = state.get("drug_conflicts") or []

    all_alerts: List[Dict[str, Any]] = []
    all_alerts.extend(allergy_conflicts)
    all_alerts.extend(drug_conflicts)

    # Determine highest risk level
    severities = [str(a.get("severity", "moderate")).lower() for a in all_alerts if isinstance(a, dict)]
    if any(s in ["critical", "high", "severe"] for s in severities):
        risk_level = "critical"
    elif any(s in ["moderate", "medium"] for s in severities):
        risk_level = "moderate"
    else:
        risk_level = "safe"

    has_conflicts = len(all_alerts) > 0

    return {
        "identified_conflicts": all_alerts,
        "alerts": all_alerts,
        "has_conflicts": has_conflicts,
        "risk_level": risk_level,
        "clinical_disclaimer": CLINICAL_DISCLAIMER,
    }
