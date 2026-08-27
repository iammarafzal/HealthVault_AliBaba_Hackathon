import uuid
import pytest

from app.agents.graph import build_extraction_graph, extraction_graph, run_medical_extraction
from app.agents.nodes import (
    clinical_summary_extraction_node,
    lab_extraction_node,
    prescription_extraction_node,
    route_by_document_type,
    validation_node,
)
from app.agents.state import MedicalAgentState
from app.core.config import settings
from app.schemas.vault import ExtractionResponse


def test_graph_compilation():
    graph = build_extraction_graph()
    assert graph is not None


def test_route_by_document_type():
    state_rx: MedicalAgentState = {
        "user_id": str(uuid.uuid4()),
        "document_type": "prescription",
        "raw_image_url": None,
        "raw_ocr_text": "Sample text",
        "extracted_entities": {},
        "drug_interaction_flags": [],
        "lab_biomarkers": [],
        "errors": [],
    }
    assert route_by_document_type(state_rx) == "prescription_extraction_node"

    state_lab: MedicalAgentState = {
        **state_rx,
        "document_type": "lab_report",
    }
    assert route_by_document_type(state_lab) == "lab_extraction_node"

    state_discharge: MedicalAgentState = {
        **state_rx,
        "document_type": "discharge_summary",
    }
    assert route_by_document_type(state_discharge) == "clinical_summary_extraction_node"


@pytest.mark.asyncio
async def test_prescription_extraction_node():
    settings.USE_MOCK = True
    state: MedicalAgentState = {
        "user_id": str(uuid.uuid4()),
        "document_type": "prescription",
        "raw_image_url": None,
        "raw_ocr_text": "Dr. Tariq Mahmood\nRx: Metformin 500mg BD",
        "extracted_entities": {},
        "drug_interaction_flags": [],
        "lab_biomarkers": [],
        "errors": [],
    }
    res = await prescription_extraction_node(state)
    assert "extracted_entities" in res
    assert "medications" in res["extracted_entities"]
    assert len(res["extracted_entities"]["medications"]) >= 1


@pytest.mark.asyncio
async def test_lab_extraction_node():
    settings.USE_MOCK = True
    state: MedicalAgentState = {
        "user_id": str(uuid.uuid4()),
        "document_type": "lab_report",
        "raw_image_url": None,
        "raw_ocr_text": "Chughtai Lab - HbA1c 7.4%",
        "extracted_entities": {},
        "drug_interaction_flags": [],
        "lab_biomarkers": [],
        "errors": [],
    }
    res = await lab_extraction_node(state)
    assert "extracted_entities" in res
    assert res["extracted_entities"]["document_type"] == "lab_report"


def test_validation_node_success():
    mock_payload = {
        "record_id": str(uuid.uuid4()),
        "document_type": "prescription",
        "doctor_name": "Dr. Tariq Mahmood",
        "hospital_name": "Shifa International",
        "consultation_date": "2025-02-15",
        "diagnoses": ["Type 2 Diabetes Mellitus"],
        "medications": [
            {
                "name": "Metformin",
                "dosage": "500mg",
                "frequency": "BD",
                "timing": "After meals",
                "instructions_en": "Take 1 tablet twice daily",
                "instructions_ur": "کھانے کے بعد ایک گولی لیں",
                "is_active": True,
            }
        ],
        "allergies": [
            {
                "allergen": "Penicillin",
                "severity": "severe",
                "reaction_details": "Hives",
            }
        ],
        "raw_ocr_text": "Sample OCR text",
    }
    state: MedicalAgentState = {
        "user_id": str(uuid.uuid4()),
        "document_type": "prescription",
        "raw_image_url": None,
        "raw_ocr_text": "Sample OCR text",
        "extracted_entities": mock_payload,
        "drug_interaction_flags": [],
        "lab_biomarkers": [],
        "errors": [],
    }
    res = validation_node(state)
    assert len(res["errors"]) == 0


@pytest.mark.asyncio
async def test_run_medical_extraction_end_to_end():
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())
    raw_ocr = "Dr. Tariq Mahmood - Shifa International\nRx: Metformin 500mg BD"

    final_state = await run_medical_extraction(
        user_id=user_id,
        document_type="prescription",
        raw_ocr_text=raw_ocr,
    )

    assert final_state["user_id"] == user_id
    assert final_state["document_type"] == "prescription"
    assert "extracted_entities" in final_state
    assert len(final_state["errors"]) == 0

    # Ensure validated against ExtractionResponse schema
    validated = ExtractionResponse.model_validate(final_state["extracted_entities"])
    assert validated.document_type in ["prescription", "lab_report", "discharge_summary"]
