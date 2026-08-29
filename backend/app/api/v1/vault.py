# HealthVault AI — Vault / Document Ingestion Routes
# POST /api/v1/vault/upload            — local disk storage + metadata persistence
# POST /api/v1/vault/upload-and-extract — AI extraction pipeline & PostgreSQL entity persistence
# GET  /api/v1/vault/records/{user_id}  — list user medical records

import logging
from typing import List
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.agents.graph import run_medical_extraction
from app.core.config import settings
from app.core.database import get_db
from app.core.mock_data import (
    MOCK_LAB_EXTRACTION,
    MOCK_PRESCRIPTION_EXTRACTION,
    get_mock_user_records,
)
from app.models.record import MedicalRecord
from app.schemas.vault import ExtractionResponse, MedicalRecordResponse
from app.services.ocr_service import ocr_service
from app.services.persistence_service import persistence_service
from app.services.storage_service import storage_service

logger = logging.getLogger("healthvault")

router = APIRouter(prefix="/vault", tags=["Vault"])

VALID_DOCUMENT_TYPES = {"prescription", "lab_report", "discharge_summary"}


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
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid document_type '{document_type}'. "
                f"Allowed: {', '.join(sorted(VALID_DOCUMENT_TYPES))}"
            ),
        )

    _, document_url = await storage_service.save_file(file, subfolder="documents")

    record = MedicalRecord(
        user_id=user_id,
        document_type=document_type,
        document_url=document_url,
        extracted_data={},
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)
    return MedicalRecordResponse.model_validate(record)


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
    """End-to-end flow: file storage → PaddleOCR → LangGraph extraction → PostgreSQL persistence."""
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid document_type '{document_type}'. "
                f"Allowed: {', '.join(sorted(VALID_DOCUMENT_TYPES))}"
            ),
        )

    # 1) Persist uploaded file to storage (returns local disk path & public URL)
    local_path, document_url = await storage_service.save_file(
        file, subfolder="documents"
    )

    # 2) Fallback mock branch for offline development, tests, or demo mode
    if settings.USE_MOCK:
        new_record_id = uuid.uuid4()
        if document_type == "lab_report":
            return MOCK_LAB_EXTRACTION.model_copy(
                update={"record_id": new_record_id}
            )
        return MOCK_PRESCRIPTION_EXTRACTION.model_copy(
            update={"record_id": new_record_id}
        )

    # 3) Create initial MedicalRecord row in PostgreSQL
    record = MedicalRecord(
        user_id=user_id,
        document_type=document_type,
        document_url=document_url,
        extracted_data={},
    )
    db.add(record)
    await db.flush()
    await db.refresh(record)

    # 4) Extract text via PaddleOCR using the local file path
    raw_ocr_text = await ocr_service.process_document_async(local_path)
    record.raw_ocr_text = raw_ocr_text
    await db.flush()

    # 5) Execute LangGraph multi-agent extraction workflow
    extraction_result = await run_medical_extraction(
        str(user_id), document_type, raw_ocr_text
    )

    if extraction_result.get("errors"):
        logger.warning(
            "Extraction completed with errors for record %s: %s",
            record.id,
            extraction_result["errors"],
        )

    # 6) Persist structured entities into PostgreSQL (Medications, Allergies, Biomarkers)
    extracted_entities = extraction_result.get("extracted_entities", {})
    if extracted_entities:
        await persistence_service.save_extracted_entities(
            db=db,
            user_id=user_id,
            record_id=record.id,
            document_type=document_type,
            extracted_data=extracted_entities,
        )
        await db.refresh(record)

    # 7) Return strictly validated ExtractionResponse
    return ExtractionResponse(
        record_id=record.id,
        document_type=document_type,
        doctor_name=extracted_entities.get("doctor_name"),
        hospital_name=extracted_entities.get("hospital_name"),
        consultation_date=extracted_entities.get("consultation_date"),
        diagnoses=extracted_entities.get("diagnoses", []),
        medications=extracted_entities.get("medications", []),
        allergies=extracted_entities.get("allergies", []),
        raw_ocr_text=raw_ocr_text,
    )


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
    """Retrieve uploaded records with extracted metadata for a given user."""
    if settings.USE_MOCK:
        return get_mock_user_records(user_id)

    query = select(MedicalRecord).where(MedicalRecord.user_id == user_id).order_by(
        MedicalRecord.created_at.desc()
    )
    result = await db.execute(query)
    records = result.scalars().all()
    return [MedicalRecordResponse.model_validate(r) for r in records]
