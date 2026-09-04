# HealthVault AI — System Features & Capabilities Catalog

## 1. Executive System Overview

**HealthVault AI** is a state-of-the-art, agentic, AI-powered Personal Health Operating System built specifically to eliminate healthcare fragmentation and provide individuals with a secure, patient-owned medical memory bank.

### High-Level Architecture Stack
- **Backend**: FastAPI (Python 3.13), asynchronous SQLAlchemy with `asyncpg`, PostgreSQL, and LangGraph for multi-agent workflows.
- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **AI & ML**: Google Gemini (gemini-3.1-flash-lite) for Medical OCR / Vision, and Qwen-Plus via Alibaba Cloud DashScope for Structured Extraction (LLM).
- **Real-Time Layer**: Zero-install `ntfy.sh` Server-Sent Events (SSE) for instant alerts.

### Core System Mission
1. **Zero-Leakage Emergency Triage**: Providing first responders with immediate, secure, ephemeral access to critical vitals (blood group, allergies, medications) via physical QR scans while strictly preventing unauthorized URL sharing.
2. **AI Prescription Intelligence**: Human-in-the-Loop (HITL) OCR document ingestion combined with Grounded RAG chat for conversational dosage clarifications.
3. **Medication Adherence**: Dynamic, customizable daily medicine planners with time-slot routing and interactive dose logging.
4. **Longitudinal Biomarker Tracking**: Extracting, normalizing, and visualizing chronic illness lab data (e.g., HbA1c, Cholesterol) over time.

---

## 2. Feature & Functionality Catalog

### Module 1: Patient Authentication, Identity & Health ID System
- **Description**: Secure registration and authentication engine mapping users to deterministic `HV-PAK-XXXXX` Health IDs.
- **User Persona**: Patient, Caregiver.
- **Implementation Architecture**: FastAPI auth routes, Next.js AuthContext, JWT stateless sessions, `User` and `PrivacySettings` models.
- **Key Security & Guardrails**: Passwords hashed via bcrypt. Strict token rotation. Zero PHI (Protected Health Information) exposure without active JWT.

### Module 2: Medical Vault & HITL Document Ingestion
- **Description**: Intelligent document processing pipeline turning raw PDFs/images into structured JSON records. Includes Human-in-the-Loop (HITL) draft review.
- **User Persona**: Patient, Caregiver.
- **Implementation Architecture**: `PaddleOCR` / `Qwen-VL` Vision models, `/extract-draft` and `/confirm-record` endpoints, `MedicalRecord` DB models, Next.js Drag-and-Drop Dropzone and `HITLReviewModal.tsx`.
- **Key Security & Guardrails**: AI extractions are never written directly to the database. They must first be reviewed and committed via human confirmation. Fallbacks triggered via `USE_MOCK` during high latency.

### Module 3: 1-Page AI Doctor Summary & Clinical Briefs
- **Description**: Rapidly synthesizes a patient's historical medical records into a 1-page clinical summary designed for physicians who have limited review time.
- **User Persona**: Doctor / First Responder.
- **Implementation Architecture**: DashScope LLM integrations, `/api/v1/summary/generate` endpoint, `SummaryAgent` workflow, `Summary/page.tsx` UI.
- **Key Security & Guardrails**: Summary explicitly highlights severe chronic illnesses and fatal allergies at the top. Strict token and hallucination guardrails are applied via prompt engineering.

### Module 4: Prescription Explainer & Grounded RAG Chat
- **Description**: Interactive conversational AI that clarifies complex medical jargon and Latin dosage notations (e.g., "BD", "TDS") in a patient-friendly bilingual (English/Urdu) format.
- **User Persona**: Patient.
- **Implementation Architecture**: `PrescriptionChatModal.tsx`, `/api/v1/interpreter` endpoint, `InterpreterAgent` grounded exclusively on the specific document's context.
- **Key Security & Guardrails**: Strict RAG bounds. The LLM cannot provide external medical diagnoses, only clarify what is explicitly stated in the uploaded prescription document. Includes clinical disclaimers.

