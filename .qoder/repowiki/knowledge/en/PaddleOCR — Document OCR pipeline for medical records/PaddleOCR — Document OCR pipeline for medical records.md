---
kind: external_dependency
name: PaddleOCR — Document OCR pipeline for medical records
slug: paddleocr
category: external_dependency
category_hints:
    - sdk_real_api
scope:
    - '**'
---

PaddleOCR (with PaddlePaddle runtime) provides the OCR step that extracts text from uploaded images/PDFs before entity extraction by the Qwen agents. The integration lives in `app/services/ocr_service.py` and is also guarded by the `USE_MOCK` flag, allowing offline testing without GPU or model downloads.