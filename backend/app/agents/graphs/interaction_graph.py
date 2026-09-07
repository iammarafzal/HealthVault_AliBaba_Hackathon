# HealthVault AI — Drug Interaction & Allergy Evaluation Graph (Workflow B)
# Assembles StateGraph for allergy crosscheck, pairwise drug evaluation,
# and risk-level aggregation with conditional branching.

import logging
from typing import Any, Dict, List, Optional

from langgraph.graph import END, START, StateGraph

from app.agents.nodes.interaction_nodes import (
    node_allergy_crosscheck,
    node_pairwise_drug_check,
    node_severity_aggregator,
)
from app.agents.state import InteractionState

logger = logging.getLogger("healthvault")


def route_allergy_severity(state: InteractionState) -> str:
    """Conditional edge: Branching logic based on allergy conflict detection.
    If a critical allergy conflict is detected, route to emergency alert node to flag immediately.
    """
    conflicts = state.get("allergy_conflicts") or []
    has_critical_allergy = any(
        str(c.get("severity", "")).lower() in ["critical", "severe", "high"]
        for c in conflicts
    )
    if has_critical_allergy:
        return "emergency_allergy_alert"
    return "pairwise_drug_check"


def node_emergency_allergy_alert(state: InteractionState) -> Dict[str, Any]:
    """Node: Handles critical allergy alert tagging before final aggregation."""
    logger.warning("Critical allergy contraindication detected in graph!")
    return {
        "risk_level": "critical",
    }


def build_interaction_evaluation_graph():
    """Builds and compiles the LangGraph InteractionEvaluationGraph."""
    graph = StateGraph(InteractionState)

    # Register nodes
    graph.add_node("allergy_crosscheck", node_allergy_crosscheck)
    graph.add_node("emergency_allergy_alert", node_emergency_allergy_alert)
    graph.add_node("pairwise_drug_check", node_pairwise_drug_check)
    graph.add_node("severity_aggregator", node_severity_aggregator)

    # Define edges
    graph.add_edge(START, "allergy_crosscheck")

    graph.add_conditional_edges(
        "allergy_crosscheck",
        route_allergy_severity,
        {
            "emergency_allergy_alert": "emergency_allergy_alert",
            "pairwise_drug_check": "pairwise_drug_check",
        },
    )

    # Both paths converge to pairwise check or directly to aggregator
    graph.add_edge("emergency_allergy_alert", "pairwise_drug_check")
    graph.add_edge("pairwise_drug_check", "severity_aggregator")
    graph.add_edge("severity_aggregator", END)

    return graph.compile()


interaction_evaluation_graph = build_interaction_evaluation_graph()


async def run_interaction_evaluation(
    candidate_medications: List[str],
    active_medications: Optional[List[Any]] = None,
    allergies: Optional[List[Any]] = None,
    patient_id: Optional[str] = None,
) -> Dict[str, Any]:
    """Execute the InteractionEvaluationGraph workflow.

    Args:
        candidate_medications: List of newly prescribed or proposed drug names
        active_medications: Current active regimen
        allergies: Documented patient allergies
        patient_id: Optional patient UUID string

    Returns:
        Final state dict with alerts, identified_conflicts, has_conflicts, risk_level
    """
    initial_state: InteractionState = {
        "patient_id": patient_id,
        "candidate_medication": candidate_medications[0] if candidate_medications else None,
        "candidate_medications": candidate_medications,
        "active_medications": [
            m.model_dump() if hasattr(m, "model_dump") else (m if isinstance(m, dict) else {"name": str(m)})
            for m in (active_medications or [])
        ],
        "allergies": [
            a.model_dump() if hasattr(a, "model_dump") else (a if isinstance(a, dict) else {"allergen": str(a)})
            for a in (allergies or [])
        ],
        "allergy_conflicts": [],
        "drug_conflicts": [],
        "identified_conflicts": [],
        "has_conflicts": False,
        "risk_level": "safe",
        "clinical_disclaimer": "",
        "alerts": [],
        "errors": [],
    }

    logger.info("Executing InteractionEvaluationGraph for meds=%s", candidate_medications)
    return await interaction_evaluation_graph.ainvoke(initial_state)
