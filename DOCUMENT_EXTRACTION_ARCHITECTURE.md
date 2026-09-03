# HealthVault AI — Document Text & Medical Entity Extraction Architecture

> **Technical Architecture Guide**: How HealthVault AI extracts text, deciphers doctor handwriting, and structures clinical data from medical images and PDFs.

---

## 📌 Executive Summary

All Optical Character Recognition (OCR), Multimodal Vision processing, handwriting deciphering, and clinical entity structuring take place **exclusively on the Backend (FastAPI)**. 

The **Frontend (Next.js 14)** serves as the client capture and presentation interface:
* Captures camera snapshots or PDF/JPG file uploads via drag-and-drop.
* Dispatches standard `multipart/form-data` HTTP requests to backend endpoints (`/api/v1/vault/upload-and-extract` or `/api/v1/interpreter/extract`).
* Renders the returned structured JSON payload (medication dosage cards, Urdu translation scripts, biomarker timeline graphs, and raw OCR text inspection tabs).

---

## 🏛️ System Architecture Flowchart

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                           FRONTEND (Next.js 14 Client)                          │
│                                                                                 │
│  [ Live Clinical Scanner ]  or  [ File Upload Dropzone ]                       │
│  (Camera Snap / File Pick)      (Drag & Drop PDF / JPG / PNG)                   │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
                                         │ HTTP POST (multipart/form-data)
                                         ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                            BACKEND (FastAPI API Layer)                          │
│                                                                                 │
│  Endpoint: /api/v1/vault/upload-and-extract                                     │
│  1. MIME Validation & Temporary Byte Caching                                    │
│  2. Route to Extraction Pipeline (Vision LLM or Local PaddleOCR)                │
└────────────────────────────────────────┬────────────────────────────────────────┘
                                         │
            ┌────────────────────────────┴────────────────────────────┐
            ▼                                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  Tier 1: Multimodal Vision Engine    │  │  Tier 2: Local PaddleOCR Pipeline    │
│  (vision_provider.py)                │  │  (ocr_service.py)                    │
│                                      │  │                                      │
│  • Provider: Google Gemini Flash /   │  │  • PaddleOCR (Local CPU/GPU)         │
│    Alibaba Qwen-VL / OpenAI GPT-4o   │  │  • Text Detection (`det`)            │
│  • Base64 Image Ingestion            │  │  • Orientation Angle Classify (`cls`)│
│  • Document Authenticity Validation  │  │  • Text Recognition (`rec`)          │
│  • South Asian Handwriting OCR       │  │  • Spatial Top-to-Bottom Reading     │
│  • Mixed English Brand + Urdu Sigs   │  │    Order Reconstruction (`Y/X` Sort) │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   │                                         ▼
                   │                      ┌──────────────────────────────────────┐
                   │                      │  LangGraph Extraction Agent Node     │
                   │                      │  (vault_graph.py / nodes.py)         │
                   │                      │                                      │
                   │                      │  • Prompt-based LLM Entity Parsing   │
                   │                      │  • Normalizes raw text into schema   │
                   │                      └──────────────────┬───────────────────┘
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │
                                        ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      STRUCTURED CLINICAL ENTITY VALIDATION                      │
│                                                                                 │
│  • Validated Pydantic Schema (VaultExtractionResponse / PrescriptionData)       │
│  • Medications: Name, Form, Strength, Dose, Frequency, Route, Urdu Directions │
│  • Biomarkers: Test Name, Value, Unit, Ref Range, Abnormal Flag (High/Low)      │
│  • Metadata: Doctor Name, Clinic/Hospital, Prescription Date, Document Category │
└───────────────────────────────────────┬─────────────────────────────────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         ▼                             ▼
              ┌─────────────────────┐       ┌─────────────────────┐
              │ PostgreSQL Database │       │  Frontend Response  │
              │ (Async SQLAlchemy)  │       │  (JSON API Payload) │
              └─────────────────────┘       └─────────────────────┘
