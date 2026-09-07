# HealthVault AI — Isolated Pure Node Functions
# Exports nodes across Document Extraction, Drug Interactions,
# Grounded Prescription Interpreter, and AI Doctor Summary workflows.

from app.agents.nodes.extraction_nodes import (
    node_ocr_extract,
    node_entity_parse,
    node_safety_audit,
    node_human_review_pause,
    node_db_commit,
)
from app.agents.nodes.interaction_nodes import (
    node_allergy_crosscheck,
    node_pairwise_drug_check,
    node_severity_aggregator,
)
from app.agents.nodes.interpreter_nodes import (
    node_context_retriever,
    node_guardrail_check,
    node_grounded_response_gen,
)
from app.agents.nodes.summary_nodes import (
    node_summarize_visits,
    node_summarize_chronic,
    node_summarize_lab_trends,
    node_compile_clinical_brief,
)
from app.agents.nodes.legacy_nodes import (
    router_node,
    route_by_document_type,
    prescription_extraction_node,
    lab_extraction_node,
    clinical_summary_extraction_node,
    validation_node,
    MEDICAL_EXTRACTION_SYSTEM_PROMPT,
    LAB_EXTRACTION_SYSTEM_PROMPT,
    DISCHARGE_EXTRACTION_SYSTEM_PROMPT,
)

__all__ = [
    # Workflow A: Document Extraction
    "node_ocr_extract",
    "node_entity_parse",
    "node_safety_audit",
    "node_human_review_pause",
    "node_db_commit",
    # Workflow B: Drug Interaction & Allergy Guard
    "node_allergy_crosscheck",
    "node_pairwise_drug_check",
    "node_severity_aggregator",
    # Workflow C: Interpreter & RAG
    "node_context_retriever",
    "node_guardrail_check",
    "node_grounded_response_gen",
    # Workflow D: Doctor Summary
    "node_summarize_visits",
    "node_summarize_chronic",
    "node_summarize_lab_trends",
    "node_compile_clinical_brief",
    # Legacy nodes
    "router_node",
    "route_by_document_type",
    "prescription_extraction_node",
    "lab_extraction_node",
    "clinical_summary_extraction_node",
    "validation_node",
    "MEDICAL_EXTRACTION_SYSTEM_PROMPT",
    "LAB_EXTRACTION_SYSTEM_PROMPT",
    "DISCHARGE_EXTRACTION_SYSTEM_PROMPT",
]
