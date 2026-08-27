# HealthVault AI — LangGraph Execution Graph
# Multi-agent workflow: OCR -> Router -> Document Parsers -> Validation -> END

import logging
from typing import Any, Dict

from langgraph.graph import END, START, StateGraph

from app.agents.nodes import (
    clinical_summary_extraction_node,
    lab_extraction_node,
    prescription_extraction_node,
    route_by_document_type,
    router_node,
    validation_node,
)
from app.agents.state import MedicalAgentState

logger = logging.getLogger("healthvault")


def build_extraction_graph() -> StateGraph:
    """Construct and compile the LangGraph StateGraph for medical document extraction.

    Flow:
        START → router → (conditional) → prescription_extraction
                                       → lab_extraction
                                       → clinical_summary_extraction
                                 → validation → END
    """
    graph = StateGraph(MedicalAgentState)

    # Add nodes
    graph.add_node("router", router_node)
    graph.add_node("prescription_extraction", prescription_extraction_node)
    graph.add_node("lab_extraction", lab_extraction_node)
    graph.add_node("clinical_summary_extraction", clinical_summary_extraction_node)
    graph.add_node("validation", validation_node)

    # Entry point
    graph.add_edge(START, "router")

    # Conditional routing based on document_type
    graph.add_conditional_edges(
        "router",
        route_by_document_type,
        {
            "prescription_extraction_node": "prescription_extraction",
            "lab_extraction_node": "lab_extraction",
            "clinical_summary_extraction_node": "clinical_summary_extraction",
        },
    )

    # All extraction paths converge to validation
    graph.add_edge("prescription_extraction", "validation")
    graph.add_edge("lab_extraction", "validation")
    graph.add_edge("clinical_summary_extraction", "validation")

    # Validation → END
    graph.add_edge("validation", END)

    return graph.compile()


# Compiled graph singleton
extraction_graph = build_extraction_graph()


async def run_medical_extraction(
    user_id: str, document_type: str, raw_ocr_text: str
) -> Dict[str, Any]:
    """Execute the LangGraph extraction workflow.

    Args:
        user_id: Patient UUID
        document_type: "prescription" | "lab_report" | "discharge_summary"
        raw_ocr_text: Raw OCR text from the uploaded document

    Returns:
        Final state dictionary with extracted_entities, lab_biomarkers, errors
    """
    initial_state: MedicalAgentState = {
        "user_id": user_id,
        "document_type": document_type,
        "raw_image_url": None,
        "raw_ocr_text": raw_ocr_text,
        "extracted_entities": {},
        "drug_interaction_flags": [],
        "lab_biomarkers": [],
        "errors": [],
    }

    logger.info(
        "Starting medical extraction: user_id=%s, document_type=%s",
        user_id,
        document_type,
    )

    final_state = await extraction_graph.ainvoke(initial_state)

    if final_state.get("errors"):
        logger.warning(
            "Extraction completed with errors: %s", final_state["errors"]
        )
    else:
        logger.info("Extraction completed successfully")

    return final_state
