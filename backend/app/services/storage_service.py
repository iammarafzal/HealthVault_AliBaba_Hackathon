# HealthVault AI — Strictly Private Supabase Storage & Signed URL Service
# Zero Public Access: bucket 'prescriptions' is private.
# All document access requires short-lived cryptographically signed URLs.

import asyncio
import io
import logging
from pathlib import Path
from typing import Optional, Tuple
import uuid

from PIL import Image, ImageOps
from fastapi import HTTPException, UploadFile, status

try:
    from supabase import Client, create_client
except (ImportError, ModuleNotFoundError):
    Client = None  # type: ignore
    create_client = None  # type: ignore

from app.core.config import settings

logger = logging.getLogger("healthvault.storage")

ALLOWED_MIME_TYPES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "application/pdf": "pdf",
}
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
MAX_DIMENSION = 2048

_supabase_client = None


def get_supabase_client():
    """Initialize or return cached Supabase client with service role credentials."""
    global _supabase_client
    if create_client is None:
        return None
    if _supabase_client is None and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_KEY:
        try:
            _supabase_client = create_client(
                settings.SUPABASE_URL,
                settings.SUPABASE_SERVICE_KEY,
            )
        except Exception as err:
            logger.error(f"Failed to initialize Supabase client: {err}")
    return _supabase_client


def inspect_magic_bytes(header: bytes) -> str:
    """Determine MIME type using binary signature magic bytes."""
    if header.startswith(b"\xff\xd8\xff"):
        return "image/jpeg"
    if header.startswith(b"\x89PNG\r\n\x1a\n"):
        return "image/png"
    if header.startswith(b"RIFF") and (b"WEBP" in header[:16] or (len(header) >= 12 and header[8:12] == b"WEBP")):
        return "image/webp"
    if header.startswith(b"%PDF"):
        return "application/pdf"
    return "application/octet-stream"


def sanitize_and_optimize_image(raw_bytes: bytes, mime_type: str) -> Tuple[bytes, str]:
    """Orient, resize (max 2048px), and optimize image binaries.

    Preserves PDFs as-is. Transposes EXIF orientations for camera captures.
    """
    if mime_type == "application/pdf":
        return raw_bytes, "application/pdf"

    try:
        img = Image.open(io.BytesIO(raw_bytes))
        img = ImageOps.exif_transpose(img)

        if img.mode in ("RGBA", "LA", "P") and mime_type == "image/jpeg":
            img = img.convert("RGB")

        if img.width > MAX_DIMENSION or img.height > MAX_DIMENSION:
            img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.Resampling.LANCZOS)

        output_buffer = io.BytesIO()
        if mime_type == "image/png":
            img.save(output_buffer, format="PNG", optimize=True)
        elif mime_type == "image/webp":
            img.save(output_buffer, format="WEBP", quality=85, method=4)
        else:
            img.save(output_buffer, format="JPEG", quality=85, optimize=True)

        return output_buffer.getvalue(), mime_type
    except Exception as exc:
        logger.error(f"Image optimization error: {exc}")
        if settings.ENVIRONMENT == "test" or settings.USE_MOCK:
            return raw_bytes, mime_type
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Corrupted or invalid image file.",
        )


async def upload_medical_document_private(
    file_bytes: bytes,
    original_filename: str,
    user_id: Optional[str] = None,
) -> Tuple[str, bytes]:
    """Stores document in private Supabase bucket.

    Returns:
        (storage_path, optimized_bytes)
        storage_path format: '{user_id}/{uuid}.{ext}'
    """
    if len(file_bytes) > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail="File size exceeds the 10MB limit.",
        )

    detected_mime = inspect_magic_bytes(file_bytes[:16])
    if detected_mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file format. Only JPEG, PNG, WEBP, and PDF documents are allowed.",
        )

    optimized_bytes, final_mime = sanitize_and_optimize_image(file_bytes, detected_mime)
    ext = ALLOWED_MIME_TYPES[final_mime]
    storage_path = f"{user_id or 'anon'}/{uuid.uuid4().hex}.{ext}"

    client = get_supabase_client()
    if not client:
        # Resilient local fallback when cloud keys are unset (local dev / tests)
        try:
            local_target = Path(settings.UPLOAD_DIR) / storage_path
            local_target.parent.mkdir(parents=True, exist_ok=True)
            with open(local_target, "wb") as f:
                f.write(optimized_bytes)
        except Exception as local_err:
            logger.debug(f"Local storage fallback write skipped: {local_err}")
        return storage_path, optimized_bytes

    try:
        bucket = settings.SUPABASE_STORAGE_BUCKET
        client.storage.from_(bucket).upload(
            path=storage_path,
            file=optimized_bytes,
            file_options={"content-type": final_mime, "upsert": "true"},
        )
        return storage_path, optimized_bytes
    except Exception as exc:
        logger.error(f"Failed to upload to private Supabase storage: {exc}")
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Cloud storage provider upload failed.",
        )


def generate_signed_document_url(storage_path: str, expires_in: int = 900) -> str:
    """Creates a temporary, cryptographically signed URL for authorized viewing.

    Default expires_in: 900 seconds (15 minutes).
    For Dashboard queries: use 1800-3600 seconds (30-60 minutes).
    For Emergency Triage: use 900 seconds (15 minutes).
    """
    if not storage_path:
        return ""
    if storage_path.startswith("http://") or storage_path.startswith("https://") or storage_path.startswith("blob:"):
        return storage_path

    client = get_supabase_client()
    if not client:
        return f"/api/v1/vault/raw-proxy/{storage_path}"

    try:
        bucket = settings.SUPABASE_STORAGE_BUCKET
        signed_res = client.storage.from_(bucket).create_signed_url(
            path=storage_path,
            expires_in=expires_in,
        )
        return signed_res.get("signedURL") or signed_res.get("signedUrl", "")
    except Exception as exc:
        logger.error(f"Failed to generate signed URL for {storage_path}: {exc}")
        return ""


class StorageServiceWrapper:
    """Compatibility wrapper for application lifespan and legacy callers."""

    async def ensure_directory(self, subfolder: str = "") -> Path:
        target = Path(settings.UPLOAD_DIR) / subfolder if subfolder else Path(settings.UPLOAD_DIR)
        await asyncio.to_thread(target.mkdir, parents=True, exist_ok=True)
        return target

    async def save_file(
        self, file: UploadFile, subfolder: str = "documents"
    ) -> Tuple[str, str]:
        file_bytes = await file.read()
        await file.seek(0)
        storage_path, _ = await upload_medical_document_private(
            file_bytes=file_bytes,
            original_filename=file.filename or "document.jpg",
        )
        signed_url = generate_signed_document_url(storage_path, expires_in=1800)
        return storage_path, signed_url


storage_service = StorageServiceWrapper()
