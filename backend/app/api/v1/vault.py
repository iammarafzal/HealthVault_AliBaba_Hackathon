# HealthVault AI — Vault / Document Ingestion Routes
# POST /api/v1/vault/upload            — local disk storage + metadata persistence
# POST /api/v1/vault/upload-and-extract — AI extraction pipeline (future task)

from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.record import MedicalRecord
from app.schemas.vault import MedicalRecordResponse
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

    # Async disk persistence; raises 415 for unsupported extensions
    _, document_url = await storage_service.save_file(file, subfolder="documents")

    record = MedicalRecord(
        user_id=user_id,
        document_type=document_type,
        document_url=document_url,
        extracted_data={},  # populated later by the extraction pipeline
    )
    db.add(record)
    await db.flush()  # populate server-generated defaults before responding
    await db.refresh(record)
    return MedicalRecordResponse.model_validate(record)
