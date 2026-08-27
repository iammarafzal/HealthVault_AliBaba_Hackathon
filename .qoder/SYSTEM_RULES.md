# HealthVault AI — System Rules & Coding Guardrails

## 1. Project Context & Identity
- **Project Name:** HealthVault AI
- **Tagline:** "One secure place for your complete medical history, intelligent healthcare assistance, and emergency access."
- **Core Architecture:** Multi-agent medical memory system using FastAPI, PostgreSQL, LangGraph, Qwen-Plus/Qwen-VL (Alibaba Cloud Model Studio), DashScope, PaddleOCR, Alibaba Cloud OSS, and Next.js (TypeScript + Tailwind CSS + shadcn/ui).
- **Key Deliverables:** AI Medical Vault, AI Doctor Summary, Bilingual Prescription Interpreter, Smart Medication Planner, Zero-Login Emergency QR, Drug Interaction Guard, Longitudinal Lab Trends, and Urdu Voice Assistant.

---

## 2. Token Optimization & Context Rules
- **Focused Execution:** Generate and edit ONLY the requested function, class, or component. Never output entire files or unrelated boilerplate unless explicitly instructed.
- **Reference Contracts:** Always read and adhere to `API_CONTRACTS.md`, `ARCHITECTURE.md`, and `AGENT_PROMPTS.md` before generating code.
- **Minimal Explanations:** Provide clean, production-grade code with concise inline comments. Avoid long conversational setup paragraphs or verbose summaries.

---

## 3. Strict Coding & Anti-Hallucination Guardrails
- **Zero Schema Drift:** All backend request/response payloads MUST strictly match Pydantic schemas in `backend/app/schemas/`. All frontend API handlers MUST match TypeScript interfaces in `frontend/src/types/`.
- **Dependency Governance:** 
  - DO NOT import or invoke libraries not declared in `requirements.txt` or `package.json`.
  - If a new library is genuinely required, output the exact package name, version, and rationale for user confirmation before using it.
- **Resilience & Fallback Flags:** Every AI pipeline (OCR, LangGraph entity extraction, Doctor Summary, Drug Interaction) must include a fallback mock branch when `USE_MOCK=True` in environment settings to prevent demo failures during network latency or token rate limits.
- **Database Safety:** Always use asynchronous queries with `asyncpg` / `SQLAlchemy` ORM. Ensure proper foreign key constraints, cascade handling, and indexing on `health_id` and `user_id`.
- **Localization Safety:** Preserve bilingual data integrity (English and conversational Urdu / Nastaliq script) with explicit UTF-8 encoding across all text pipelines and database connections.

---

## 4. Environment & Secrets Management
- All API keys (`DASHSCOPE_API_KEY`, `OSS_ACCESS_KEY_ID`, `OSS_ACCESS_KEY_SECRET`, `DATABASE_URL`) must be loaded strictly from `.env` via `pydantic-settings`.
- Hardcoded tokens, API keys, or database credentials in source files are strictly prohibited.

---

## 5. Team Scope Allocation
- **Ammar Afzal (Backend & AI):** FastAPI routers, PostgreSQL schemas, PaddleOCR, LangGraph agent workflows, Alibaba Cloud OSS, DashScope Qwen integration, and Alibaba Cloud ASR.
- **Saeed Asif (Frontend & UI/UX):** Next.js App Router, Tailwind CSS, shadcn/ui, Recharts biomarker graphs, `qrcode.react` emergency card, and Web Audio API recording widgets.