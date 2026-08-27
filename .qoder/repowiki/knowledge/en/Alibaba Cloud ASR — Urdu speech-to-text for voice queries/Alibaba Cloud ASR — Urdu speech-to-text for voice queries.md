---
kind: external_dependency
name: Alibaba Cloud ASR — Urdu speech-to-text for voice queries
slug: alibaba-cloud-asr
category: external_dependency
category_hints:
    - vendor_identity
scope:
    - '**'
---

Alibaba Cloud Automatic Speech Recognition is the intended backend for converting Urdu voice input into text for the `/voice/query` endpoint. The service module exists as a scaffold under `app/services/asr_service.py`; it is gated by the same `USE_MOCK` flag pattern used elsewhere so that local development does not require live ASR credentials.