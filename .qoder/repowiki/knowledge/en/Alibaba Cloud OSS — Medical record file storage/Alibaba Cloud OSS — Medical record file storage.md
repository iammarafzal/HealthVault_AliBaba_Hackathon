---
kind: external_dependency
name: Alibaba Cloud OSS — Medical record file storage
slug: alibaba-cloud-oss
category: external_dependency
category_hints:
    - vendor_identity
    - auth_protocol
scope:
    - '**'
---

Alibaba Cloud Object Storage Service is used to store uploaded medical documents (images, PDFs) referenced by the vault endpoint. Integration uses the `oss2` SDK with credentials supplied via `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, plus bucket name and endpoint configured in `.env`. The service layer (`app/services/oss_service.py`) abstracts upload/download operations behind a `USE_MOCK` feature flag so tests can run without real cloud access.