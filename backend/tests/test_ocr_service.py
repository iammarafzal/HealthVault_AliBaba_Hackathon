import tempfile
from pathlib import Path
import pytest

from app.core.config import settings
from app.services.ocr_service import (
    IMAGE_EXTENSIONS,
    MIN_DIGITAL_TEXT_LENGTH,
    MOCK_OCR_TEXT,
    OCR_FALLBACK_TEXT,
    PDF_EXTENSIONS,
    ocr_service,
)


def test_ocr_mock_mode():
    settings.USE_MOCK = True
    result = ocr_service.process_document("non_existent_file.png")
    assert result == MOCK_OCR_TEXT


def test_ocr_nonexistent_file_fallback():
    settings.USE_MOCK = False
    result = ocr_service.process_document("path/to/definitely_missing_file_123.jpg")
    assert result == OCR_FALLBACK_TEXT


def test_ocr_unsupported_extension_fallback():
    settings.USE_MOCK = False
    with tempfile.NamedTemporaryFile(suffix=".txt", delete=False) as tmp:
        tmp.write(b"Hello world")
        tmp_path = tmp.name

    try:
        result = ocr_service.process_document(tmp_path)
        assert result == OCR_FALLBACK_TEXT
    finally:
        Path(tmp_path).unlink(missing_ok=True)


def test_blocks_to_text_reading_order():
    # Blocks with (top_y, left_x, text)
    blocks = [
        (100.0, 10.0, "Line 2 Left"),
        (102.0, 150.0, "Line 2 Right"),
        (20.0, 10.0, "Line 1"),
        (250.0, 10.0, "Line 3"),
    ]
    formatted = ocr_service._blocks_to_text(blocks)
    lines = formatted.split("\n")
    assert lines[0] == "Line 1"
    assert lines[1] == "Line 2 Left"
    assert lines[2] == "Line 2 Right"
    assert lines[3] == "Line 3"


@pytest.mark.asyncio
async def test_ocr_async_wrapper():
    settings.USE_MOCK = True
    result = await ocr_service.process_document_async("dummy_file.pdf")
    assert result == MOCK_OCR_TEXT
