# HealthVault AI — LangGraph Agent States
# State definitions for multi-agent workflows across Document Extraction,
# Drug Interactions, Prescription RAG Interpreter, and Doctor Summary.

from typing import Annotated, Any, Dict, List, Optional, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph.message import add_messages


class MedicalAgentState(TypedDict):
    """Shared state flowing through the legacy LangGraph extraction workflow.
    Preserved for backward compatibility.
    """

    user_id: str
    document_type: str
    raw_image_url: Optional[str]
    raw_ocr_text: Optional[str]
    extracted_entities: Dict[str, Any]
    drug_interaction_flags: List[Dict[str, Any]]
    lab_biomarkers: List[Dict[str, Any]]
    errors: List[str]


class ExtractionState(TypedDict, total=False):
    """State definition for DocumentExtractionGraph (Workflow A).
    Tracks multimodal input, draft entity parsing, Pakistani formulary safety audit,
    human-in-the-loop (HITL) approval pause, and PostgreSQL commit.
    """

    file_bytes: Optional[bytes]
    mime_type: str
    document_type_hint: str
    raw_text: Optional[str]
    is_valid_medical_doc: bool
    category: Optional[str]
    confidence_score: float
    rejection_reason: Optional[str]
    draft_entities: Optional[Dict[str, Any]]
    validation_errors: List[str]
    is_approved: bool
    record_id: Optional[str]
    user_id: Optional[str]
    file_url: Optional[str]
    saved_record: Optional[Dict[str, Any]]


class InteractionState(TypedDict, total=False):
    """State definition for InteractionEvaluationGraph (Workflow B).
    Manages allergy cross-checks, pairwise drug conflict evaluation,
    and clinical risk aggregation with bilingual safety alerts.
    """

    patient_id: Optional[str]
    candidate_medication: Optional[str]
    candidate_medications: List[str]
    active_medications: List[Dict[str, Any]]
    allergies: List[Dict[str, Any]]
    allergy_conflicts: List[Dict[str, Any]]
    drug_conflicts: List[Dict[str, Any]]
    identified_conflicts: List[Dict[str, Any]]
    has_conflicts: bool
    risk_level: str  # "safe" | "moderate" | "critical"
    clinical_disclaimer: str
    alerts: List[Dict[str, Any]]
    errors: List[str]


class InterpreterState(TypedDict, total=False):
    """State definition for Grounded Prescription Interpreter (Workflow C).
    Maintains conversational RAG message stream, grounding context from prescription items,
    and anti-hallucination refusal guardrails.
    """

    messages: Annotated[List[BaseMessage], add_messages]
    record_context: Optional[Dict[str, Any]]
    language_mode: str  # "bilingual" | "ur" | "en"
    is_grounded: bool
    refusal_reason: Optional[str]
    final_answer: str
    audio_script_ur: Optional[str]
    errors: List[str]


class SummaryState(TypedDict, total=False):
    """State definition for DoctorSummaryGraph (Workflow D, Map-Reduce).
    Tracks patient profile, historical encounters, chronic illnesses, and biomarker trends,
    aggregating into a 10-second physician clinical brief.
    """

    patient_id: str
    patient_profile: Dict[str, Any]
    records: List[Dict[str, Any]]
    active_medications: List[Dict[str, Any]]
    allergies: List[Dict[str, Any]]
    abnormal_biomarkers: List[Dict[str, Any]]
    visits_summary: Optional[Dict[str, Any]]
    chronic_summary: Optional[Dict[str, Any]]
    biomarkers_summary: Optional[Dict[str, Any]]
    final_summary: Optional[Dict[str, Any]]
    errors: List[str]
