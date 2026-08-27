# HealthVault AI — LangGraph Agent State
# MedicalAgentState TypedDict definition for multi-agent workflow

from typing import Any, Dict, List, Optional, TypedDict


class MedicalAgentState(TypedDict):
    """Shared state flowing through the LangGraph extraction workflow.

    Matches the specification in ARCHITECTURE.md §3.
    """

    user_id: str
    document_type: str
    raw_image_url: Optional[str]
    raw_ocr_text: Optional[str]
    extracted_entities: Dict[str, Any]
    drug_interaction_flags: List[Dict[str, Any]]
    lab_biomarkers: List[Dict[str, Any]]
    errors: List[str]
