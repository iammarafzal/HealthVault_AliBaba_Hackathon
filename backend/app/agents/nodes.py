# HealthVault AI — LangGraph Workflow Nodes
# Router, extraction, and validation nodes for the medical document pipeline

import logging
from typing import Any, Dict

from pydantic import ValidationError

from app.agents.state import MedicalAgentState
from app.schemas.vault import ExtractedDocumentEntities
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# System prompts (from AGENT_PROMPTS.md §1)
# ---------------------------------------------------------------------------

MEDICAL_EXTRACTION_SYSTEM_PROMPT = (
    "Medical data extraction agent. Analyze OCR text from a prescription, lab report, "
    "or discharge summary. Extract strictly into JSON schema. "
    "Rules: RAW JSON only—no markdown, no explanation. Missing values: omit key or null. "
    "Translate Latin shorthand (BD, TDS, OD, PC, AC) to plain English in instructions_en."
)

LAB_EXTRACTION_SYSTEM_PROMPT = (
    "Lab report extraction agent. Extract biomarkers from OCR text into JSON. "
    "Rules: RAW JSON only—no markdown, no explanation. "
    "Top-level keys: test_name (panel/test title), test_date (ISO YYYY-MM-DD), "
    "hospital_name (lab/hospital name), biomarkers (array). "
    "Per biomarker: biomarker_name, value, unit, reference_min, reference_max, "
    "status (low|normal|high), test_date. Missing values: null."
)

DISCHARGE_EXTRACTION_SYSTEM_PROMPT = (
    "Hospital discharge summary extraction agent. Analyze OCR text and extract strictly "
    "into JSON schema. Rules: RAW JSON only—no markdown, no explanation. Missing values: "
    "omit key or null. Keys: doctor_name, hospital_name, consultation_date (ISO YYYY-MM-DD "
    "of admission/discharge), diagnoses (primary diagnoses array), surgical_notes (array of "
    "procedure/operative findings), medications (name, dosage, frequency, timing, "
    "instructions_en, instructions_ur, is_active), allergies (allergen, severity, "
    "reaction_details), follow_up_instructions (array of post-discharge clinical "
    "instructions). Translate Latin shorthand (BD, TDS, OD, PC, AC) to plain English in "
    "instructions_en."
)


# ---------------------------------------------------------------------------
# Router
# ---------------------------------------------------------------------------


def router_node(state: MedicalAgentState) -> Dict[str, Any]:
    """Pass-through router node — the actual routing logic is in the conditional edge."""
    logger.info(
        "Router node: document_type=%s, user_id=%s",
        state.get("document_type"),
        state.get("user_id"),
    )
    return {}


def route_by_document_type(state: MedicalAgentState) -> str:
    """Conditional edge function: returns the next node name based on document_type."""
    doc_type = state.get("document_type", "").lower()
    if "lab" in doc_type:
        return "lab_extraction_node"
    elif "discharge" in doc_type:
        return "clinical_summary_extraction_node"
    else:
        return "prescription_extraction_node"


# ---------------------------------------------------------------------------
# Extraction nodes
# ---------------------------------------------------------------------------


async def prescription_extraction_node(state: MedicalAgentState) -> Dict[str, Any]:
    """Extract diagnoses, medications (EN/UR), and allergies from prescription OCR text."""
    raw_text = state.get("raw_ocr_text", "")
    if not raw_text:
        return {"errors": ["No OCR text provided for prescription extraction"]}

    provider = get_llm_provider()
    prompt = f"Input OCR Text: \"{raw_text}\"\n\nDocument type: prescription"
    result = await provider.generate_json(prompt, MEDICAL_EXTRACTION_SYSTEM_PROMPT)

    if not result:
        return {"errors": ["LLM extraction failed for prescription"]}

    return {"extracted_entities": result}


async def lab_extraction_node(state: MedicalAgentState) -> Dict[str, Any]:
    """Extract biomarkers, reference ranges, and test dates from lab report OCR text."""
    raw_text = state.get("raw_ocr_text", "")
    if not raw_text:
        return {"errors": ["No OCR text provided for lab report extraction"]}

    provider = get_llm_provider()
    prompt = f"Input OCR Text: \"{raw_text}\"\n\nDocument type: lab_report"
    result = await provider.generate_json(prompt, LAB_EXTRACTION_SYSTEM_PROMPT)

    if not result:
        return {"errors": ["LLM extraction failed for lab report"]}

    # Lab reports may return biomarkers in a nested structure — normalize
    biomarkers = result.get("biomarkers", result.get("lab_biomarkers", []))
    return {"extracted_entities": result, "lab_biomarkers": biomarkers}


async def clinical_summary_extraction_node(state: MedicalAgentState) -> Dict[str, Any]:
    """Extract diagnoses, surgical notes, medications, and follow-up instructions from
    discharge summary OCR text."""
    raw_text = state.get("raw_ocr_text", "")
    if not raw_text:
        return {"errors": ["No OCR text provided for discharge summary extraction"]}

    provider = get_llm_provider()
    prompt = f"Input OCR Text: \"{raw_text}\"\n\nDocument type: discharge_summary"
    result = await provider.generate_json(prompt, DISCHARGE_EXTRACTION_SYSTEM_PROMPT)

    if not result:
        return {"errors": ["LLM extraction failed for discharge summary"]}

    return {"extracted_entities": result}


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validation_node(state: MedicalAgentState) -> Dict[str, Any]:
    """Validate extracted_entities against the ExtractedDocumentEntities Pydantic schema.

    Uses a dedicated LLM-output schema that does NOT require DB-generated fields
    (record_id, raw_ocr_text), avoiding false-positive ValidationErrors.
    """
    entities = state.get("extracted_entities", {})
    errors = list(state.get("errors", []))

    if not entities:
        errors.append("No extracted entities to validate")
        return {"errors": errors}

    try:
        # Validate against the LLM-output schema (Pydantic v2)
        ExtractedDocumentEntities.model_validate(entities)
        logger.info("Validation passed for extracted entities")
        return {"errors": errors}  # No new errors
    except ValidationError as exc:
        error_msg = f"Validation failed: {exc.errors()}"
        logger.warning(error_msg)
        errors.append(error_msg)
        return {"errors": errors}
