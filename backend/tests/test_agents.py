# HealthVault AI — Unit Tests for Modular LangGraph & LangChain Workflows
# Tests individual node transitions, state updates, and compiled StateGraph pipelines
# across Document Extraction, Drug Interactions, Grounded RAG, and Doctor Summary.

from datetime import date
from unittest.mock import AsyncMock, patch
import uuid
import pytest

from langchain_core.messages import HumanMessage

from app.agents.graphs import (
    document_extraction_graph,
    run_document_extraction,
    interaction_evaluation_graph,
    run_interaction_evaluation,
    interpreter_graph,
    run_grounded_rag,
    doctor_summary_graph,
    run_doctor_summary,
)
from app.agents.nodes.extraction_nodes import (
    node_db_commit,
    node_entity_parse,
    node_human_review_pause,
    node_ocr_extract,
    node_safety_audit,
)
from app.agents.nodes.interaction_nodes import (
    node_allergy_crosscheck,
    node_pairwise_drug_check,
    node_severity_aggregator,
)
from app.agents.nodes.interpreter_nodes import (
    node_context_retriever,
    node_grounded_response_gen,
    node_guardrail_check,
)
from app.agents.nodes.summary_nodes import (
    node_compile_clinical_brief,
    node_summarize_chronic,
    node_summarize_lab_trends,
    node_summarize_visits,
)
from app.agents.state import (
    ExtractionState,
    InteractionState,
    InterpreterState,
    SummaryState,
)
from app.core.config import settings
from app.schemas.summary import DoctorSummaryResponse


# ==============================================================================
# Workflow A: Document Extraction Graph & Nodes
# ==============================================================================

@pytest.mark.asyncio
async def test_extraction_nodes_ocr_and_parse():
    settings.USE_MOCK = True
    initial_state: ExtractionState = {
        "file_bytes": b"sample_bytes",
        "mime_type": "image/png",
        "document_type_hint": "prescription",
        "is_valid_medical_doc": True,
    }

    # 1. OCR Extract node
    ocr_res = await node_ocr_extract(initial_state)
    assert ocr_res["is_valid_medical_doc"] is True
    assert "draft_entities" in ocr_res
    assert ocr_res["category"] == "prescription"

    # 2. Entity Parse node
    merged = {**initial_state, **ocr_res}
    parse_res = node_entity_parse(merged)
    assert parse_res["draft_entities"] is not None

    # 3. Safety Audit node
    merged_parsed = {**merged, **parse_res}
    audit_res = node_safety_audit(merged_parsed)
    assert "draft_entities" in audit_res
    meds = audit_res["draft_entities"].get("medications", [])
    assert len(meds) > 0

    # 4. Human Review Pause node
    merged_audited = {**merged_parsed, **audit_res, "is_approved": False}
    pause_res = node_human_review_pause(merged_audited)
    assert pause_res["is_approved"] is False

    # 5. DB Commit node with is_approved=True
    merged_approved = {**merged_audited, "is_approved": True}
    commit_res = await node_db_commit(merged_approved)
    assert "saved_record" in commit_res
    assert commit_res["saved_record"]["status"] == "committed"


@pytest.mark.asyncio
async def test_document_extraction_graph_e2e():
    settings.USE_MOCK = True

    # Test HITL draft extraction pause (is_approved=False)
    draft_state = await run_document_extraction(
        file_bytes=b"fake_prescription_bytes",
        mime_type="image/png",
        document_type_hint="prescription",
        is_approved=False,
    )
    assert draft_state["is_valid_medical_doc"] is True
    assert draft_state["draft_entities"] is not None
    assert draft_state["saved_record"] is None

    # Test HITL confirmation flow (is_approved=True)
    confirmed_state = await run_document_extraction(
        file_bytes=b"fake_prescription_bytes",
        mime_type="image/png",
        document_type_hint="prescription",
        is_approved=True,
        record_id=str(uuid.uuid4()),
    )
    assert confirmed_state["is_approved"] is True
    assert confirmed_state["saved_record"] is not None


# ==============================================================================
# Workflow B: Interaction Evaluation Graph & Nodes
# ==============================================================================

def test_allergy_crosscheck_direct_hit():
    state: InteractionState = {
        "candidate_medications": ["Aspirin 75mg"],
        "active_medications": [{"name": "Warfarin 5mg"}],
        "allergies": [{"allergen": "Aspirin", "severity": "severe"}],
    }

    result = node_allergy_crosscheck(state)
    assert result["has_conflicts"] is True
    assert len(result["allergy_conflicts"]) == 1
    assert result["allergy_conflicts"][0]["severity"] == "critical"
    assert "اسپرین" in result["allergy_conflicts"][0]["recommendation_ur"] or "Aspirin" in result["allergy_conflicts"][0]["recommendation_en"]


