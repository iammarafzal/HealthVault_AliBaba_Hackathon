# HealthVault AI — Medical Memory & Intelligence System

> **Pakistan's First AI-Powered Health Operating System: Complete medical history, plain-language Urdu dosage intelligence, and zero-login emergency triage.**

---

## 📖 Overview

**HealthVault AI** is a privacy-first, multi-agent clinical memory and intelligence platform tailored specifically for Pakistan's healthcare ecosystem. It bridges the gap between chaotic paper-based prescriptions, fragmented lab test slips, and emergency triage by providing:

1. **AI Medical Vault & Ingestion**: High-precision multimodal document parsing that deciphers South Asian handwritten prescriptions, mixed English/Urdu dosage directions (*"Sig: 1-0-1 کھانے کے بعد"*), and diagnostic lab reports.
2. **1-Page AI Doctor Visit Sheet**: 10-second clinical executive summary synthesized from full patient history, formatted for rapid physician consultation and print-ready single-page A4 distribution.
3. **Prescription Interpreter & Urdu Voice AI**: Natural conversational Urdu translations with real-time speech synthesis (Urdu voice playback) and Groq Whisper ASR for elderly patients and family caregivers.
4. **Smart Medication Planner & Interaction Guard**: Automated daily dosage routines, prayer time meal alignments, and real-time contraindication detection against patient allergies and active drug regimens.
5. **Token-Gated Emergency QR Card**: Printable wallet card and digital pass granting first responders instant, read-only triage data (blood group, critical allergies, SOS emergency contacts) with zero login or app download required.
6. **Longitudinal Lab Biomarker Tracking**: Interactive timeline trajectories for HbA1c, fasting glucose, lipid profiles, and renal parameters.

---

## 🛠️ Technology Stack

| Layer | Technologies & Frameworks |
|---|---|
| **Backend API** | FastAPI, Python 3.10+, Uvicorn (ASGI), Pydantic v2, Pydantic-Settings |
| **Database & ORM** | PostgreSQL, SQLAlchemy 2.0 (AsyncIO), AsyncPG, Alembic |
| **AI / LLM Orchestration** | LangGraph, Alibaba Cloud DashScope (Qwen-Plus, Qwen-VL), Google AI Studio (Gemini 2.0/3.1), LangChain Core |
| **OCR & Vision** | PaddleOCR (Local CPU/GPU), Pluggable Vision Engine (Qwen-VL, Gemini Flash, GPT-4o) |
| **Voice & Speech-to-Text** | Groq Cloud Whisper (`whisper-large-v3` for Urdu ASR), Web Speech API |
| **Frontend Web App** | Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| **Data Viz & Animations** | Recharts, Framer Motion, Lucide React, `qrcode.react` |
| **Design System** | Vault Teal (`#0D5C4A`), Active Emerald (`#0A8C6A`), Stone White (`#F5F8F7`), Emergency Red (`#C0392B`) |

---

## 📂 Project Directory Structure

