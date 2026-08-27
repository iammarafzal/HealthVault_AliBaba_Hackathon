# HealthVault AI — Vault / Document Ingestion Routes
# POST /api/v1/vault/upload            — local disk storage + metadata persistence
# POST /api/v1/vault/upload-and-extract — AI extraction pipeline (or mock when USE_MOCK=True)
# GET  /api/v1/vault/records/{user_id}  — list user medical records

from typing import List, Optional
import uuid
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.core.mock_data import (
    MOCK_LAB_EXTRACTION,
    MOCK_PRESCRIPTION_EXTRACTION,
    get_mock_user_records,
)
from app.models.record import MedicalRecord
from app.schemas.vault import ExtractionResponse, MedicalRecordResponse
from app.services.storage_service import storage_service

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
    summary="Upload document and run AI entity extraction pipeline",
)
async def upload_and_extract(
    file: UploadFile = File(..., description="PDF / PNG / JPG medical document"),
    user_id: UUID = Form(...),
    document_type: str = Form("prescription"),
) -> ExtractionResponse:
    """Upload document, persist to storage, and return structured medical entities."""
    if document_type not in VALID_DOCUMENT_TYPES:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                f"Invalid document_type '{document_type}'. "
                f"Allowed: {', '.join(sorted(VALID_DOCUMENT_TYPES))}"
            ),
        )

    # Save physical file to storage
    await storage_service.save_file(file, subfolder="documents")
    new_record_id = uuid.uuid4()

    # Feature flag check for mock responses or agent fallback
    if settings.USE_MOCK:
        if document_type == "lab_report":
            return MOCK_LAB_EXTRACTION.model_copy(
                update={"record_id": new_record_id}
            )
        return MOCK_PRESCRIPTION_EXTRACTION.model_copy(
            update={"record_id": new_record_id}
        )

    # Live agent pipeline integration branch (future task)
    raise HTTPException(
        status_code=status.HTTP_501_NOT_IMPLEMENTED,
        detail="AI extraction pipeline agent is being initialized. Set USE_MOCK=True for testing.",
    )


@router.get(
    "/records/{user_id}",
    response_model=List[MedicalRecordResponse],
    status_code=status.HTTP_200_OK,
    summary="Get all medical records for a user",
)
async def get_user_records(
    user_id: UUID,
) -> List[MedicalRecordResponse]:
    """Retrieve uploaded records with extracted metadata for a given user."""
    if settings.USE_MOCK:
        return get_mock_user_records(user_id)

    # In live mode without mock flag, query database
    from app.core.database import async_session_factory

    async with async_session_factory() as session:
        query = select(MedicalRecord).where(MedicalRecord.user_id == user_id).order_by(
            MedicalRecord.created_at.desc()
        )
        result = await session.execute(query)
        records = result.scalars().all()
        return [MedicalRecordResponse.model_validate(r) for r in records]
