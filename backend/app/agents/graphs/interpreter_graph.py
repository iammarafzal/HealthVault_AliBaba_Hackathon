# HealthVault AI — Grounded Prescription Interpreter Graph (Workflow C)
# Assembles StateGraph for conversational RAG, grounding retrieval,
# and anti-hallucination guardrail enforcement with Nastaliq Urdu formatting.

import logging
from typing import Any, Dict, List, Optional

from langchain_core.messages import BaseMessage, HumanMessage
from langgraph.graph import END, START, StateGraph

from app.agents.nodes.interpreter_nodes import (
    node_context_retriever,
    node_grounded_response_gen,
    node_guardrail_check,
)
from app.agents.state import InterpreterState

logger = logging.getLogger("healthvault")


def route_guardrail(state: InterpreterState) -> str:
    """Conditional edge: If guardrail check caught an invalid diagnostic query,
    divert directly to END since the refusal response is already populated.
    """
    if not state.get("is_grounded", True):
        return END
    return "response_gen"


def build_interpreter_graph():
    """Builds and compiles the Grounded Prescription Interpreter StateGraph."""
    graph = StateGraph(InterpreterState)

    # Register nodes
    graph.add_node("context_retriever", node_context_retriever)
    graph.add_node("guardrail_check", node_guardrail_check)
    graph.add_node("response_gen", node_grounded_response_gen)

    # Define edges
    graph.add_edge(START, "context_retriever")
    graph.add_edge("context_retriever", "guardrail_check")

    graph.add_conditional_edges(
        "guardrail_check",
        route_guardrail,
        {
            END: END,
            "response_gen": "response_gen",
        },
    )

    graph.add_edge("response_gen", END)

    return graph.compile()


interpreter_graph = build_interpreter_graph()


async def run_grounded_rag(
    messages: List[Any],
    record_context: Optional[Dict[str, Any]] = None,
    language_mode: str = "bilingual",
) -> Dict[str, Any]:
    """Execute the Grounded Prescription Interpreter workflow.

    Args:
        messages: Chat history messages (strings, dicts, or BaseMessages)
        record_context: Prescription record dictionary (medications, diagnoses, doctor)
        language_mode: "bilingual" | "ur" | "en"

    Returns:
        Final state dict with final_answer, is_grounded, audio_script_ur
    """
    # Normalize messages to BaseMessage
    norm_messages: List[BaseMessage] = []
    for m in messages:
        if isinstance(m, BaseMessage):
            norm_messages.append(m)
        elif isinstance(m, dict):
            content = m.get("content", "")
            role = m.get("role", "user")
            if role in ["user", "human"]:
                norm_messages.append(HumanMessage(content=content))
            else:
                from langchain_core.messages import AIMessage
                norm_messages.append(AIMessage(content=content))
        elif isinstance(m, str):
            norm_messages.append(HumanMessage(content=m))

    initial_state: InterpreterState = {
        "messages": norm_messages,
        "record_context": record_context or {},
        "language_mode": language_mode,
        "is_grounded": True,
        "refusal_reason": None,
        "final_answer": "",
        "audio_script_ur": None,
        "errors": [],
    }

    logger.info("Executing Grounded Interpreter Graph: msgs=%d, lang=%s", len(norm_messages), language_mode)
    return await interpreter_graph.ainvoke(initial_state)
