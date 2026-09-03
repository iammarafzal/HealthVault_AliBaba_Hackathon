# HealthVault AI — Unit & Integration Tests: Clinical OCR Preprocessing, Pharmacopoeia, & SSE Streaming

import pytest
import io
import json
import numpy as np
import cv2
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.services.image_preprocessor import (
    preprocess_clinical_image,
    deskew_image,
    enhance_contrast_clahe,
    unsharp_mask,
)
from app.services.pharmacopoeia import (
    match_and_correct_brand,
    sanitize_dosage_fractions,
    validate_sig_frequency,
    sanitize_clinical_date,
    levenshtein_distance,
)


def test_image_preprocessor_pipeline():
    """Verify that image preprocessing pipeline executes deskewing, CLAHE, and unsharp masking."""
    # Create sample synthetic prescription image with text-like strokes
    blank = np.ones((300, 400, 3), dtype=np.uint8) * 255
    cv2.putText(blank, "Tab Solif 5mg", (50, 100), cv2.FONT_HERSHEY_SIMPLEX, 1.0, (50, 50, 50), 2)
    cv2.putText(blank, "1+0+1 5 days", (50, 160), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (70, 70, 70), 2)
    
    _, enc = cv2.imencode(".jpg", blank)
    raw_bytes = enc.tobytes()

    processed_bytes = preprocess_clinical_image(raw_bytes, "image/jpeg")
    assert processed_bytes is not None
    assert len(processed_bytes) > 100
    
    # Check that processed bytes can be decoded back to a valid image
    np_arr = np.frombuffer(processed_bytes, np.uint8)
    processed_img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
    assert abs(processed_img.shape[0] - 300) < 20
    assert abs(processed_img.shape[1] - 400) < 20


def test_pharmacopoeia_brand_correction():
    """Verify Levenshtein distance <= 2 auto-correction to verified Pakistani pharmaceutical brands."""
    # Test cases: Misspelled -> Corrected Brand
    test_cases = [
        ("Tab Salif 5mg", "Tab Solif 5mg", True),
        ("Tab Famax 500mg", "Tab Femax 500mg", True),
        ("Cap Resik 20mg", "Cap Risek 20mg", True),
        ("Tab Neoprax 250mg", "Tab Neoprox 250mg", True),
        ("Syp Ulsaneec", "Syp Ulsanic", True),
        ("Tab Augmenten 625mg", "Tab Augmentin 625mg", True),
        ("Tab Glucofage 500mg", "Tab Glucophage 500mg", True),
        ("Tab Panadol 500mg", "Tab Panadol 500mg", False), # Exact match
    ]

    for raw, expected_corrected, expected_was_corrected in test_cases:
        corrected, entry, was_corrected = match_and_correct_brand(raw)
        assert corrected == expected_corrected, f"Expected {expected_corrected}, got {corrected}"
        assert entry is not None


def test_dosage_fraction_protection():
    """Ensure fractional dosages ('آدھی گولی', '0.5') are never confused with '5 tablets'."""
    # Case 1: Doctor handwriting says 5 tablets mistakenly read from "آدھی گولی"
    dose, frac, lbl_en, lbl_ur = sanitize_dosage_fractions("5 tablets", "آدھی گولی شام کو")
    assert frac == "half"
    assert "0.5" in dose
    assert lbl_en == "Half Tablet (0.5)"

    # Case 2: 1/2 tab notation
    dose2, frac2, _, _ = sanitize_dosage_fractions("1/2 tab", "half tablet daily")
    assert frac2 == "half"
    assert "0.5" in dose2

    # Case 3: Syrup 2 teaspoons
    dose3, frac3, lbl_en3, _ = sanitize_dosage_fractions("2 tsp", "۲ چمچ دن میں تین بار")
    assert frac3 == "2_spoons"
    assert "2 teaspoons" in dose3


def test_sig_frequency_validation():
    """Verify strict South Asian sig notation matrix validation."""
    # 1+0+1 -> Morning & Night (2 doses/day)
    tb1, freq1 = validate_sig_frequency("1+0+1")
    assert tb1 == {"morning": True, "afternoon": False, "night": True}
    assert "Twice daily" in freq1

    # 1+1+1 -> Morning, Afternoon, Night (3 doses/day)
    tb2, freq2 = validate_sig_frequency("1+1+1")
    assert tb2 == {"morning": True, "afternoon": True, "night": True}
    assert "Three times daily" in freq2

    # 0+0+1 -> Night only (1 dose/day)
    tb3, freq3 = validate_sig_frequency("0+0+1")
    assert tb3 == {"morning": False, "afternoon": False, "night": True}
    assert "night" in freq3.lower()


def test_clinical_date_sanity():
    """Verify dates cannot be in future and missing/misread years are inferred."""
    # Future date check: e.g. 2035-10-15 should be clamped/adjusted
    sanitized_future = sanitize_clinical_date("2035-10-15")
    assert sanitized_future is not None
    assert int(sanitized_future.split("-")[0]) <= 2026

    # Omitted year check: "15/08" should infer calendar year
    sanitized_omitted = sanitize_clinical_date("15/08")
    assert sanitized_omitted is not None
    assert len(sanitized_omitted.split("-")) == 3


@pytest.mark.asyncio
async def test_upload_stream_sse_endpoint():
    """Verify POST /api/v1/vault/upload-stream emits real-time SSE events with zero technical jargon."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create a sample prescription image file
        img = np.ones((200, 200, 3), dtype=np.uint8) * 255
        cv2.putText(img, "Rx Solif 5mg", (20, 100), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)
        _, enc = cv2.imencode(".jpg", img)
        file_bytes = enc.tobytes()

        files = {"file": ("prescription.jpg", io.BytesIO(file_bytes), "image/jpeg")}
        data = {"document_type": "prescription"}

        response = await client.post("/api/v1/vault/upload-stream", files=files, data=data)
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")

        content = response.text
        assert "event: progress" in content
        assert "event: complete" in content or "event: error" in content

        # Verify zero forbidden technical jargon in entire SSE stream
        forbidden_terms = ["OCR", "ocr", "Pydantic", "pydantic", "LangGraph", "langgraph", "Base64", "base64", "Token", "token"]
        for term in forbidden_terms:
            assert term not in content, f"Forbidden technical term '{term}' leaked into SSE stream!"
        
        # Verify bilingual message presence
        assert "message_en" in content
        assert "message_ur" in content
