import base64
import logging
from typing import Dict, Any, List, Optional, Literal, TypedDict
from langchain_core.messages import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
from pydantic import ValidationError

from app.core.config import settings
from app.schemas.vault_extraction import (
    DocumentValidationResult,
    StructuredPrescriptionOutput,
    StructuredLabReportOutput,
    StructuredRadiologyOutput,
    StructuredDischargeSummaryOutput
)
from app.services.image_preprocessor import preprocess_clinical_image
from app.services.pharmacopoeia import (
    match_and_correct_brand,
    sanitize_clinical_date,
    sanitize_dosage_fractions,
    validate_sig_frequency,
)

logger = logging.getLogger("healthvault")

# Try importing the Gemini model
try:
    from langchain_google_genai import ChatGoogleGenerativeAI
    has_google_genai = True
except ImportError:
    has_google_genai = False

# State definition
class VaultProcessingState(TypedDict):
    file_bytes: bytes
    mime_type: str
    document_type_hint: str
    raw_ocr_text: Optional[str]
    is_valid_medical_doc: bool
    category: Optional[Literal["prescription", "lab_report", "radiology", "discharge_summary", "other_medical", "non_medical"]]
    confidence_score: float
    rejection_reason: Optional[str]
    extracted_data: Optional[Dict[str, Any]]
    validation_errors: List[str]

def get_vision_llm():
    if not has_google_genai or not settings.GEMINI_API_KEY:
        raise RuntimeError("Google GenAI not configured or installed. Cannot use vault graph.")
    return ChatGoogleGenerativeAI(
        model=settings.VISION_MODEL,
        google_api_key=settings.GEMINI_API_KEY,
        temperature=0.0
    )

def _build_image_message(prompt: str, file_bytes: bytes, mime_type: str) -> HumanMessage:
    encoded_image = base64.b64encode(file_bytes).decode("utf-8")
    return HumanMessage(
        content=[
            {"type": "text", "text": prompt},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{encoded_image}"}
            }
        ]
    )

async def document_validation_guard_node(state: VaultProcessingState) -> Dict[str, Any]:
    # Clinical handwriting enhancement: deskewing, CLAHE contrast enhancement, unsharp mask
    enhanced_bytes = preprocess_clinical_image(state["file_bytes"], state["mime_type"])

    llm = get_vision_llm()
    structured_llm = llm.with_structured_output(DocumentValidationResult)
    
    sys_msg = SystemMessage(content="You are a strict medical document validator. Determine if this image is a genuine clinical document (prescription, lab report, radiology/imaging, discharge summary) or non-medical (receipt, selfie, random note).")
    human_msg = _build_image_message("Classify this document.", enhanced_bytes, state["mime_type"])
    
    try:
        res: DocumentValidationResult = await structured_llm.ainvoke([sys_msg, human_msg])
        return {
            "file_bytes": enhanced_bytes,
            "is_valid_medical_doc": res.is_valid_medical_doc,
            "category": res.category,
            "confidence_score": res.confidence_score,
            "rejection_reason": res.rejection_reason
        }
    except Exception as e:
        logger.error(f"Validation guard failed: {e}")
        return {
            "is_valid_medical_doc": False,
            "category": "non_medical",
            "rejection_reason": "Failed to validate document due to an internal error.",
            "confidence_score": 0.0,
            "validation_errors": [str(e)]
        }

async def rejection_terminal_node(state: VaultProcessingState) -> Dict[str, Any]:
    # Terminal node just to explicitly end the rejected flow
    return {}

def route_category(state: VaultProcessingState):
    if not state.get("is_valid_medical_doc"):
        return "rejection_terminal"
        
    cat = state.get("category")
    if cat == "lab_report":
        return "lab_report_extraction"
    elif cat in ["radiology", "ultrasound_report", "imaging_report"]:
        return "radiology_extraction"
    elif cat == "discharge_summary":
        return "discharge_summary_extraction"
    else:
        return "prescription_extraction"

def _get_prescription_system_prompt() -> str:
    return """You are a highly accurate clinical extraction AI. Extract prescription details exactly as written.
CRITICAL RULES FOR PAKISTANI / SOUTH ASIAN PRESCRIPTIONS:
1. QUANTITY PRESERVATION: Never drop units. If "2 tsp", dose_quantity="2 teaspoons". If "1 tab", dose_quantity="1 tablet".
2. FRACTIONS: "آدھی گولی" or "1/2 tab" must be dose_quantity="0.5 tablet".
3. TIMING/SLOTS: 
   - "1+1+1" or "TDS" -> morning: true, afternoon: true, evening: true (frequency: 3)
   - "1+0+1" or "BD" -> morning: true, afternoon: false, evening: true (frequency: 2)
   - "0+0+1" or "OD Night" -> morning: false, afternoon: false, evening: true (frequency: 1)
   - "0+1+0" -> afternoon: true (frequency: 1)
4. MEALS: AC -> before_meals, PC -> after_meals.
Extract all medications."""