@pytest.mark.asyncio
async def test_interaction_evaluation_graph_e2e():
    settings.USE_MOCK = True

    final_state = await run_interaction_evaluation(
        candidate_medications=["Aspirin 75mg"],
        active_medications=[{"name": "Warfarin", "dosage": "5mg", "frequency": "OD"}],
        allergies=[{"allergen": "Aspirin", "severity": "severe"}],
    )

    assert final_state["has_conflicts"] is True
    assert final_state["risk_level"] in ["critical", "moderate"]
    assert len(final_state["alerts"]) > 0
    assert "Disclaimer" in final_state["clinical_disclaimer"]


# ==============================================================================
# Workflow C: Grounded Prescription Interpreter Graph & Nodes
# ==============================================================================

def test_interpreter_guardrail_refusal():
    # Attempting to elicit an out-of-scope medical diagnosis
    state: InterpreterState = {
        "messages": [HumanMessage(content="Do I have cancer? Please diagnose my severe chest pain.")],
        "record_context": {"medications": [{"name": "Panadol 500mg"}]},
        "language_mode": "bilingual",
        "is_grounded": True,
    }

    guard_res = node_guardrail_check(state)
    assert guard_res["is_grounded"] is False
    assert "Out of scope" in guard_res["refusal_reason"]
    assert "ڈاکٹر" in guard_res["final_answer"] or "licensed physician" in guard_res["final_answer"]


@pytest.mark.asyncio
async def test_interpreter_grounded_rag_e2e():
    settings.USE_MOCK = True

    context = {
        "doctor_name": "Dr. Tariq",
        "hospital_name": "Shifa Clinic",
        "medications": [
            {
                "name": "Metformin 500mg",
                "dosage": "1 Tablet",
                "frequency": "BD",
                "instructions_en": "Take 1 tablet after meals",
                "instructions_ur": "کھانے کے بعد ایک گولی لیں",
            }
        ],
    }

    final_state = await run_grounded_rag(
        messages=["When should I take Metformin?"],
        record_context=context,
        language_mode="bilingual",
    )

    assert final_state["is_grounded"] is True
    assert len(final_state["final_answer"]) > 0
    assert final_state["audio_script_ur"] is not None


# ==============================================================================
# Workflow D: Doctor Summary Graph (Map-Reduce)
# ==============================================================================

def test_summary_map_nodes():
    state: SummaryState = {
        "patient_id": "test-patient",
        "patient_profile": {"full_name": "Ahmad Raza", "health_id": "HV-1234", "gender": "male", "blood_group": "B+"},
        "records": [
            {
                "document_type": "prescription",
                "consultation_date": "2025-01-10",
                "doctor_name": "Dr. Tariq",
                "extracted_data": {"diagnoses": ["Type 2 Diabetes Mellitus"]},
            }
        ],
        "active_medications": [{"name": "Metformin", "dosage": "500mg", "frequency": "BD"}],
        "allergies": [{"allergen": "Penicillin", "severity": "severe"}],
        "abnormal_biomarkers": [{"biomarker_name": "HbA1c", "value": 8.4, "unit": "%", "status": "high", "test_date": "2025-01-05"}],
    }

    # Map worker 1: Visits
    v_res = node_summarize_visits(state)
    assert v_res["visits_summary"]["total_visits"] == 1

    # Map worker 2: Chronic
    c_res = node_summarize_chronic(state)
    assert "Type 2 Diabetes Mellitus" in c_res["chronic_summary"]["active_diagnoses"]
    assert len(c_res["chronic_summary"]["current_medications"]) == 1

    # Map worker 3: Lab trends
    l_res = node_summarize_lab_trends(state)
    assert l_res["biomarkers_summary"]["abnormal_count"] == 1


@pytest.mark.asyncio
async def test_doctor_summary_graph_e2e():
    settings.USE_MOCK = True

    final_state = await run_doctor_summary(
        patient_profile={"full_name": "Ahmad Raza", "health_id": "HV-1234", "gender": "male"},
        records=[{"document_type": "prescription", "extracted_data": {"diagnoses": ["Hypertension"]}}],
        active_medications=[{"name": "Amlodipine 5mg"}],
        allergies=[{"allergen": "Sulfa", "severity": "mild"}],
        abnormal_biomarkers=[],
        patient_id=str(uuid.uuid4()),
    )

    assert final_state["final_summary"] is not None
    # Validate against Pydantic schema
    response_model = DoctorSummaryResponse.model_validate(final_state["final_summary"])
    assert response_model.patient_name is not None
    assert len(response_model.health_id) > 0
