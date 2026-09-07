# HealthVault AI — Vault / Document Ingestion Routes
# POST /api/v1/vault/upload              — local disk storage + metadata persistence
# POST /api/v1/vault/upload-and-extract  — legacy immediate extraction + persistence
# POST /api/v1/vault/extract-draft       — Vision LLM extraction without persistence
# POST /api/v1/vault/confirm-record      — user-reviewed HITL persistence
# DELETE /api/v1/vault/records/{record_id} — protected record deletion
# GET  /api/v1/vault/records/{user_id}   — list user medical records

import asyncio
import io
import json
import logging
from datetime import date
from typing import Any, AsyncGenerator, Dict, List, Optional
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse, Response, StreamingResponse
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.core.mock_data import (
    MOCK_LAB_EXTRACTION,
    MOCK_PRESCRIPTION_EXTRACTION,
    get_mock_user_records,
)
from app.models.allergy import Allergy
from app.models.biomarker import Biomarker
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.vault import (
    ConfirmRecordRequest,
    DeleteRecordResponse,
    DocumentDraftExtractionResponse,
    ExtractedEntities,
    ExtractionResponse,
    MedicalRecordResponse,
)
from app.services.image_preprocessor import preprocess_clinical_image
from app.services.pharmacopoeia import (
    match_and_correct_brand,
    sanitize_clinical_date,
    sanitize_dosage_fractions,
    validate_sig_frequency,
)
from pathlib import Path
from app.services.persistence_service import persistence_service
from app.services.storage_service import (
    generate_signed_document_url,
    get_supabase_client,
    storage_service,
    upload_medical_document_private,
)
from app.services.vision_provider import VisionProviderError, get_vision_provider
from app.agents.graphs.extraction_graph import run_document_extraction, document_extraction_graph


def extract_storage_path(url_or_path: str) -> str:
    """Extract clean storage path (e.g. 'anon/abc.jpg' or '{user_id}/{uuid}.jpg')
    from a full Supabase signed/public URL or relative path, ensuring no tokens or domains
    are saved to the database."""
    if not url_or_path:
        return ""
    clean = url_or_path.split("?")[0]
    bucket = settings.SUPABASE_STORAGE_BUCKET
    patterns = [
        f"/storage/v1/object/sign/{bucket}/",
        f"/storage/v1/object/public/{bucket}/",
        f"/storage/v1/object/authenticated/{bucket}/",
        f"/storage/v1/object/{bucket}/",
        "/api/v1/vault/raw-proxy/",
        "/uploads/documents/",
        "/uploads/",
    ]
    for p in patterns:
        if p in clean:
            return clean.split(p)[-1].lstrip("/")
    return clean.lstrip("/")

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/vault", tags=["Vault"])

VALID_DOCUMENT_TYPES = {
    "prescription", "lab_report", "ultrasound_report",
    "imaging_report", "discharge_summary", "clinical_note", "other_medical",
}


def _as_str_list(value: Any) -> List[str]:
    """Coerce LLM output into a list of non-empty strings (defensive normalization)."""
    if isinstance(value, str):
        return [value] if value.strip() else []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    return []


def _as_iso_date(value: Any) -> Optional[str]:
    """Normalize a date-like LLM value into an ISO date string for Pydantic parsing."""
    if value is None:
        return None
    if isinstance(value, date):
        return value.isoformat()
    text = str(value).strip()
    if not text:
        return None
    try:
        return date.fromisoformat(text).isoformat()
    except ValueError:
        logger.warning("Skipping non-ISO date value from extraction: %r", text)
        return None


def _parse_iso_date(value: Any) -> Optional[date]:
    iso_value = _as_iso_date(value)
    return date.fromisoformat(iso_value) if iso_value else None


def _validate_document_type(document_type: str) -> None:
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid document_type '{document_type}'. "
                f"Allowed: {', '.join(sorted(VALID_DOCUMENT_TYPES))}"
            ),
        )