```

---

## ⚙️ Core Extraction Engines & Source Files

### 1. Tier 1: Multimodal Vision Extraction Engine
* **Source File**: [`backend/app/services/vision_provider.py`](file:///d:/HealthVault_AI/backend/app/services/vision_provider.py)
* **Active Providers**: Google Gemini (`gemini-2.0-flash` / `gemini-3.1-flash-lite`), Alibaba Cloud DashScope (`qwen-vl-max`), or OpenAI (`gpt-4o`).

#### How It Works:
1. **Direct Byte Ingestion**: Image or PDF file bytes are read and encoded into Base64 format without requiring intermediate disk conversions.
2. **Medical Authenticity Check**: The system executes a safety gate to reject non-medical images (e.g., selfies, scenery, receipts, memes).
3. **South Asian Clinical Handwriting Parsing**:
   - Accurately interprets English brand names written in doctors' shorthand (e.g., *"Tab Solif 5mg"*, *"Tab Femax 500mg"*, *"Cap Eso 20mg"*, *"Syp Ulsanic"*).
   - Transcribes and normalizes colloquial Urdu dosage instructions written underneath (e.g., *"آدھی گولی روزانہ شام کو ۵ دن"*, *"کھانے کے بعد صبح اور شام"*).
   - Converts South Asian frequency codes:
     - `1 + 1` or `1-0-1` $\rightarrow$ Morning & Night (Twice Daily / BD).
     - `1 + 1 + 1` or `1-1-1` $\rightarrow$ Morning, Afternoon, Night (Thrice Daily / TDS).
     - `0 + 1` or `0-0-1` $\rightarrow$ Night / Bedtime (HS / OD).
4. **Direct JSON Output**: Returns structured entities with confidence ratings for doctor details, date, medications, allergies, and diagnostic lab tables.

---

### 2. Tier 2: Local PaddleOCR Pipeline
* **Source File**: [`backend/app/services/ocr_service.py`](file:///d:/HealthVault_AI/backend/app/services/ocr_service.py)
* **Technology**: Baidu PaddleOCR (`paddleocr`, `paddlepaddle`), PyPDF.

#### How It Works:
1. **Local Execution**: Runs entirely on the server's local CPU or GPU; operates without any third-party API dependencies or external network requests.
2. **Computer Vision Sequence**:
   - **Text Detection (`det`)**: Generates polygonal coordinates bounding all printed or written characters.
   - **Angle Classification (`cls`)**: Detects document rotation ($0^\circ$, $90^\circ$, $180^\circ$, $270^\circ$) and corrects skewed phone snapshots.
   - **Text Recognition (`rec`)**: Computes character recognition probability scores.
3. **Spatial Reading Order Reconstruction ([`blocks_to_text()`](file:///d:/HealthVault_AI/backend/app/services/ocr_service.py#L108-L150))**:
   - Evaluates line height margins $\Delta Y$.
   - Groups text words into coherent horizontal lines and sorts them top-to-bottom so multi-column lab reports and Rx headers retain logical sentence sequence.

---

### 3. Tier 3: LangGraph Multi-Agent Structuring Pipeline
* **Source Files**: 
  - [`backend/app/agents/vault_graph.py`](file:///d:/HealthVault_AI/backend/app/agents/vault_graph.py)
  - [`backend/app/agents/nodes.py`](file:///d:/HealthVault_AI/backend/app/agents/nodes.py)
  - [`backend/app/agents/interpreter_graph.py`](file:///d:/HealthVault_AI/backend/app/agents/interpreter_graph.py)

#### How It Works:
1. When raw OCR text is produced, LangGraph routes the payload through a state machine:
   - `ocr_node`: Ingests and standardizes raw text blocks.
   - `extraction_node`: Sends raw text to the configured LLM (Qwen-Plus / Gemini) with specialized Pydantic schema schemas.
   - `validation_node`: Checks for dosage plausibility, unrecognized abbreviations, and abnormal lab flags.
   - `persistence_node`: Performs atomic database transactions in PostgreSQL (`records`, `medications`, `biomarkers`, `allergies` tables).

---

## 📂 Summary Table: Frontend vs. Backend Responsibility

| Component | Role | File Link |
|---|---|---|
| **Frontend Dropzone** | Camera snapshot & file dropzone | [`FileUploadDropzone.tsx`](file:///d:/HealthVault_AI/frontend/src/components/vault/FileUploadDropzone.tsx) |
| **Frontend Live Scanner** | Real-time animated pulsing pill & linear progress UI | [`LiveClinicalScanner.tsx`](file:///d:/HealthVault_AI/frontend/src/components/vault/LiveClinicalScanner.tsx) |
| **Frontend SSE Hook** | ReadableStream consumer for `/upload-stream` | [`useDocumentStream.ts`](file:///d:/HealthVault_AI/frontend/src/hooks/useDocumentStream.ts) |
| **Frontend API Service** | Axios HTTP client & SSE streaming wrapper | [`vaultService.ts`](file:///d:/HealthVault_AI/frontend/src/services/vaultService.ts) |
| **Backend SSE Route** | Jargon-free real-time progress stream (`/upload-stream`) | [`vault.py`](file:///d:/HealthVault_AI/backend/app/api/v1/vault.py) |
| **Image Preprocessor** | OpenCV/PIL deskewing, CLAHE contrast, unsharp mask | [`image_preprocessor.py`](file:///d:/HealthVault_AI/backend/app/services/image_preprocessor.py) |
| **Pakistani Pharmacopoeia** | Levenshtein fuzzy brand matcher & sig/fraction checks | [`pharmacopoeia.py`](file:///d:/HealthVault_AI/backend/app/services/pharmacopoeia.py) |
| **Multimodal Vision** | Primary AI document vision engine | [`vision_provider.py`](file:///d:/HealthVault_AI/backend/app/services/vision_provider.py) |
| **Local OCR** | Standalone PaddleOCR detection & sorting | [`ocr_service.py`](file:///d:/HealthVault_AI/backend/app/services/ocr_service.py) |
| **LangGraph Agent** | Two-pass state machine & self-correction node | [`vault_graph.py`](file:///d:/HealthVault_AI/backend/app/agents/vault_graph.py) |
| **Persistence** | Database insertion & foreign key mapping | [`persistence_service.py`](file:///d:/HealthVault_AI/backend/app/services/persistence_service.py) |
