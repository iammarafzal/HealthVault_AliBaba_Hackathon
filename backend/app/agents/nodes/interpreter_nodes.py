# HealthVault AI — Grounded Prescription RAG & Explainer Nodes (Workflow C)
# Implements node_context_retriever, node_guardrail_check, and node_grounded_response_gen.

import logging
from typing import Any, Dict, List, Optional

from langchain_core.messages import AIMessage, BaseMessage, HumanMessage
from app.agents.state import InterpreterState
from app.core.config import settings
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")

_GUARDRAIL_REFUSAL_UR = (
    "معذرت، میں صرف آپ کے نسخے میں درج ادویات اور ڈاکٹر کی ہدایات کی وضاحت کر سکتا ہوں۔ "
    "نئی علامات کی تشخیص یا علاج تجویز کرنے کے لیے براہ کرم فوری اپنے ڈاکٹر یا قریبی ہسپتال سے رجوع فرمائیں۔"
)

_GUARDRAIL_REFUSAL_EN = (
    "I can only explain medications and instructions already written in your uploaded prescription. "
    "I cannot diagnose new conditions or recommend unprescribed medications. Please consult a licensed physician."
)

_DIAGNOSTIC_QUERY_KEYWORDS = [
    "do i have cancer", "do i have a tumor", "diagnose me", "diagnose my",
    "what disease do i have", "heart attack", "am i dying", "treat my chest pain",
    "کیا مجھے کینسر ہے", "کیا مجھے دل کا دورہ", "میری بیماری کی تشخیص کریں"
]


def node_context_retriever(state: InterpreterState) -> Dict[str, Any]:
    """Node 1: Builds grounded document retrieval context from prescription items.
    Extracts structured medications, dosages, timings, food relations, and diagnoses.
    """
    record_context = state.get("record_context") or {}
    meds = record_context.get("medications", [])
    diagnoses = record_context.get("diagnoses", [])
    doctor = record_context.get("doctor_name", "Doctor")
    hosp = record_context.get("hospital_name") or record_context.get("clinic_hospital_name", "Hospital")

    lines = [f"Prescribing Doctor: {doctor} at {hosp}"]
    if diagnoses:
        lines.append(f"Recorded Diagnoses: {', '.join(diagnoses)}")

    lines.append("\nPrescribed Medications:")
    for idx, m in enumerate(meds, start=1):
        if isinstance(m, dict):
            name = m.get("name", "Unknown")
            dose = m.get("dosage", "")
            freq = m.get("frequency", "")
            timing = m.get("instructions_en") or m.get("timing") or ""
            timing_ur = m.get("instructions_ur") or ""
            purpose = m.get("purpose_en") or ""
            lines.append(f"{idx}. {name} {dose} | Frequency: {freq} | Instructions: {timing} | Urdu: {timing_ur} | Purpose: {purpose}")
        else:
            lines.append(f"{idx}. {str(m)}")

    raw_text = record_context.get("raw_text") or record_context.get("raw_ocr_text")
    if raw_text:
        lines.append(f"\nRaw Clinical Notes: {raw_text[:500]}")

    formatted_context = "\n".join(lines)
    return {
        "record_context": {**record_context, "formatted_context": formatted_context},
        "is_grounded": True,
    }


def node_guardrail_check(state: InterpreterState) -> Dict[str, Any]:
    """Node 2: Strict anti-hallucination guardrail check.
    Refuses out-of-scope diagnostic queries or symptom evaluations.
    """
    messages = state.get("messages") or []
    last_user_query = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            last_user_query = str(msg.content).lower()
            break
        elif isinstance(msg, dict) and msg.get("role") in ["user", "human"]:
            last_user_query = str(msg.get("content", "")).lower()
            break

    # Keyword heuristic check for unsolicited medical diagnosis
    for kw in _DIAGNOSTIC_QUERY_KEYWORDS:
        if kw in last_user_query:
            lang = state.get("language_mode", "bilingual")
            refusal_text = _GUARDRAIL_REFUSAL_UR if lang == "ur" else f"{_GUARDRAIL_REFUSAL_EN}\n\n{_GUARDRAIL_REFUSAL_UR}"
            return {
                "is_grounded": False,
                "refusal_reason": "Out of scope: user requested new medical diagnosis.",
                "final_answer": refusal_text,
            }

    return {"is_grounded": True, "refusal_reason": None}


async def node_grounded_response_gen(state: InterpreterState) -> Dict[str, Any]:
    """Node 3: Formats prompt with grounded context and generates bilingual response
    with Nastaliq Urdu formatting and patient-friendly instructions.
    """
    if not state.get("is_grounded", True) and state.get("final_answer"):
        return {}

    record_context = state.get("record_context") or {}
    formatted_context = record_context.get("formatted_context", "No prescription context provided.")
    messages = state.get("messages") or []

    last_user_query = ""
    for msg in reversed(messages):
        if isinstance(msg, HumanMessage):
            last_user_query = str(msg.content)
            break
        elif isinstance(msg, dict) and msg.get("role") in ["user", "human"]:
            last_user_query = str(msg.get("content", ""))
            break

    if not last_user_query:
        last_user_query = "Please explain my prescription medications and schedule in simple terms."

    sys_prompt = (
        "You are an empathetic, expert Pakistani clinical pharmacist explaining a verified prescription.\n"
        "STRICT GROUNDING RULES:\n"
        "1. Base your answer ONLY on the provided prescription context.\n"
        "2. Do NOT diagnose new diseases or add unprescribed drugs.\n"
        "3. Provide bilingual explanation: clear conversational English and polished Nastaliq Urdu (اردو).\n"
        "4. Clarify exact timings (morning, afternoon, night), meal relations (before/after food), and cautions."
    )

    user_prompt = f"PRESCRIPTION CONTEXT:\n{formatted_context}\n\nPATIENT QUESTION:\n{last_user_query}"

    if settings.USE_MOCK:
        mock_answer = (
            "### Prescription Summary / نسخہ کی تفصیل\n\n"
            "**Metformin 500mg (گلوکوفیج)**: Take 1 tablet twice daily after meals (صبح اور شام کھانے کے بعد ایک گولی لیں۔)\n\n"
            "**Lisinopril 10mg (زیسٹرل)**: Take 1 tablet once daily in the morning (روزانہ صبح ایک گولی پانی کے ساتھ لیں۔)\n\n"
            "**Important Precautions / ضروری احتیاط:** Drink plenty of water and do not skip meals."
        )
        return {
            "final_answer": mock_answer,
            "audio_script_ur": "آپ کا نسخہ: گلوکوفیج صبح اور شام کھانے کے بعد، اور زیسٹرل روزانہ صبح ایک گولی پانی کے ساتھ لیں۔",
        }

    try:
        provider = get_llm_provider()
        response_text = await provider.generate_text(user_prompt, sys_prompt)
        return {
            "final_answer": response_text,
            "audio_script_ur": "ڈاکٹر کی ہدایات کے مطابق دوائی باقاعدگی سے استعمال کریں اور پانی کا وافر استعمال رکھیں۔",
        }
    except Exception as exc:
        logger.warning("LLM response generation failed: %s; using fallback", exc)
        return {
            "final_answer": "Please follow the dosage schedule written on your prescription slip and consult your doctor for any changes.",
            "errors": [str(exc)],
        }