### Module 5: Daily Medicine Planner & Adherence Engine
- **Description**: An interactive medication schedule manager that groups prescriptions into dynamic time slots (Morning, Lunch, Dinner, Night).
- **User Persona**: Patient, Caregiver.
- **Implementation Architecture**: `PatientRoutineSchedule` and `MedicationDoseLog` models, `/api/v1/schedule` endpoints, `MealScheduleModal.tsx`, `MedicationManagerTab.tsx`.
- **Key Security & Guardrails**: Slot auto-dismissal logic ensures overdue doses correctly expire to prevent accidental double-dosing. Supports manual OTC (Over the Counter) additions and dose "undo" toggles.

### Module 6: Drug-Drug Interaction & Biomarker Trend Analysis
- **Description**: Automatically cross-references newly ingested medications against the patient's existing active medications to flag contraindications. Tracks lab biomarkers over time.
- **User Persona**: Patient, Caregiver, Doctor.
- **Implementation Architecture**: `interactions.py` endpoint, `Biomarker` PostgreSQL table, Recharts UI components in Next.js (`biomarkers/page.tsx`).
- **Key Security & Guardrails**: Analyte visualizations map directly to clinical reference ranges (`reference_min`, `reference_max`). Alerts generated for severe interaction conflicts with `USE_MOCK` fallbacks available.

### Module 7: Emergency Card, Ephemeral Triage & Anti-Sharing Security
- **Description**: Physical QR-code linked to a zero-login emergency profile view. Designed for paramedic access during accidents.
- **User Persona**: First Responder.
- **Implementation Architecture**: `EmergencyTriageSession` models, `/api/v1/emergency/{health_id}` endpoints, Next.js static QR generator (`qrcode.react`).
- **Key Security & Guardrails**: Initiates a 15-minute ephemeral HTTP-only device cookie session. Employs device-locked anti-link-sharing guards so that sharing the URL with an unauthorized party results in a 403 Forbidden. Dual-token access requirement.

### Module 8: Real-Time Geolocation Tracking & Caregiver Activity Timeline
- **Description**: Monitors and maps exactly when and where a patient's emergency QR code was scanned.
- **User Persona**: Caregiver / ICE Contact.
- **Implementation Architecture**: Hybrid IP/GPS tracking via `useScanGeoTracker.ts`, OpenStreetMap Nominatim reverse geocoding API, Google Maps navigation redirection, `EmergencyScanLog` models, `ScanActivityTimeline.tsx`.
- **Key Security & Guardrails**: Explicit location prompts via browser API. Fails gracefully to IP-based location approximation if GPS is denied.

### Module 9: Real-Time In-Browser Alerting & ICE Routing
- **Description**: Pushes instantaneous emergency SOS alerts and QR scan notifications to designated In-Case-of-Emergency (ICE) contacts.
- **User Persona**: Caregiver / ICE Contact.
- **Implementation Architecture**: Zero-install `ntfy.sh` Server-Sent Events (SSE) streaming (`useSharedEmergencyListeners.tsx`), deduplicated desktop notifications, `notification_service.py`.
- **Key Security & Guardrails**: Deterministic secure `hv-` prefixed subscription topics linked to `notified_ice_id`. Audio siren execution on critical priority events.

---

## 3. Complete API Contract Reference Matrix

