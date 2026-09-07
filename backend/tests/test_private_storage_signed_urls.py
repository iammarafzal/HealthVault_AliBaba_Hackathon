# HealthVault AI — Unit & Integration Tests: Strictly Private Supabase Storage & Ephemeral Signed URLs

import io
import uuid
from unittest.mock import MagicMock, patch
from PIL import Image
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.api.v1.vault import extract_storage_path
from app.services.storage_service import (
    ALLOWED_MIME_TYPES,
    generate_signed_document_url,
    inspect_magic_bytes,
    sanitize_and_optimize_image,
    upload_medical_document_private,
)


def _create_test_image(width: int = 100, height: int = 100, fmt: str = "JPEG") -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGB", (width, height), color=(255, 0, 0))
    img.save(buf, format=fmt)
    return buf.getvalue()


def _create_test_png(width: int = 100, height: int = 100) -> bytes:
    buf = io.BytesIO()
    img = Image.new("RGBA", (width, height), color=(0, 255, 0, 255))
    img.save(buf, format="PNG")
    return buf.getvalue()


# ── 1. Magic Bytes Inspection ─────────────────────────────────────────────────

def test_inspect_magic_bytes_jpeg():
    jpeg_bytes = _create_test_image(50, 50, "JPEG")
    assert inspect_magic_bytes(jpeg_bytes[:16]) == "image/jpeg"


def test_inspect_magic_bytes_png():
    png_bytes = _create_test_png(50, 50)
    assert inspect_magic_bytes(png_bytes[:16]) == "image/png"


def test_inspect_magic_bytes_pdf():
    pdf_bytes = b"%PDF-1.4\n%\xe2\xe3\xcf\xd3\n"
    assert inspect_magic_bytes(pdf_bytes[:16]) == "application/pdf"


def test_inspect_magic_bytes_invalid():
    invalid_bytes = b"NOT_AN_IMAGE_OR_PDF_HEADER"
    assert inspect_magic_bytes(invalid_bytes[:16]) == "application/octet-stream"


# ── 2. Image Optimization & Resizing ──────────────────────────────────────────

def test_sanitize_and_optimize_image_max_dimension():
    # Image larger than MAX_DIMENSION (2048px)
    large_img_bytes = _create_test_image(2500, 1500, "JPEG")
    optimized, mime = sanitize_and_optimize_image(large_img_bytes, "image/jpeg")
    assert mime == "image/jpeg"

    # Verify resized dimension <= 2048
    opt_img = Image.open(io.BytesIO(optimized))
    assert max(opt_img.width, opt_img.height) <= 2048


def test_sanitize_and_optimize_image_rgba_to_jpeg():
    png_rgba = _create_test_png(200, 200)
    optimized, mime = sanitize_and_optimize_image(png_rgba, "image/jpeg")
    assert mime == "image/jpeg"
    opt_img = Image.open(io.BytesIO(optimized))
    assert opt_img.mode == "RGB"


# ── 3. Clean Path Extraction ──────────────────────────────────────────────────

def test_extract_storage_path_from_signed_url():
    signed_url = (
        "https://abcxyz.supabase.co/storage/v1/object/sign/prescriptions/"
        "user123/doc_456.jpg?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.token"
    )
    extracted = extract_storage_path(signed_url)
    assert extracted == "user123/doc_456.jpg"


def test_extract_storage_path_from_public_url():
    public_url = (
        "https://abcxyz.supabase.co/storage/v1/object/public/prescriptions/"
        "records/patient_1/scan.png"
    )
    extracted = extract_storage_path(public_url)
    assert extracted == "records/patient_1/scan.png"


def test_extract_storage_path_already_clean():
    clean_path = "user_abc/uuid_123.webp"
    extracted = extract_storage_path(clean_path)
    assert extracted == "user_abc/uuid_123.webp"


# ── 4. Signed URL Generation ──────────────────────────────────────────────────

def test_generate_signed_document_url_with_supabase_mock():
    mock_supabase = MagicMock()
    mock_storage_bucket = MagicMock()
    mock_storage_bucket.create_signed_url.return_value = {
        "signedURL": "https://xyz.supabase.co/storage/v1/object/sign/prescriptions/u1/doc.jpg?token=mocktoken123"
    }
    mock_supabase.storage.from_.return_value = mock_storage_bucket

    with patch("app.services.storage_service.get_supabase_client", return_value=mock_supabase):
        url = generate_signed_document_url("u1/doc.jpg", expires_in=1800)
        assert "token=mocktoken123" in url
        mock_storage_bucket.create_signed_url.assert_called_once_with(
            path="u1/doc.jpg",
            expires_in=1800,
        )


def test_generate_signed_document_url_fallback_when_no_client():
    with patch("app.services.storage_service.get_supabase_client", return_value=None):
        url = generate_signed_document_url("u1/doc.jpg", expires_in=900)
        assert url == "/api/v1/vault/raw-proxy/u1/doc.jpg"


# ── 5. End-to-End Private Upload ──────────────────────────────────────────────

@pytest.mark.asyncio
async def test_upload_medical_document_private_with_mock_client():
    mock_supabase = MagicMock()
    mock_bucket = MagicMock()
    mock_supabase.storage.from_.return_value = mock_bucket

    jpeg_bytes = _create_test_image(100, 100, "JPEG")
    with patch("app.services.storage_service.get_supabase_client", return_value=mock_supabase):
        storage_path, opt_bytes = await upload_medical_document_private(
            file_bytes=jpeg_bytes,
            original_filename="rx.jpg",
            user_id="test-user-id",
        )
        assert storage_path.startswith("test-user-id/")
        assert storage_path.endswith(".jpg")
        mock_bucket.upload.assert_called_once()


# ── 6. Vault Records & Emergency API Signed URLs ──────────────────────────────

@pytest.mark.asyncio
async def test_vault_records_endpoint_returns_signed_url():
    """Verify GET /api/v1/vault/records/{user_id} generates signed_url dynamically."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        test_uid = uuid.uuid4()
        resp = await client.get(f"/api/v1/vault/records/{test_uid}")
        assert resp.status_code == 200
        records = resp.json()
        assert isinstance(records, list)
        for r in records:
            assert "signed_url" in r
            assert r["signed_url"] is not None