def _entities_to_persistence_payload(entities: ExtractedEntities) -> Dict[str, Any]:
    payload = entities.model_dump(mode="json")
    payload["hospital_name"] = payload.get("clinic_hospital_name")
    payload["raw_ocr_text"] = payload.get("raw_text", "")
    payload["allergies"] = [
        {"allergen": allergen, "severity": "moderate", "reaction_details": None}
        for allergen in payload.get("allergies", [])
        if str(allergen).strip()
    ]
    payload["biomarkers"] = [
        {
            "biomarker_name": item.get("analyte_name"),
            "value": item.get("value"),
            "unit": item.get("unit"),
            "reference_min": item.get("ref_min"),
            "reference_max": item.get("ref_max"),
            "status": item.get("status", "normal"),
            "test_date": payload.get("consultation_date") or date.today().isoformat(),
        }
        for item in payload.get("biomarkers", [])
    ]
    return payload


def _allergy_names_from_record(record: MedicalRecord) -> set[str]:
    extracted = record.extracted_data or {}
    raw_allergies = extracted.get("allergies") or []
    names: set[str] = set()
    for item in raw_allergies:
        if isinstance(item, str) and item.strip():
            names.add(item.strip().lower())
        elif isinstance(item, dict) and str(item.get("allergen", "")).strip():
            names.add(str(item["allergen"]).strip().lower())
    return names


async def _load_record_with_entities(
    db: AsyncSession, record_id: UUID
) -> Optional[MedicalRecord]:
    result = await db.execute(
        select(MedicalRecord)
        .where(MedicalRecord.id == record_id)
        .options(selectinload(MedicalRecord.medications), selectinload(MedicalRecord.biomarkers))
    )
    return result.scalar_one_or_none()


@router.post(
    "/upload",
    response_model=MedicalRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Upload a medical document and persist its metadata",
)
async def upload_document(
    file: UploadFile = File(..., description="PDF / PNG / JPG medical document"),
    user_id: UUID = Form(...),
    document_type: str = Form(...),
    db: AsyncSession = Depends(get_db),
) -> MedicalRecordResponse:
    """Save the file to local disk and store record metadata in PostgreSQL."""
    _validate_document_type(document_type)

    file_bytes = await file.read()
    storage_path, _ = await upload_medical_document_private(
        file_bytes=file_bytes,
        original_filename=file.filename or "document.jpg",
        user_id=str(user_id),
    )

    record = MedicalRecord(
        user_id=user_id,
        document_type=document_type,
        document_url=storage_path,
        extracted_data={},
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    resp = MedicalRecordResponse.model_validate(record)
    resp.signed_url = generate_signed_document_url(record.document_url, expires_in=1800)
    return resp


@router.post(
    "/extract-draft",
    response_model=DocumentDraftExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload document and extract draft entities with a multimodal Vision LLM",
)
async def extract_draft(
    file: UploadFile = File(..., description="PDF / PNG / JPG medical document"),
    user_id: UUID = Form(...),
    document_type: str = Form("prescription"),
) -> DocumentDraftExtractionResponse:
    """Store the file and return Vision LLM entities without creating DB records.

    The Vision LLM first validates whether the file is a legitimate medical document.
    If not, the response contains is_medical_document=false with a rejection_reason.
    If valid, the response includes the AI-detected category and extracted entities.
    """
    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Uploaded document is empty.",
        )

    storage_path, optimized_bytes = await upload_medical_document_private(
        file_bytes=file_bytes,
        original_filename=file.filename or "document.jpg",
        user_id=str(user_id),
    )
    temp_file_url = generate_signed_document_url(storage_path, expires_in=1800) or storage_path

    try:
        final_state = await run_document_extraction(
            file_bytes=optimized_bytes,
            mime_type=file.content_type or "application/octet-stream",
            document_type_hint=document_type,
            is_approved=False,
            user_id=str(user_id),
            file_url=temp_file_url,
        )
    except Exception as exc:
        logger.exception("Vision extraction failed via DocumentExtractionGraph: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Vision extraction failed. Please retry or configure a valid provider key.",
        ) from exc

    # ── Check medical document validation gate ──
    is_medical = final_state.get("is_valid_medical_doc", True)
    if not is_medical:
        return DocumentDraftExtractionResponse(
            temp_file_url=temp_file_url,
            is_medical_document=False,
            rejection_reason=final_state.get("rejection_reason"),
            detected_document_type=None,
            confidence_score=final_state.get("confidence_score", 0.0),
            document_type="other_medical",
            extracted_data=None,
        )

    # ── Valid medical document — use AI-detected category ──
    detected_type = final_state.get("category") or document_type
    if detected_type not in VALID_DOCUMENT_TYPES:
        detected_type = "other_medical"

    draft_entities = final_state.get("draft_entities") or {}
    return DocumentDraftExtractionResponse(
        temp_file_url=temp_file_url,
        is_medical_document=True,
        rejection_reason=None,
        detected_document_type=detected_type,
        confidence_score=final_state.get("confidence_score", 0.9),
        document_type=detected_type,
        extracted_data=ExtractedEntities.model_validate(draft_entities),
    )


