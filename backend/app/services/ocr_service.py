# HealthVault AI — OCR Service
# PaddleOCR pipeline for medical document image/PDF processing

import asyncio
import logging
import threading
from pathlib import Path
from typing import Any, List, Optional, Tuple

from app.core.config import settings
from app.core.mock_data import MOCK_PRESCRIPTION_EXTRACTION

logger = logging.getLogger("healthvault")

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}
PDF_EXTENSIONS = {".pdf"}

# Guaranteed non-empty outputs so downstream LangGraph agents never crash
OCR_FALLBACK_TEXT = (
    "OCR extraction could not be completed for this document. "
    "Please review the original file manually."
)
MOCK_OCR_TEXT = MOCK_PRESCRIPTION_EXTRACTION.raw_ocr_text

# Minimum embedded-text length for a PDF to be considered digital (not scanned)
MIN_DIGITAL_TEXT_LENGTH = 40
# Vertical tolerance (px) when grouping detected blocks into reading-order lines
LINE_TOLERANCE_PX = 12


class OCRService:
    """Lazy-loaded PaddleOCR wrapper with resilient mock/fallback behavior."""

    def __init__(self) -> None:
        self._engine: Optional[Any] = None
        self._lock = threading.Lock()

    # ------------------------------------------------------------------ engine

    def _get_engine(self) -> Any:
        """Initialize the PaddleOCR engine once (heavy model download)."""
        if self._engine is not None:
            return self._engine
        with self._lock:
            if self._engine is not None:
                return self._engine
            from paddleocr import PaddleOCR  # lazy: heavy import

            try:
                # PaddleOCR 2.x API (as specified)
                self._engine = PaddleOCR(
                    use_angle_cls=True,
                    lang=settings.OCR_LANG,
                    use_gpu=settings.OCR_USE_GPU,
                    show_log=False,
                )
            except TypeError:
                # PaddleOCR 3.x renamed kwargs — stay compatible
                self._engine = PaddleOCR(
                    use_textline_orientation=True,
                    lang=settings.OCR_LANG,
                    device="gpu" if settings.OCR_USE_GPU else "cpu",
                )
            logger.info("PaddleOCR engine initialized (lang=%s)", settings.OCR_LANG)
        return self._engine

    def _run_ocr(self, input_path: str) -> List[Tuple[float, float, str]]:
        """Run OCR and normalize detections to (top_y, left_x, text) tuples."""
        engine = self._get_engine()
        blocks: List[Tuple[float, float, str]] = []

        if hasattr(engine, "ocr"):  # PaddleOCR 2.x
            for page in engine.ocr(input_path, cls=True) or []:
                for line in page or []:
                    box, (text, _conf) = line[0], line[1]
                    blocks.append(
                        (
                            min(pt[1] for pt in box),
                            min(pt[0] for pt in box),
                            text.strip(),
                        )
                    )
            return blocks

        # PaddleOCR 3.x returns dict-like OCRResult objects
        for result in engine.predict(input_path):
            texts = result.get("rec_texts", [])
            polys = result.get("rec_polys") or result.get("dt_polys") or []
            for i, text in enumerate(texts):
                if i < len(polys) and polys[i] is not None:
                    top_y = float(min(p[1] for p in polys[i]))
                    left_x = float(min(p[0] for p in polys[i]))
                else:  # preserve engine order when geometry is missing
                    top_y, left_x = float(i), 0.0
                blocks.append((top_y, left_x, str(text).strip()))
        return blocks

    @staticmethod
    def _blocks_to_text(blocks: List[Tuple[float, float, str]]) -> str:
        """Sort blocks top-to-bottom then left-to-right into clean text."""
        ordered = sorted(
            blocks, key=lambda b: (round(b[0] / LINE_TOLERANCE_PX), b[1])
        )
        return "\n".join(text for _, _, text in ordered if text)

    # ------------------------------------------------------------------ public

    def extract_text_from_image(self, image_path: str) -> str:
        """OCR a single image file and return reading-order concatenated text."""
        return self._blocks_to_text(self._run_ocr(image_path))

    def extract_text_from_pdf(self, pdf_path: str) -> str:
        """Extract text from a PDF: embedded text first, OCR for scanned pages."""
        # 1) Digital PDFs carry embedded text — no model inference needed
        embedded_parts: List[str] = []
        try:
            from pypdf import PdfReader

            reader = PdfReader(pdf_path)
            embedded_parts = [
                (page.extract_text() or "").strip() for page in reader.pages
            ]
        except Exception as exc:
            logger.warning("Embedded PDF text extraction failed for %s: %s", pdf_path, exc)

        embedded_text = "\n".join(part for part in embedded_parts if part).strip()
        if len(embedded_text) >= MIN_DIGITAL_TEXT_LENGTH:
            return embedded_text

        # 2) Scanned PDF: PaddleOCR renders and recognizes pages directly
        return self._blocks_to_text(self._run_ocr(pdf_path))

    def process_document(self, file_path: str) -> str:
        """Master handler: routes by extension and never raises to callers."""
        if settings.USE_MOCK:
            logger.info("USE_MOCK=True — returning mock OCR text")
            return MOCK_OCR_TEXT

        path = Path(file_path)
        if not path.exists():
            logger.error("OCR input file not found: %s", file_path)
            return OCR_FALLBACK_TEXT

        ext = path.suffix.lower()
        try:
            if ext in IMAGE_EXTENSIONS:
                text = self.extract_text_from_image(str(path))
            elif ext in PDF_EXTENSIONS:
                text = self.extract_text_from_pdf(str(path))
            else:
                logger.warning("Unsupported OCR file type '%s' for %s", ext, file_path)
                return OCR_FALLBACK_TEXT
        except Exception as exc:
            logger.exception("OCR pipeline failed for %s: %s", file_path, exc)
            return OCR_FALLBACK_TEXT

        return text if text.strip() else OCR_FALLBACK_TEXT

    async def process_document_async(self, file_path: str) -> str:
        """Async wrapper — OCR is CPU-bound, so it runs in a worker thread."""
        return await asyncio.to_thread(self.process_document, file_path)


ocr_service = OCRService()