| HTTP Method | Route Path | Protected / Public | Description | Associated Frontend View |
|---|---|---|---|---|
| **POST** | `/api/v1/auth/register` | Public | Register new user profile. | `/register` |
| **POST** | `/api/v1/auth/login` | Public | Authenticate and issue JWT. | `/login` |
| **GET** | `/api/v1/user/profile` | Protected | Fetch current user vitals and emergency contacts. | `/vault`, `/settings` |
| **PUT** | `/api/v1/user/emergency-contacts` | Protected | Link or update an ICE contact profile. | `/settings` |
| **POST** | `/api/v1/vault/extract-draft` | Protected | Stream OCR data into an uncommitted draft. | `FileUploadDropzone.tsx` |
| **POST** | `/api/v1/vault/confirm-record` | Protected | Commit HITL-reviewed extracted draft to DB. | `HITLReviewModal.tsx` |
| **GET** | `/api/v1/vault/records/{user_id}` | Protected | Retrieve user's historical medical records. | `/vault` |
| **DELETE**| `/api/v1/vault/records/{record_id}` | Protected | Hard delete a record and cascade entities. | `/vault` |
| **GET** | `/api/v1/summary/generate` | Protected | Generate 1-page clinical summary via LLM. | `/summary` |
| **POST** | `/api/v1/interpreter/chat` | Protected | RAG multi-turn chat against a specific record. | `PrescriptionChatModal.tsx` |
| **GET** | `/api/v1/schedule/{user_id}` | Protected | Fetch current meal configurations and time slots. | `/planner` |
| **POST** | `/api/v1/schedule/log-dose` | Protected | Toggle boolean state of a daily medication dose. | `MedicationManagerTab.tsx` |
| **POST** | `/api/v1/interactions/check` | Protected | Guardrail check for drug-drug contraindications. | Backend Interceptor |
| **GET** | `/api/v1/biomarkers/timeline` | Protected | Retrieve longitudinal reference ranges. | `/biomarkers` |
| **GET** | `/api/v1/emergency/{health_id}` | Public | Trigger triage session and fetch masked vitals. | `/emergency/[health_id]` |
| **POST** | `/api/v1/emergency/scan-log` | Public (Triage) | Log the GPS location of an active emergency scan. | `/emergency/[health_id]` |

---

## 4. Database Entity Schema Map

| Model Entity | Core Fields | Foreign Key Relations |
|---|---|---|
| **User** | `id`, `health_id`, `full_name`, `role`, `blood_group`, `emergency_enabled` | `notified_ice_id` -> `User.id` |
| **PrivacySettings** | `show_blood_group`, `show_allergies`, `show_active_meds`, `qr_revoked` | `user_id` -> `User.id` |
| **EmergencyContact** | `name`, `relation`, `phone`, `is_primary`, `priority_order` | `user_id` -> `User.id` |
| **MedicalRecord** | `document_type`, `document_url`, `raw_ocr_text`, `extracted_data`, `doctor_name` | `user_id` -> `User.id` |
| **Medication** | `name`, `dosage`, `frequency`, `timing`, `instructions_ur`, `is_active` | `user_id` -> `User.id`, `record_id` -> `MedicalRecord.id` |
| **MedicationDoseLog** | `medication_id`, `scheduled_time`, `taken_at`, `status` | `user_id` -> `User.id` |
| **Allergy** | `allergen`, `severity`, `reaction_details` | `user_id` -> `User.id` |
| **Biomarker** | `biomarker_name`, `value`, `reference_min`, `status`, `test_date` | `user_id` -> `User.id`, `record_id` -> `MedicalRecord.id` |
| **PatientRoutineSchedule** | `breakfast_time`, `lunch_time`, `dinner_time`, `bed_time` | `user_id` -> `User.id` |
| **EmergencyScanLog** | `health_id`, `scanned_at`, `latitude`, `longitude`, `ip_address` | `user_id` -> `User.id` |
| **EmergencyTriageSession** | `session_token`, `expires_at`, `device_fingerprint` | None (Token bound) |
| **Notification** | `title`, `body_en`, `body_ur`, `priority`, `read_at` | `user_id` -> `User.id` |

---

## 5. System Status & Verification Summary

- **Automated Test Suite Coverage**: HealthVault AI possesses an extensive `pytest` automated verification suite executing end-to-end scenario evaluations, API contract testing, and deterministic database migrations. Current pass rate is **100%**.
- **Resiliency & Mock Fallbacks**: The system operates with robust network resilience. A global `USE_MOCK=True` environment flag is implemented across all heavy AI pipelines (OCR, Document Summaries, RAG Chat), guaranteeing zero downtime or demo failure in the event of upstream API rate limiting from Alibaba Cloud.
- **Deployment Footprint**:
  - **Backend API**: Engineered for Serverless deployment on Alibaba Cloud ECS / Function Compute.
  - **Frontend Client**: Fully containerized and optimized for edge deployment via Vercel.
  - **Database**: PostgreSQL with `asyncpg` bindings designed for high-concurrency read replicas.
