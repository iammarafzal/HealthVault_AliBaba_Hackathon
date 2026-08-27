# HealthVault AI — LangGraph Workflow Nodes
# Router, extraction, and validation nodes for the medical document pipeline

import logging
from typing import Any, Dict

from pydantic import ValidationError

from app.agents.state import MedicalAgentState
from app.schemas.vault import ExtractionResponse
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

# ---------------------------------------------------------------------------
# System prompts (from AGENT_PROMPTS.md §1)
# ---------------------------------------------------------------------------

MEDICAL_EXTRACTION_SYSTEM_PROMPT = """You are a highly precise medical data extraction agent.
Task: Analyze the provided OCR text from a medical document (Prescription, Lab Report, or Discharge Summary) and extract the data strictly into the provided JSON schema.
Constraints:
- Do not output any markdown formatting, conversational text, or explanations. Output RAW JSON ONLY.
- If a value is missing or unclear, omit the key or use `null` / `[]`. Do not guess.
- Translate any Latin shorthand (e.g., "BD", "TDS", "OD", "PC", "AC") into plain English in the `instructions_en` field."""

LAB_EXTRACTION_SYSTEM_PROMPT = """You are a clinical laboratory data extraction agent.
Task: Extract biomarkers, reference ranges, test dates, and status from the provided lab report OCR text.
Constraints:
- Output RAW JSON ONLY. No markdown or explanations.
- For each biomarker, extract: biomarker_name, value, unit, reference_min, reference_max, status ("low" | "normal" | "high"), test_date.
- If a value is missing, use `null`. Do not guess."""


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
    """Extract diagnoses, medications, and clinical notes from discharge summary OCR text."""
    raw_text = state.get("raw_ocr_text", "")
    if not raw_text:
        return {"errors": ["No OCR text provided for discharge summary extraction"]}

    provider = get_llm_provider()
    prompt = f"Input OCR Text: \"{raw_text}\"\n\nDocument type: discharge_summary"
    result = await provider.generate_json(prompt, MEDICAL_EXTRACTION_SYSTEM_PROMPT)

    if not result:
        return {"errors": ["LLM extraction failed for discharge summary"]}

    return {"extracted_entities": result}


# ---------------------------------------------------------------------------
# Validation
# ---------------------------------------------------------------------------


def validation_node(state: MedicalAgentState) -> Dict[str, Any]:
    """Validate extracted_entities against the ExtractionResponse Pydantic schema."""
    entities = state.get("extracted_entities", {})
    errors = list(state.get("errors", []))

    if not entities:
        errors.append("No extracted entities to validate")
        return {"errors": errors}

    try:
        # Validate against the schema (Pydantic v2)
        ExtractionResponse.model_validate(entities)
        logger.info("Validation passed for extracted entities")
        return {"errors": errors}  # No new errors
    except ValidationError as exc:
        error_msg = f"Validation failed: {exc.errors()}"
        logger.warning(error_msg)
        errors.append(error_msg)
        return {"errors": errors}