async def prescription_extraction_node(state: VaultProcessingState) -> Dict[str, Any]:
    llm = get_vision_llm()
    structured_llm = llm.with_structured_output(StructuredPrescriptionOutput)
    
    sys_msg = SystemMessage(content=_get_prescription_system_prompt())
    human_msg = _build_image_message("Extract prescription details.", state["file_bytes"], state["mime_type"])
    
    try:
        res: StructuredPrescriptionOutput = await structured_llm.ainvoke([sys_msg, human_msg])
        # Ensure exact mapping to persistence layer keys
        payload = res.model_dump(mode="json")
        if "diagnoses" not in payload or payload["diagnoses"] is None:
            payload["diagnoses"] = []
        return {"extracted_data": payload}
    except Exception as e:
        return {"validation_errors": [f"Prescription extraction failed: {e}"]}

async def lab_report_extraction_node(state: VaultProcessingState) -> Dict[str, Any]:
    llm = get_vision_llm()
    structured_llm = llm.with_structured_output(StructuredLabReportOutput)
    sys_msg = SystemMessage(content="Extract lab report details and biomarkers.")
    human_msg = _build_image_message("Extract lab biomarkers.", state["file_bytes"], state["mime_type"])
    try:
        res = await structured_llm.ainvoke([sys_msg, human_msg])
        return {"extracted_data": res.model_dump(mode="json")}
    except Exception as e:
        return {"validation_errors": [f"Lab report extraction failed: {e}"]}

async def radiology_extraction_node(state: VaultProcessingState) -> Dict[str, Any]:
    llm = get_vision_llm()
    structured_llm = llm.with_structured_output(StructuredRadiologyOutput)
    sys_msg = SystemMessage(content="Extract radiology imaging report findings and impression.")
    human_msg = _build_image_message("Extract radiology report.", state["file_bytes"], state["mime_type"])
    try:
        res = await structured_llm.ainvoke([sys_msg, human_msg])
        return {"extracted_data": res.model_dump(mode="json")}
    except Exception as e:
        return {"validation_errors": [f"Radiology extraction failed: {e}"]}

async def discharge_summary_extraction_node(state: VaultProcessingState) -> Dict[str, Any]:
    llm = get_vision_llm()
    structured_llm = llm.with_structured_output(StructuredDischargeSummaryOutput)
    sys_msg = SystemMessage(content="Extract discharge summary details, medications and follow-up instructions.")
    human_msg = _build_image_message("Extract discharge summary.", state["file_bytes"], state["mime_type"])
    try:
        res = await structured_llm.ainvoke([sys_msg, human_msg])
        return {"extracted_data": res.model_dump(mode="json")}
    except Exception as e:
        return {"validation_errors": [f"Discharge summary extraction failed: {e}"]}

