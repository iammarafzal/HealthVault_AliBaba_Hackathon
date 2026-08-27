# HealthVault AI — 5-Day Sprint Tasks Roadmap

## Day 1: M1: Schemas & Scaffolding (Target Progress: 20%)

### Ammar Afzal (Backend & AI)
- [ ] **[Backend & DB]** Initialize FastAPI repo with environment configs, CORS, and logging *(`FastAPI / Python`)*
- [ ] **[Backend & DB]** Define Pydantic schemas & PostgreSQL models (`User`, `MedicalRecord`, `Meds`, `Allergies`) *(`PostgreSQL / SQLAlchemy`)*
- [ ] **[Cloud Storage]** Configure Alibaba Cloud OSS client for file uploads *(`Alibaba Cloud OSS / oss2`)*
- [ ] **[Backend & API]** Write mock API responses for extraction endpoints to unblock UI *(`FastAPI`)*

### Saeed Asif (Frontend & UI)
- [ ] **[Frontend Setup]** Initialize Next.js project with Tailwind CSS and shadcn/ui components *(`Next.js / TypeScript`)*
- [ ] **[Frontend Layout]** Scaffold global layout: Navbar, Sidebar, and core page routing *(`Tailwind CSS / Lucide`)*
- [ ] **[Frontend UI]** Build file upload dropzone with multi-file support and document preview *(`shadcn/ui Dropzone`)*
- [ ] **[Frontend & API]** Setup Axios API client layer with mock data handlers *(`Axios / React Query`)*

---

## Day 2: M2: Ingestion & Vault (Target Progress: 40%)

### Ammar Afzal (Backend & AI)
- [ ] **[AI Pipeline]** Implement PaddleOCR pipeline to process image and PDF inputs *(`PaddleOCR / Python`)*
- [ ] **[AI Multi-Agent]** Build LangGraph extraction workflow (`Diseases`, `Medications`, `Allergies`) *(`LangGraph / Qwen-Plus`)*
- [ ] **[Backend & API]** Implement structured entity persistence into PostgreSQL database *(`PostgreSQL / asyncpg`)*
- [ ] **[AI Agent]** Create 1-page AI Doctor Clinical Summary generation endpoint *(`DashScope / Qwen-Max`)*

### Saeed Asif (Frontend & UI)
- [ ] **[Frontend UI]** Build Medical Vault dashboard view to display structured records in cards/tables *(`Next.js / shadcn/ui`)*
- [ ] **[Frontend UI]** Implement 1-page interactive Doctor Summary view with print/export feature *(`React / shadcn/ui`)*
- [ ] **[Frontend UI]** Build Prescription Interpreter modal with English/Urdu translation toggle *(`Next.js / Tailwind CSS`)*
- [ ] **[Integration]** Connect live upload page to backend extraction API endpoint *(`Axios / REST API`)*

---

## Day 3: M3: Safety & Emergency QR (Target Progress: 65%)

### Ammar Afzal (Backend & AI)
- [ ] **[AI Pipeline]** Implement AI Drug Interaction & Allergy Guard cross-checking engine *(`LangGraph / Qwen-Plus`)*
- [ ] **[Backend & API]** Build public unauthenticated Emergency API endpoint (`/api/v1/emergency/:id`) *(`FastAPI`)*
- [ ] **[Backend & Security]** Implement privacy filter logic (Blood group, severe allergies, emergency contacts) *(`Python / FastAPI`)*
- [ ] **[Backend & Security]** Build API endpoints for QR regeneration and data visibility toggles *(`FastAPI / PostgreSQL`)*

### Saeed Asif (Frontend & UI)
- [ ] **[Frontend UI]** Create printable Emergency Health Card UI with dynamic QR generator *(`qrcode.react / Canvas`)*
- [ ] **[Frontend UI]** Build mobile-optimized public emergency view (`/emergency/[id]`) *(`Next.js / Tailwind CSS`)*
- [ ] **[Frontend UI]** Implement Smart Medication Planner (Morning/Noon/Night routine timeline) *(`shadcn/ui Tabs/Cards`)*
- [ ] **[Frontend UI]** Build Privacy Settings panel to toggle emergency card field visibility *(`shadcn/ui Switch/Forms`)*

---

## Day 4: M4: Lab Trends & Voice AI (Target Progress: 85%)

### Ammar Afzal (Backend & AI)
- [ ] **[Backend & API]** Build chronological lab biomarker aggregation endpoint (`HbA1c`, `CBC`, `Lipids`) *(`PostgreSQL / FastAPI`)*
- [ ] **[AI & Voice]** Setup Alibaba Cloud ASR / Speech API for Urdu speech-to-text *(`Alibaba Cloud ASR / SDK`)*
- [ ] **[AI Pipeline]** Build intent-resolution agent for voice queries (schedules, dosages, symptoms) *(`LangGraph / Qwen-Plus`)*
- [ ] **[Backend Optimization]** Optimize LLM prompt latency and add fallback mock toggle (`USE_MOCK=True`) *(`Python / FastAPI`)*

### Saeed Asif (Frontend & UI)
- [ ] **[Frontend Visualization]** Integrate Recharts components to plot interactive longitudinal lab trends *(`Recharts / TypeScript`)*
- [ ] **[Frontend UI]** Add interactive Urdu Voice Assistant floating widget with audio recording UI *(`Web Audio API / React`)*
- [ ] **[Frontend UI]** Render voice assistant structured responses as alert and reminder cards *(`shadcn/ui Alert Cards`)*
- [ ] **[Frontend QA]** Conduct cross-browser UI testing and responsive mobile layout polish *(`Chrome DevTools / Mobile`)*

---

## Day 5: M5: Deployment & Demo (Target Progress: 100%)

### Ammar Afzal (Backend & AI)
- [ ] **[DevOps & Cloud]** Deploy backend API to Alibaba Cloud ECS / Serverless environment *(`Alibaba Cloud ECS / Docker`)*
- [ ] **[Database Admin]** Configure production PostgreSQL database and environment variables *(`Alibaba RDS / PostgreSQL`)*
- [ ] **[Data Seeding]** Pre-seed database with realistic test records (Prescriptions, Lab PDFs, Summaries) *(`Python Data Scripts`)*
- [ ] **[Backend QA]** Monitor backend performance and execute end-to-end load tests *(`FastAPI TestClient`)*

### Saeed Asif (Frontend & UI)
- [ ] **[DevOps & Cloud]** Deploy frontend application to Vercel and connect production API domain *(`Vercel / Next.js`)*
- [ ] **[End-to-End Testing]** Perform full walkthrough (Registration -> Upload -> Summary -> QR Scan) *(`Next.js / Mobile Browser`)*
- [ ] **[QA & Mobile]** Verify real-world mobile QR scanning on physical smartphone devices *(`iOS / Android Camera`)*

### Both Members (Joint Deliverable)
- [ ] **[Demo Prep]** Record backup demo walkthrough video and prepare presentation slides *(`Screen Recording / Slides`)*