def _sse_event(event: str, data: Dict[str, Any]) -> str:
    """Format Server-Sent Event string with strict elimination of technical jargon."""
    raw_str = json.dumps(data, ensure_ascii=False)
    for forbidden in ["OCR", "ocr", "Pydantic", "pydantic", "LangGraph", "langgraph", "Base64", "base64", "Token", "token"]:
        raw_str = raw_str.replace(forbidden, "Clinical Document Engine")
    return f"event: {event}\ndata: {raw_str}\n\n"


@router.post(
    "/upload-stream",
    summary="Real-time Server-Sent Events (SSE) streaming document extraction",
)
async def upload_document_stream(
    file: UploadFile = File(..., description="PDF / PNG / JPG medical document"),
    user_id: Optional[str] = Form(None),
    document_type: str = Form("prescription"),
    db: AsyncSession = Depends(get_db),
) -> StreamingResponse:
    """Real-time SSE pipeline emitting warm, patient-friendly bilingual progress steps.
    Sequential Events:
      - Event: progress (step: reading, 25%)
      - Event: progress (step: identifying, 60%)
      - Event: progress (step: verifying, 85%)
      - Event: complete (step: complete, 100%, record payload)
      - Event: error (on validation failure or non-medical upload)
    Strictly forbids technical jargon in all event payloads.
    """
    if document_type not in VALID_DOCUMENT_TYPES:
        document_type = "prescription"

    # Read bytes before launching background stream generator
    file_bytes = await file.read()
    mime_type = file.content_type or "application/octet-stream"
    original_filename = file.filename or "medical_document"

    async def event_generator() -> AsyncGenerator[str, None]:
        if not file_bytes:
            yield _sse_event("error", {
                "step": "error",
                "message_en": "Please upload a clear medical slip or prescription.",
                "message_ur": "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔",
            })
            return

        try:
            # ── Event 1: Reading document ──
            yield _sse_event("progress", {
                "step": "reading",
                "percent": 25,
                "message_en": "Reading your document...",
                "message_ur": "آپ کی فائل پڑھی جا رہی ہے...",
            })
            await asyncio.sleep(0.1)

            # Store document and preprocess handwriting (deskew, CLAHE contrast, unsharp mask)
            storage_path, optimized_bytes = await upload_medical_document_private(
                file_bytes=file_bytes,
                original_filename=original_filename,
                user_id=str(user_id),
            )
            temp_file_url = generate_signed_document_url(storage_path, expires_in=1800) or storage_path
            processed_bytes = preprocess_clinical_image(optimized_bytes, mime_type)

            # ── Event 2: Identifying medicines & dosages ──
            yield _sse_event("progress", {
                "step": "identifying",
                "percent": 60,
                "message_en": "Identifying medicines and dosages...",
                "message_ur": "ادویات اور خوراک کی تفصیل سمجھی جا رہی ہے...",
            })
            await asyncio.sleep(0.1)

            # Vision extraction
            provider = get_vision_provider()
            try:
                extracted = await provider.extract_document_data(
                    image_bytes=processed_bytes,
                    mime_type=mime_type,
                    document_type=document_type,
                )
            except Exception as exc:
                logger.warning("Live vision extraction encountered error: %s", exc)
                if settings.USE_MOCK:
                    extracted = (
                        MOCK_LAB_EXTRACTION.model_dump(mode="json")
                        if document_type == "lab_report"
                        else MOCK_PRESCRIPTION_EXTRACTION.model_dump(mode="json")
                    )
                    extracted["is_medical_document"] = True
                else:
                    yield _sse_event("error", {
                        "step": "error",
                        "message_en": "Please upload a clear medical slip or prescription.",
                        "message_ur": "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔",
                    })
                    return

            # Check medical validation gate
            is_medical = extracted.get("is_medical_document", True)
            if not is_medical:
                yield _sse_event("error", {
                    "step": "error",
                    "message_en": "Please upload a clear medical slip or prescription.",
                    "message_ur": "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔",
                    "rejection_reason": extracted.get("rejection_reason"),
                })
                return

            # ── Event 3: Checking doctor instructions & Pharmacopoeia ──
            yield _sse_event("progress", {
                "step": "verifying",
                "percent": 85,
                "message_en": "Checking doctor instructions...",
                "message_ur": "ڈاکٹر کی ہدایات کی تصدیق کی جا رہی ہے...",
            })
            await asyncio.sleep(0.1)

            # Pass 2: Self-correction with Pakistani Pharmacopoeia
            raw_meds = extracted.get("medications") or []
            verified_meds = []
            for med in raw_meds:
                if not isinstance(med, dict):
                    continue
                name_str = str(med.get("name") or "").strip()
                if not name_str:
                    continue

                corrected_name, pharma_info, _ = match_and_correct_brand(name_str)
                med["name"] = corrected_name

                dose = str(med.get("dosage") or "")
                raw_frac = med.get("fraction")
                instr_en = str(med.get("instructions_en") or "")
                instr_ur = str(med.get("instructions_ur") or "")
                comb_text = f"{corrected_name} {dose} {instr_en} {instr_ur}".lower()

                # Protect fractional dosage
                san_dose, frac, frac_en, frac_ur = sanitize_dosage_fractions(dose, comb_text, raw_frac)
                med["dosage"] = san_dose
                med["fraction"] = frac
                med["fraction_label_en"] = med.get("fraction_label_en") or frac_en
                med["fraction_label_ur"] = med.get("fraction_label_ur") or frac_ur

                # Validate sig notation
                tb = med.get("timing_breakdown") if isinstance(med.get("timing_breakdown"), dict) else None
                timing_map, val_freq = validate_sig_frequency(str(med.get("frequency") or ""), tb, comb_text)
                med["timing_breakdown"] = timing_map
                if not med.get("frequency") or "1" in str(med.get("frequency")):
                    med["frequency"] = val_freq

                # Default purposes
                if pharma_info:
                    if not med.get("purpose_en"):
                        med["purpose_en"] = pharma_info.get("default_purpose_en")
                    if not med.get("purpose_ur"):
                        med["purpose_ur"] = pharma_info.get("default_purpose_ur")

                # Conversational Urdu audio script
                if not med.get("audio_script_ur"):
                    med_type = "شربت" if frac == "2_spoons" else ("کیپسول" if "cap" in corrected_name.lower() else "ٹیبلٹ")
                    timing_desc = "شام کو" if (timing_map.get("night") and not timing_map.get("morning")) else ("صبح اور شام" if (timing_map.get("morning") and timing_map.get("night")) else "دن میں ایک بار")
                    dur = med.get("duration_ur") or ""
                    dur_desc = f" یہ دوا {dur} تک جاری رکھیں۔" if dur else ""
                    med["audio_script_ur"] = f"{med_type} {corrected_name}۔ روزانہ {timing_desc} {med.get('fraction_label_ur')} پانی کے ساتھ لیں۔{dur_desc}"

                verified_meds.append(med)

            extracted["medications"] = verified_meds
            extracted["consultation_date"] = sanitize_clinical_date(extracted.get("consultation_date") or extracted.get("test_date"))

            # Determine detected category
            detected_type = extracted.get("detected_document_type") or document_type
            if detected_type not in VALID_DOCUMENT_TYPES:
                detected_type = "other_medical"

            record_id = str(uuid.uuid4())
            record_payload = {
                "id": record_id,
                "record_id": record_id,
                "user_id": user_id,
                "document_type": detected_type,
                "detected_document_type": detected_type,
                "document_url": temp_file_url,
                "temp_file_url": temp_file_url,
                "is_medical_document": True,
                "confidence_score": extracted.get("confidence_score", 0.95),
                "doctor_name": extracted.get("doctor_name"),
                "hospital_name": extracted.get("clinic_hospital_name"),
                "clinic_hospital_name": extracted.get("clinic_hospital_name"),
                "consultation_date": extracted.get("consultation_date"),
                "diagnoses": extracted.get("diagnoses", []),
                "medications": verified_meds,
                "allergies": extracted.get("allergies", []),
                "biomarkers": extracted.get("biomarkers", []),
                "raw_text": extracted.get("raw_text", ""),
            }

            # ── Event 4: Completion ──
            yield _sse_event("complete", {
                "step": "complete",
                "percent": 100,
                "message_en": "Document successfully processed.",
                "message_ur": "دستاویز کی تصدیق مکمل ہو گئی۔",
                "record": record_payload,
                "temp_file_url": temp_file_url,
            })

        except Exception as err:
            logger.exception("Streaming extraction failed: %s", err)
            yield _sse_event("error", {
                "step": "error",
                "message_en": "Please upload a clear medical slip or prescription.",
                "message_ur": "براہ کرم واضح نسخہ یا میڈیکل رپورٹ اپلوڈ کریں۔",
            })

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )


