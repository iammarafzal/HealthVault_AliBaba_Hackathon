# HealthVault AI — Doctor Clinical Summary Nodes (Workflow D, Map-Reduce)
# Implements node_summarize_visits, node_summarize_chronic,
# node_summarize_lab_trends, and node_compile_clinical_brief.

import json
import logging
from typing import Any, Dict, List, Optional
from uuid import UUID

from app.agents.state import SummaryState
from app.core.config import settings
from app.schemas.summary import DoctorSummaryResponse
from app.services.llm_provider import get_llm_provider

logger = logging.getLogger("healthvault")


def node_summarize_visits(state: SummaryState) -> Dict[str, Any]:
    """Map Worker 1: Parallel extraction and structuring of past clinical visits,
    hospitalizations, surgical notes, and physician consultations.
    """
    records = state.get("records") or []
    visits: List[Dict[str, Any]] = []
    surgical_notes: List[str] = []

    for r in records:
        doc_type = r.get("document_type", "prescription")
        consult_dt = r.get("consultation_date")
        doctor = r.get("doctor_name")
        hospital = r.get("hospital_name")
        extracted = r.get("extracted_data") or {}

        diagnoses = extracted.get("diagnoses", [])
        if "procedures" in extracted:
            surgical_notes.extend(extracted["procedures"])
        if "surgical_notes" in extracted:
            surgical_notes.extend(extracted["surgical_notes"])

        visits.append({
            "type": doc_type,
            "date": str(consult_dt) if consult_dt else None,
            "doctor": doctor,
            "hospital": hospital,
            "diagnoses": diagnoses,
        })

    return {
        "visits_summary": {
            "total_visits": len(visits),
            "visits": visits[:5],  # top 5 most recent
            "surgical_history": list(dict.fromkeys(surgical_notes)),
        }
    }


def node_summarize_chronic(state: SummaryState) -> Dict[str, Any]:
    """Map Worker 2: Parallel evaluation of chronic illnesses, active maintenance
    medications, and documented allergies.
    """
    records = state.get("records") or []
    active_meds = state.get("active_medications") or []
    allergies = state.get("allergies") or []

    # Gather diagnoses across all records
    chronic_diagnoses: List[str] = []
    for r in records:
        extracted = r.get("extracted_data") or {}
        for d in extracted.get("diagnoses", []):
            if d and d not in chronic_diagnoses:
                chronic_diagnoses.append(d)

    formatted_meds: List[Dict[str, str]] = []
    for m in active_meds:
        formatted_meds.append({
            "name": m.get("name", "Unknown"),
            "dosage": m.get("dosage", ""),
            "frequency": m.get("frequency", ""),
        })

    formatted_allergies: List[Dict[str, str]] = []
    for a in allergies:
        formatted_allergies.append({
            "allergen": a.get("allergen", ""),
            "severity": a.get("severity", "moderate"),
        })

    return {
        "chronic_summary": {
            "active_diagnoses": chronic_diagnoses,
            "current_medications": formatted_meds,
            "known_allergies": formatted_allergies,
        }
    }


def node_summarize_lab_trends(state: SummaryState) -> Dict[str, Any]:
    """Map Worker 3: Parallel evaluation of lab biomarker trends, abnormal values,
    and reference range deviations.
    """
    abnormal = state.get("abnormal_biomarkers") or []
    trends: List[Dict[str, Any]] = []

    for b in abnormal:
        trends.append({
            "biomarker_name": b.get("biomarker_name"),
            "value": b.get("value"),
            "unit": b.get("unit"),
            "status": b.get("status"),
            "test_date": str(b.get("test_date")),
        })

    return {
        "biomarkers_summary": {
            "abnormal_count": len(trends),
            "recent_abnormal_biomarkers": trends[:10],
        }
    }


async def node_compile_clinical_brief(state: SummaryState) -> Dict[str, Any]:
    """Reduce Phase: Compiles the map workers' output into the concise 1-page
    clinical briefing adhering strictly to DoctorSummaryResponse.
    """
    if settings.USE_MOCK:
        from app.core.mock_data import MOCK_DOCTOR_SUMMARY
        mock_data = MOCK_DOCTOR_SUMMARY.model_dump(mode="json")
        return {"final_summary": mock_data}

    patient = state.get("patient_profile") or {}
    visits = state.get("visits_summary") or {}
    chronic = state.get("chronic_summary") or {}
    biomarkers = state.get("biomarkers_summary") or {}

    patient_name = patient.get("full_name") or "Unknown Patient"
    health_id = patient.get("health_id") or "HV-XXXXX"
    age_gender = f"{patient.get('gender', 'unknown').title()}"
    blood_group = patient.get("blood_group") or "N/A"

    active_diagnoses = chronic.get("active_diagnoses", [])
    current_medications = chronic.get("current_medications", [])
    known_allergies = chronic.get("known_allergies", [])
    surgical_history = visits.get("surgical_history", [])
    abnormal_bios = biomarkers.get("recent_abnormal_biomarkers", [])

    # Risk factor synthesis
    risk_factors: List[str] = []
    if any(a.get("severity") in ["severe", "critical"] for a in known_allergies):
        risk_factors.append("Severe medication allergies documented")
    if len(abnormal_bios) > 2:
        risk_factors.append("Multiple out-of-range biomarkers detected")
    if len(current_medications) >= 4:
        risk_factors.append("Polypharmacy regimen (>= 4 concurrent medications)")

    clinical_brief: Dict[str, Any] = {
        "patient_name": patient_name,
        "health_id": health_id,
        "age_gender": age_gender,
        "blood_group": blood_group,
        "active_diagnoses": active_diagnoses,
        "current_medications": current_medications,
        "known_allergies": known_allergies,
        "surgical_history": surgical_history,
        "recent_abnormal_biomarkers": abnormal_bios,
        "risk_factors": risk_factors,
        "clinical_notes": f"Generated clinical summary based on {visits.get('total_visits', 0)} vault records.",
    }

    return {"final_summary": clinical_brief}