async def clinical_consistency_check_node(state: VaultProcessingState) -> Dict[str, Any]:
    """Pass 2: Pakistani Pharmacopoeia Cross-Reference & Self-Correction Node.
    - Grounds brand names against South Asian pharmaceutical dictionary (Levenshtein <= 2).
    - Protects fractional dosages (preventing '0.5 tablet' / 'آدھی گولی' from becoming '5 tablets').
    - Validates sig notation ('1+0+1' -> 2 doses/day: Morning and Night).
    - Validates clinical dates (no future dates, infers missing or OCR-corrupted years).
    """
    extracted = state.get("extracted_data")
    if not extracted:
        return {"validation_errors": state.get("validation_errors", []) + ["No extracted data found."]}

    # Ensure list fields exist
    if "medications" not in extracted or not isinstance(extracted["medications"], list):
        extracted["medications"] = []
    if "diagnoses" not in extracted or not isinstance(extracted["diagnoses"], list):
        extracted["diagnoses"] = []
    if "allergies" not in extracted or not isinstance(extracted["allergies"], list):
        extracted["allergies"] = []
    if "biomarkers" not in extracted or not isinstance(extracted["biomarkers"], list):
        extracted["biomarkers"] = []

    # 1. Sanitize consultation date
    if extracted.get("consultation_date"):
        extracted["consultation_date"] = sanitize_clinical_date(extracted["consultation_date"])

    # 2. Cross-reference each medication
    sanitized_meds = []
    for med in extracted["medications"]:
        if not isinstance(med, dict):
            continue
        raw_name = str(med.get("name") or "").strip()
        if not raw_name:
            continue

        corrected_name, pharma_info, _ = match_and_correct_brand(raw_name)
        med["name"] = corrected_name

        instr_en = str(med.get("instructions_en") or "")
        instr_ur = str(med.get("instructions_ur") or "")
        dose = str(med.get("dosage") or "")
        comb_text = f"{corrected_name} {dose} {instr_en} {instr_ur}".lower()

        # Sanitize dosage & fraction protection
        raw_fraction = med.get("fraction")
        sanitized_dosage, fraction, frac_lbl_en, frac_lbl_ur = sanitize_dosage_fractions(
            dose, comb_text, raw_fraction
        )
        med["dosage"] = sanitized_dosage
        med["fraction"] = fraction
        med["fraction_label_en"] = med.get("fraction_label_en") or frac_lbl_en
        med["fraction_label_ur"] = med.get("fraction_label_ur") or frac_lbl_ur

        # Validate sig notation
        raw_freq = str(med.get("frequency") or "")
        tb = med.get("timing_breakdown") if isinstance(med.get("timing_breakdown"), dict) else None
        timing_map, validated_freq = validate_sig_frequency(raw_freq, tb, comb_text)
        med["timing_breakdown"] = timing_map
        if not raw_freq or "1" in raw_freq:
            med["frequency"] = validated_freq

        # Purpose enrichment from Pharmacopoeia if missing
        if pharma_info:
            if not med.get("purpose_en"):
                med["purpose_en"] = pharma_info.get("default_purpose_en")
            if not med.get("purpose_ur"):
                med["purpose_ur"] = pharma_info.get("default_purpose_ur")

        # Conversational Urdu audio script
        if not med.get("audio_script_ur"):
            med_type = "شربت" if fraction == "2_spoons" else ("کیپسول" if "cap" in corrected_name.lower() else "ٹیبلٹ")
            dose_desc = med.get("fraction_label_ur") or frac_lbl_ur
            timing_desc = "شام کو" if (timing_map.get("night") and not timing_map.get("morning")) else ("صبح اور شام" if (timing_map.get("morning") and timing_map.get("night")) else "دن میں ایک بار")
            dur = med.get("duration_ur") or ""
            dur_desc = f" یہ دوا {dur} تک جاری رکھیں۔" if dur else ""
            med["audio_script_ur"] = f"{med_type} {corrected_name}۔ روزانہ {timing_desc} {dose_desc} پانی کے ساتھ لیں۔{dur_desc}"

        sanitized_meds.append(med)

    extracted["medications"] = sanitized_meds
    return {"extracted_data": extracted}

# Graph Construction
workflow = StateGraph(VaultProcessingState)

workflow.add_node("document_validation_guard_node", document_validation_guard_node)
workflow.add_node("rejection_terminal", rejection_terminal_node)

workflow.add_node("prescription_extraction", prescription_extraction_node)
workflow.add_node("lab_report_extraction", lab_report_extraction_node)
workflow.add_node("radiology_extraction", radiology_extraction_node)
workflow.add_node("discharge_summary_extraction", discharge_summary_extraction_node)

workflow.add_node("clinical_consistency_check_node", clinical_consistency_check_node)

workflow.set_entry_point("document_validation_guard_node")

workflow.add_conditional_edges(
    "document_validation_guard_node",
    route_category,
    {
        "rejection_terminal": "rejection_terminal",
        "prescription_extraction": "prescription_extraction",
        "lab_report_extraction": "lab_report_extraction",
        "radiology_extraction": "radiology_extraction",
        "discharge_summary_extraction": "discharge_summary_extraction"
    }
)

workflow.add_edge("prescription_extraction", "clinical_consistency_check_node")
workflow.add_edge("lab_report_extraction", "clinical_consistency_check_node")
workflow.add_edge("radiology_extraction", "clinical_consistency_check_node")
workflow.add_edge("discharge_summary_extraction", "clinical_consistency_check_node")

workflow.add_edge("clinical_consistency_check_node", END)
workflow.add_edge("rejection_terminal", END)

vault_graph = workflow.compile()