async def _check_duplicate_record(
    db: AsyncSession,
    user_id: UUID,
    document_type: str,
    doctor_name: Optional[str] = None,
    consultation_date: Optional[date] = None,
    raw_ocr_text: Optional[str] = None,
) -> Optional[MedicalRecord]:
    """Restriction check: Prevents duplicate medical documents from being saved twice for the same user."""
    stmt = select(MedicalRecord).where(
        MedicalRecord.user_id == user_id,
        MedicalRecord.document_type == document_type,
    )
    if consultation_date:
        stmt = stmt.where(MedicalRecord.consultation_date == consultation_date)
    if doctor_name and len(doctor_name.strip()) > 3:
        stmt = stmt.where(MedicalRecord.doctor_name == doctor_name)

    result = await db.execute(stmt)
    existing = result.scalars().first()
    if existing:
        return existing

    if raw_ocr_text and len(raw_ocr_text.strip()) > 30:
        stmt_ocr = select(MedicalRecord).where(
            MedicalRecord.user_id == user_id,
            func.length(MedicalRecord.raw_ocr_text) == len(raw_ocr_text.strip()),
        )
        res_ocr = await db.execute(stmt_ocr)
        existing_ocr = res_ocr.scalars().first()
        if existing_ocr:
            return existing_ocr

    return None