```text
HealthVault_AI/
├── .qoder/                         # Architecture guidelines, API contracts & prompt specs
│   ├── SYSTEM_RULES.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── AGENT_PROMPTS.md
│   └── TASKS_ROADMAP.md
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── agents/                 # LangGraph workflows & multi-agent pipelines
│   │   │   ├── vault_graph.py
│   │   │   ├── interpreter_graph.py
│   │   │   ├── interpreter_agent.py
│   │   │   ├── summary_agent.py
│   │   │   ├── voice_intent_agent.py
│   │   │   └── nodes.py
│   │   ├── api/                    # REST API routers & dependency injection
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── vault.py
│   │   │   │   ├── interpreter.py
│   │   │   │   ├── summary.py
│   │   │   │   ├── medications.py
│   │   │   │   ├── emergency.py
│   │   │   │   ├── interactions.py
│   │   │   │   ├── biomarkers.py
│   │   │   │   ├── user.py
│   │   │   │   └── voice.py
│   │   │   ├── deps.py
│   │   │   └── router.py
│   │   ├── core/                   # App configuration, security, DB & mock data
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   ├── security.py
│   │   │   └── mock_data.py
│   │   ├── models/                 # SQLAlchemy ORM database models
│   │   ├── schemas/                # Pydantic request & response schemas
│   │   ├── services/               # Core business logic services
│   │   │   ├── biomarker_service.py
│   │   │   ├── emergency_service.py
│   │   │   ├── llm_provider.py
│   │   │   ├── medication_service.py
│   │   │   ├── medicine_planner.py
│   │   │   ├── persistence_service.py
│   │   │   ├── privacy_service.py
│   │   │   ├── vision_provider.py
│   │   │   └── voice_service.py
│   │   └── main.py                 # FastAPI application entrypoint
│   ├── tests/                      # Pytest unit & integration test suite
│   ├── .env.example                # Backend environment variable template
│   ├── requirements.txt            # Python package dependencies
│   └── seed_db.py                  # Realistic clinical demo database seeder
├── frontend/                       # Next.js 14 Web Application
│   ├── public/                     # Static media & optimized webp assets
│   ├── src/
│   │   ├── app/                    # Next.js App Router (Marketing, Auth & Dashboard)
│   │   │   ├── (auth)/             # Login & Registration pages
│   │   │   ├── (dashboard)/        # Medical Vault, Summary, Planner, Biomarkers, Emergency
│   │   │   ├── emergency/          # Token-gated zero-login triage view
│   │   │   ├── globals.css         # Tailwind directives, animations & print styles
│   │   │   ├── layout.tsx          # Root layout with providers & fonts
│   │   │   └── page.tsx            # High-conversion landing page
│   │   ├── components/             # Reusable UI widgets & feature components
│   │   │   ├── auth/               # Split-screen authentication layouts
│   │   │   ├── biomarkers/         # Recharts trend curves & lab filters
│   │   │   ├── emergency/          # Emergency ID card previews & QR generator
│   │   │   ├── interpreter/        # OCR results, Urdu scripts & AI chat
│   │   │   ├── landing/            # Hero, Features, Timeline, Urdu AI, Marquee reviews
│   │   │   ├── layout/             # Sidebar, Navbar & User profile menu
│   │   │   ├── planner/            # Daily dosage schedule & medicine manager
│   │   │   ├── summary/            # Clinical briefing & Doctor visit print sheet
│   │   │   ├── ui/                 # Accessible UI primitives (button, input, modal)
│   │   │   ├── vault/              # Live scanner, file dropzone & record tables
│   │   │   └── voice/              # Interactive Urdu voice assistant widget
│   │   ├── context/                # AuthContext & LanguageContext (i18n)
│   │   ├── locales/                # English & Urdu translation dictionaries
│   │   ├── services/               # Axios API client & typed backend SDK
│   │   └── types/                  # TypeScript interface contracts
│   ├── package.json
│   └── tailwind.config.js
├── API_KEYS_REQUIREMENTS.md        # Comprehensive API keys & provider setup guide
└── README.md                       # Main project documentation
```

---

## 🔌 API Endpoints Catalog (`/api/v1`)

### 1. Authentication & Identity (`/api/v1/auth`)
* `POST /api/v1/auth/register` — Register a new patient and automatically issue a unique Health ID (`HV-PAK-XXXXX`).
* `POST /api/v1/auth/login` — Authenticate credentials and return signed JWT access token.
* `GET /api/v1/auth/me` — Retrieve current authenticated session user profile.

### 2. Medical Vault & Ingestion (`/api/v1/vault`)
* `POST /api/v1/vault/upload` — Direct upload for PDF, JPG, and PNG clinical slips.
* `POST /api/v1/vault/upload-and-extract` — Full ingestion pipeline (Multimodal Vision / PaddleOCR + LangGraph structured entity extraction + DB persistence).
* `GET /api/v1/vault/records/{user_id}` — Chronological medical records repository.
* `DELETE /api/v1/vault/records/{record_id}` — Secure record deletion with cascading cleanup.

### 3. Prescription Interpreter & Urdu AI (`/api/v1/interpreter`)
* `POST /api/v1/interpreter/extract` — Decipher handwriting and extract structured medications, dosages, and frequency instructions.
* `POST /api/v1/interpreter/chat` — Conversational assistant to clarify dosage schedules and Urdu instructions.

### 4. AI Clinical Summary (`/api/v1/summary`)
* `GET /api/v1/summary/generate` — Generate a 1-page clinical executive summary with patient vitals, active regimens, abnormal lab alerts, and doctor discussion points.

