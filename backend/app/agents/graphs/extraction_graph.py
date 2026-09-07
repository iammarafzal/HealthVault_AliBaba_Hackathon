# HealthVault AI — Document Extraction Graph (Workflow A)
# Assembles StateGraph for multimodal prescription & document ingestion,
# safety audit against Pakistani Pharmacopoeia, and HITL review pause.

import logging
from typing import Any, Dict, Optional

from langgraph.graph import END, START, StateGraph

from app.agents.nodes.extraction_nodes import (
    node_db_commit,
    node_entity_parse,
    node_human_review_pause,
    node_ocr_extract,
    node_safety_audit,
)
from app.agents.state import ExtractionState

logger = logging.getLogger("healthvault")


def route_validity(state: ExtractionState) -> str:
    """Conditional edge: validates if the uploaded document is a legitimate medical document."""
    if not state.get("is_valid_medical_doc", True):
        return "rejection_terminal"
    return "entity_parse"


def route_approval(state: ExtractionState) -> str:
    """Conditional edge: checks if the document has been approved by the patient/clinician (HITL)."""
    if state.get("is_approved", False):
        return "db_commit"
    return END


def node_rejection_terminal(state: ExtractionState) -> Dict[str, Any]:
    """Terminal node for non-medical uploads."""
    logger.info("Rejection terminal reached: %s", state.get("rejection_reason"))
    return {}


def build_document_extraction_graph():
    """Builds and compiles the LangGraph DocumentExtractionGraph."""
    graph = StateGraph(ExtractionState)

    # Register nodes
    graph.add_node("ocr_extract", node_ocr_extract)
    graph.add_node("rejection_terminal", node_rejection_terminal)
    graph.add_node("entity_parse", node_entity_parse)
    graph.add_node("safety_audit", node_safety_audit)
    graph.add_node("human_review_pause", node_human_review_pause)
    graph.add_node("db_commit", node_db_commit)

    # Define edges
    graph.add_edge(START, "ocr_extract")

    graph.add_conditional_edges(
        "ocr_extract",
        route_validity,
        {
            "rejection_terminal": "rejection_terminal",
            "entity_parse": "entity_parse",
        },
    )

    graph.add_edge("rejection_terminal", END)
    graph.add_edge("entity_parse", "safety_audit")
    graph.add_edge("safety_audit", "human_review_pause")

    graph.add_conditional_edges(
        "human_review_pause",
        route_approval,
        {
            "db_commit": "db_commit",
            END: END,
        },
    )

    graph.add_edge("db_commit", END)

    return graph.compile()


document_extraction_graph = build_document_extraction_graph()


async def run_document_extraction(
    file_bytes: Optional[bytes] = None,
    mime_type: str = "application/octet-stream",
    document_type_hint: str = "prescription",
    is_approved: bool = False,
    user_id: Optional[str] = None,
    record_id: Optional[str] = None,
    draft_entities: Optional[Dict[str, Any]] = None,
    file_url: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the DocumentExtractionGraph workflow.

    Args:
        file_bytes: Raw binary bytes of uploaded image/PDF
        mime_type: Content type
        document_type_hint: Hint provided by user/frontend
        is_approved: True if user reviewed/confirmed draft entities
        user_id: Patient UUID
        record_id: Target record ID
        draft_entities: Pre-existing or edited draft entities (for confirm-record flow)
        file_url: Storage URL for document

    Returns:
        Final state dict with draft_entities, is_valid_medical_doc, saved_record, etc.
    """
    initial_state: ExtractionState = {
        "file_bytes": file_bytes,
        "mime_type": mime_type,
        "document_type_hint": document_type_hint,
        "raw_text": None,
        "is_valid_medical_doc": True,
        "category": document_type_hint,
        "confidence_score": 1.0,
        "rejection_reason": None,
        "draft_entities": draft_entities,
        "validation_errors": [],
        "is_approved": is_approved,
        "record_id": record_id,
        "user_id": user_id,
        "file_url": file_url,
        "saved_record": None,
    }

    logger.info("Executing DocumentExtractionGraph: user_id=%s, is_approved=%s", user_id, is_approved)
    return await document_extraction_graph.ainvoke(initial_state)