@router.post(
    "/confirm-record",
    response_model=MedicalRecordResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Persist user-reviewed extracted medical record entities",
)
async def confirm_record(
    payload: ConfirmRecordRequest,
    db: AsyncSession = Depends(get_db),
) -> MedicalRecordResponse:
    """Create a permanent MedicalRecord only after the user confirms edited data with duplicate restrictions."""
    _validate_document_type(payload.document_type)

    # ── Duplicate Document Restriction ──
    consult_dt = _parse_iso_date(payload.confirmed_data.consultation_date)
    dup = await _check_duplicate_record(
        db=db,
        user_id=payload.user_id,
        document_type=payload.document_type,
        doctor_name=payload.confirmed_data.doctor_name,
        consultation_date=consult_dt,
        raw_ocr_text=payload.confirmed_data.raw_text,
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate record restriction: This medical document has already been saved to your HealthVault.",
        )

    data = _entities_to_persistence_payload(payload.confirmed_data)

    storage_path = extract_storage_path(payload.file_url)

    record = MedicalRecord(
        user_id=payload.user_id,
        document_type=payload.document_type,
        document_url=storage_path,
        raw_ocr_text=payload.confirmed_data.raw_text,
        extracted_data=data,
        doctor_name=payload.confirmed_data.doctor_name,
        hospital_name=payload.confirmed_data.clinic_hospital_name,
        consultation_date=consult_dt,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    await persistence_service.save_extracted_entities(
        db=db,
        user_id=payload.user_id,
        record_id=record.id,
        document_type=payload.document_type,
        extracted_data=data,
    )

    saved_record = await _load_record_with_entities(db, record.id)
    if not saved_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found after save.")
    resp = MedicalRecordResponse.model_validate(saved_record)
    resp.signed_url = generate_signed_document_url(saved_record.document_url, expires_in=1800)
    return resp


from app.agents.vault_graph import vault_graph

@router.post(
    "/upload-and-extract",
    response_model=ExtractionResponse,
    status_code=status.HTTP_200_OK,
    summary="Upload document and run AI entity extraction pipeline with PostgreSQL persistence",
)
async def upload_and_extract(
    file: UploadFile = File(..., description="PDF / PNG / JPG medical document"),
    user_id: UUID = Form(...),
    document_type: str = Form("prescription"),
    db: AsyncSession = Depends(get_db),
) -> ExtractionResponse:
    """End-to-end flow: file storage → LangGraph pipeline extraction → persistence."""
    _validate_document_type(document_type)

    file_bytes = await file.read()
    storage_path, optimized_bytes = await upload_medical_document_private(
        file_bytes=file_bytes,
        original_filename=file.filename or "document.jpg",
        user_id=str(user_id),
    )

    # 2) Fallback mock branch when explicitly in mock mode.
    if settings.USE_MOCK:
        new_record_id = uuid.uuid4()
        mock_signed_url = generate_signed_document_url(storage_path, expires_in=1800) or storage_path
        if document_type == "lab_report":
            return MOCK_LAB_EXTRACTION.model_copy(
                update={"record_id": new_record_id, "document_url": mock_signed_url}
            )
        return MOCK_PRESCRIPTION_EXTRACTION.model_copy(
            update={"record_id": new_record_id, "document_url": mock_signed_url}
        )

    # 3) Run the LangGraph document extraction workflow
    state_input = {
        "file_bytes": optimized_bytes,
        "mime_type": file.content_type or "application/octet-stream",
        "document_type_hint": document_type,
    }
    
    try:
        final_state = await vault_graph.ainvoke(state_input)
    except Exception as e:
        logger.exception("Graph extraction failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Extraction pipeline failed: {str(e)}"
        )
        
    if not final_state.get("is_valid_medical_doc"):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail={
                "detail": "Uploaded file is not a valid clinical record.",
                "category": final_state.get("category", "non_medical"),
                "reason": final_state.get("rejection_reason", "Document validation failed.")
            }
        )

    # 4) Construct entities format for persistence
    extracted = final_state.get("extracted_data", {})
    consult_dt = _parse_iso_date(extracted.get("consultation_date"))
    raw_ocr = extracted.get("raw_text", "")
    doc_name = extracted.get("doctor_name")

    dup = await _check_duplicate_record(
        db=db,
        user_id=user_id,
        document_type=document_type,
        doctor_name=doc_name,
        consultation_date=consult_dt,
        raw_ocr_text=raw_ocr,
    )
    if dup:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Duplicate document restriction: This medical document is already saved in your HealthVault.",
        )

    record = MedicalRecord(
        user_id=user_id,
        document_type=document_type,
        document_url=storage_path,
        raw_ocr_text=raw_ocr,
        extracted_data=extracted,
        doctor_name=doc_name,
        hospital_name=extracted.get("clinic_hospital_name"),
        consultation_date=consult_dt,
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    await persistence_service.save_extracted_entities(
        db=db,
        user_id=user_id,
        record_id=record.id,
        document_type=document_type,
        extracted_data=extracted,
    )

    signed_doc_url = generate_signed_document_url(storage_path, expires_in=1800) or storage_path

    # 5) Return strictly validated ExtractionResponse for legacy clients.
    return ExtractionResponse(
        record_id=record.id,
        document_type=document_type,
        doctor_name=extracted.get("doctor_name"),
        hospital_name=extracted.get("clinic_hospital_name"),
        consultation_date=_as_iso_date(extracted.get("consultation_date")),
        diagnoses=extracted.get("diagnoses", []),
        medications=extracted.get("medications", []),
        allergies=[{"allergen": allergen, "severity": "moderate"} for allergen in extracted.get("allergies", [])],
        biomarkers=extracted.get("biomarkers", []),
        test_name=None,
        test_date=_as_iso_date(extracted.get("consultation_date")) if document_type == "lab_report" else None,
        surgical_notes=[],
        follow_up_instructions=[],
        document_url=signed_doc_url,
        raw_ocr_text=extracted.get("raw_text", ""),
    )


@router.get(
    "/records",
    response_model=List[MedicalRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all medical records for the authenticated user",
)
async def get_my_records(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[MedicalRecordResponse]:
    """Retrieve uploaded records with dynamically generated signed URLs for the authenticated user."""
    query = (
        select(MedicalRecord)
        .where(MedicalRecord.user_id == current_user.id)
        .options(selectinload(MedicalRecord.medications), selectinload(MedicalRecord.biomarkers))
        .order_by(MedicalRecord.created_at.desc())
    )
    result = await db.execute(query)
    records = result.scalars().all()
    out: List[MedicalRecordResponse] = []
    for r in records:
        rec_dict = MedicalRecordResponse.model_validate(r)
        rec_dict.signed_url = generate_signed_document_url(r.document_url, expires_in=1800)
        out.append(rec_dict)
    return out


@router.get(
    "/records/{user_id}",
    response_model=List[MedicalRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all medical records for a user",
)
async def get_user_records(
    user_id: UUID,
    db: AsyncSession = Depends(get_db),
) -> List[MedicalRecordResponse]:
    """Retrieve uploaded records with dynamically generated signed URLs for a given user."""
    if settings.USE_MOCK:
        mock_records = get_mock_user_records(user_id)
        for m in mock_records:
            m.signed_url = generate_signed_document_url(m.document_url, expires_in=1800)
        return mock_records

    query = (
        select(MedicalRecord)
        .where(MedicalRecord.user_id == user_id)
        .options(selectinload(MedicalRecord.medications), selectinload(MedicalRecord.biomarkers))
        .order_by(MedicalRecord.created_at.desc())
    )
    result = await db.execute(query)
    records = result.scalars().all()
    out: List[MedicalRecordResponse] = []
    for r in records:
        rec_dict = MedicalRecordResponse.model_validate(r)
        rec_dict.signed_url = generate_signed_document_url(r.document_url, expires_in=1800)
        out.append(rec_dict)
    return out


@router.delete(
    "/records/{record_id}",
    response_model=DeleteRecordResponse,
    status_code=status.HTTP_200_OK,
    summary="Delete a medical record and its linked normalized entities",
)
async def delete_record(
    record_id: UUID,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> DeleteRecordResponse:
    """Protected deletion scoped to the authenticated user's own vault record."""
    record = await _load_record_with_entities(db, record_id)
    if not record or record.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Record not found.")

    allergy_names = _allergy_names_from_record(record)
    if allergy_names:
        result = await db.execute(
            select(MedicalRecord).where(
                MedicalRecord.user_id == current_user.id,
                MedicalRecord.id != record_id,
            )
        )
        remaining_allergy_names: set[str] = set()
        for other_record in result.scalars().all():
            remaining_allergy_names.update(_allergy_names_from_record(other_record))
        deletable_allergies = allergy_names - remaining_allergy_names
        if deletable_allergies:
            await db.execute(
                delete(Allergy).where(
                    Allergy.user_id == current_user.id,
                    func.lower(Allergy.allergen).in_(deletable_allergies),
                )
            )

    await db.execute(delete(Medication).where(Medication.record_id == record_id))
    await db.execute(delete(Biomarker).where(Biomarker.record_id == record_id))
    await db.delete(record)
    await db.commit()

    return DeleteRecordResponse(
        status="success",
        message="Record deleted successfully",
    )


@router.get(
    "/raw-proxy/{storage_path:path}",
    summary="Secure proxy endpoint for local development or fallback storage",
)
async def raw_proxy_document(storage_path: str):
    """Streams local fallback files when direct Supabase signed URLs are not in use."""
    local_path = Path(settings.UPLOAD_DIR) / storage_path
    if local_path.is_file():
        ext = local_path.suffix.lower()
        media_types = {
            ".jpg": "image/jpeg",
            ".jpeg": "image/jpeg",
            ".png": "image/png",
            ".webp": "image/webp",
            ".pdf": "application/pdf",
        }
        return FileResponse(path=local_path, media_type=media_types.get(ext, "application/octet-stream"))

    client = get_supabase_client()
    if client:
        try:
            bucket = settings.SUPABASE_STORAGE_BUCKET
            file_bytes = client.storage.from_(bucket).download(storage_path)
            return Response(content=file_bytes, media_type="image/jpeg")
        except Exception as exc:
            logger.error("Raw proxy download failed for %s: %s", storage_path, exc)

    raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found.")