### 5. Medication Planner & Interaction Guard (`/api/v1/medications` & `/api/v1/interactions`)
* `GET /api/v1/medications/schedule` — Retrieve daily medication schedule matrix mapped to morning, afternoon, evening, and bedtime.
* `POST /api/v1/medications/log-dose` — Record adherence status for planned doses.
* `POST /api/v1/interactions/check` — Real-time cross-checking of new medications against active prescriptions and lethal drug allergies.

### 6. Token-Gated Emergency Triage (`/api/v1/emergency`)
* `GET /api/v1/emergency/{health_id}?token=...` — Zero-login emergency access for first responders with token authentication and patient privacy masks.

### 7. User Profile & Privacy Controls (`/api/v1/user`)
* `GET /api/v1/user/profile` — Fetch patient demographics and emergency contact directory.
* `GET /api/v1/user/qr-code` — Retrieve active emergency QR metadata and access tokens.
* `POST /api/v1/user/regenerate-qr` — Instant key rotation for emergency access tokens.
* `PATCH /api/v1/user/emergency-toggle` — Instant master digital kill-switch for emergency QR access.
* `PATCH /api/v1/user/privacy-settings` — Granular toggles for blood group, allergies, medications, and clinical notes visibility.

### 8. Longitudinal Biomarkers (`/api/v1/biomarkers`)
* `GET /api/v1/biomarkers/timeline` — Retrieve longitudinal lab test historical series (HbA1c, Fasting Glucose, Cholesterol, Creatinine).

### 9. Urdu Voice Assistant (`/api/v1/voice`)
* `POST /api/v1/voice/transcribe` — Fast Urdu speech-to-text audio transcription powered by Groq Whisper.
* `POST /api/v1/voice/query` — Natural language health queries resolved into actionable Urdu answers and dosage alerts.

---

## 🚀 Quickstart & Developer Setup

### Prerequisites
- **Node.js**: `v18.0.0` or higher
- **Python**: `v3.10` or higher
- **PostgreSQL**: `v14.0` or higher (or run in standalone mock mode via `USE_MOCK=True`)
- **API Keys** (Optional for live LLM mode): See [`API_KEYS_REQUIREMENTS.md`](file:///d:/HealthVault_AI/API_KEYS_REQUIREMENTS.md)

---

### 1. Backend Service Setup (FastAPI)

```bash
# 1. Navigate to backend directory
cd backend

# 2. Create and activate a Python virtual environment
python -m venv .venv

# Windows:
.\.venv\Scripts\activate
# macOS/Linux:
source .venv/bin/activate

# 3. Install backend dependencies
pip install -r requirements.txt

# 4. Configure environment variables
cp .env.example .env
# Edit .env with your database URL and API keys

# 5. (Optional) Seed realistic Pakistani clinical test data
python seed_db.py

# 6. Launch FastAPI server
uvicorn app.main:app --reload --port 8000
```

* Backend API: **`http://localhost:8000`**
* Interactive Swagger Docs: **`http://localhost:8000/docs`**

---

### 2. Frontend Application Setup (Next.js 14)

```bash
# 1. Navigate to frontend directory
cd frontend

# 2. Install Node dependencies
npm install

# 3. Start Next.js development server
npm run dev
```

* Frontend Web App: **`http://localhost:3000`**

---

## 🧪 Testing & Verification

Ensure full system integrity by running the test suites:

```bash
# 1. Run Complete Backend Pytest Suite (149 test cases)
cd backend
pytest -v

# 2. Verify Frontend TypeScript Compilation
cd ../frontend
npx tsc --noEmit

# 3. Verify Production Bundle Build
npm run build
```

---

## 🔒 Security & Privacy Architecture

- **Token-Gated QR Protection**: Emergency cards contain cryptographic tokens; scans do not expose full patient records or PII unless enabled by the patient.
- **Granular Consent Toggles**: Patients can mask blood group, specific drug allergies, active regimens, or emergency notes at any time from their dashboard.
- **Zero-Login First Responder View**: Clean, high-contrast mobile triage layout accessible on any modern mobile browser without credentials.
- **Client-Side Encryption Ready**: Prescriptions and documents are stored with isolated access controls and signed URL delivery.