# HealthVault AI — AI Doctor Clinical Summary Graph (Workflow D, Map-Reduce)
# Assembles StateGraph executing Map-Reduce summarization of historical encounters,
# chronic conditions, and biomarker trajectories into a 10-second physician briefing.

import logging
from typing import Any, Dict, List, Optional

from langgraph.graph import END, START, StateGraph

from app.agents.nodes.summary_nodes import (
    node_compile_clinical_brief,
    node_summarize_chronic,
    node_summarize_lab_trends,
    node_summarize_visits,
)
from app.agents.state import SummaryState

logger = logging.getLogger("healthvault")


def build_doctor_summary_graph():
    """Builds and compiles the DoctorSummaryGraph (Map-Reduce pattern)."""
    graph = StateGraph(SummaryState)

    # Register nodes
    graph.add_node("summarize_visits", node_summarize_visits)
    graph.add_node("summarize_chronic", node_summarize_chronic)
    graph.add_node("summarize_lab_trends", node_summarize_lab_trends)
    graph.add_node("compile_clinical_brief", node_compile_clinical_brief)

    # Pipeline: Map workers feed into the reducer
    graph.add_edge(START, "summarize_visits")
    graph.add_edge("summarize_visits", "summarize_chronic")
    graph.add_edge("summarize_chronic", "summarize_lab_trends")
    graph.add_edge("summarize_lab_trends", "compile_clinical_brief")
    graph.add_edge("compile_clinical_brief", END)

    return graph.compile()


doctor_summary_graph = build_doctor_summary_graph()


async def run_doctor_summary(
    patient_profile: Optional[Dict[str, Any]] = None,
    records: Optional[List[Dict[str, Any]]] = None,
    active_medications: Optional[List[Dict[str, Any]]] = None,
    allergies: Optional[List[Dict[str, Any]]] = None,
    abnormal_biomarkers: Optional[List[Dict[str, Any]]] = None,
    patient_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the DoctorSummaryGraph workflow.

    Args:
        patient_profile: Dict with full_name, health_id, gender, blood_group, etc.
        records: List of vault MedicalRecord dicts
        active_medications: List of active Medication dicts
        allergies: List of Allergy dicts
        abnormal_biomarkers: List of out-of-range Biomarker dicts
        patient_id: Target patient UUID string

    Returns:
        Final state dict containing 'final_summary' adhering to DoctorSummaryResponse.
    """
    initial_state: SummaryState = {
        "patient_id": patient_id or "patient",
        "patient_profile": patient_profile or {},
        "records": records or [],
        "active_medications": active_medications or [],
        "allergies": allergies or [],
        "abnormal_biomarkers": abnormal_biomarkers or [],
        "visits_summary": None,
        "chronic_summary": None,
        "biomarkers_summary": None,
        "final_summary": None,
        "errors": [],
    }

    logger.info("Executing DoctorSummaryGraph for patient_id=%s", patient_id)
    return await doctor_summary_graph.ainvoke(initial_state)
