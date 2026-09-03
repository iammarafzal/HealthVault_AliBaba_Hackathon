# HealthVault AI — API Endpoints Requiring External API Keys

> **Last updated:** August 30, 2026  
> **Purpose:** Document every endpoint that depends on external API keys for successful (non-mock) execution.

---

##  Required API Keys Overview

| API Key | Provider | Purpose | Env Variable |
|---------|----------|---------|--------------|
| DashScope API Key | Alibaba Cloud | Qwen LLM (medical extraction, summaries, interactions, voice intent) | `DASHSCOPE_API_KEY` |
| Gemini API Key | Google AI Studio | Gemini LLM (alternative to Qwen) | `GEMINI_API_KEY` |
| Groq API Key | Groq | Whisper speech-to-text (Urdu ASR) | `GROQ_API_KEY` |

> **Note:** PaddleOCR (used for document OCR) runs **locally** — no API key required. It downloads models on first run.

---

## 📋 Endpoints Requiring API Keys

### 1. Vault — Document Upload & AI Extraction

| Endpoint | Method | API Key Required | Fallback |
|----------|--------|------------------|----------|
| `/api/v1/vault/upload-and-extract` | `POST` | `DASHSCOPE_API_KEY` or `GEMINI_API_KEY` | Mock data if `USE_MOCK=True` |

**Why it needs an API key:**
- Runs **PaddleOCR** locally to extract text from PDFs/images (no key needed)
- Invokes the **LLM provider** (Qwen or Gemini) via LangGraph agents to extract structured medical entities (diagnoses, medications, allergies, biomarkers)
- Without a configured LLM API key, the `FallbackLLMProvider` returns mock extraction data

**Configuration:**
```env
LLM_PROVIDER=dashscope        # or "gemini"
DASHSCOPE_API_KEY=sk-xxxxx    # required when LLM_PROVIDER=dashscope
GEMINI_API_KEY=AIza-xxxxx     # required when LLM_PROVIDER=gemini
```

---

### 2. Doctor Summary — Clinical Briefing Generation

| Endpoint | Method | API Key Required | Fallback |
|----------|--------|------------------|----------|
| `/api/v1/summary/generate` | `GET` | `DASHSCOPE_API_KEY` or `GEMINI_API_KEY` | DB-based fallback summary if LLM fails |

**Why it needs an API key:**
- `SummaryAgent.generate_clinical_summary()` aggregates patient data and sends it to the LLM to produce a structured 1-page clinical briefing
- If the LLM returns empty/invalid data, a deterministic fallback summary is built directly from database records

**Configuration:**
```env
LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=sk-xxxxx
# OR
LLM_PROVIDER=gemini
GEMINI_API_KEY=AIza-xxxxx
```

---

### 3. Drug Interactions — Medication Safety Check

| Endpoint | Method | API Key Required | Fallback |
|----------|--------|------------------|----------|
| `/api/v1/interactions/check` | `POST` | `DASHSCOPE_API_KEY` or `GEMINI_API_KEY` | Mock alert data if `USE_MOCK=True` or LLM fails |

**Why it needs an API key:**
- `DrugInteractionAgent.check_interactions()` cross-references proposed medications against active regimens and known allergies using the LLM
- Without an API key, the `FallbackLLMProvider` returns mock interaction data

**Configuration:**
```env
LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=sk-xxxxx
```

---

### 4. Voice — Urdu Speech-to-Text Transcription

| Endpoint | Method | API Key Required | Fallback |
|----------|--------|------------------|----------|
| `/api/v1/voice/transcribe` | `POST` | `GROQ_API_KEY` | Mock Urdu transcription if key missing or `USE_MOCK=True` |

**Why it needs an API key:**
- `VoiceService.transcribe_audio()` sends uploaded audio to **Groq Whisper-large-v3** for Urdu speech recognition
- If `GROQ_API_KEY` is empty or the API call fails, a realistic mock Urdu medical query is returned

**Configuration:**
```env
GROQ_API_KEY=gsk_xxxxx
GROQ_ASR_MODEL=whisper-large-v3
```

---

### 5. Voice — Intent Resolution & Bilingual Answers

| Endpoint | Method | API Key Required | Fallback |
|----------|--------|------------------|----------|
| `/api/v1/voice/query` | `POST` | `DASHSCOPE_API_KEY` or `GEMINI_API_KEY` | Mock intent responses if LLM fails |

**Why it needs an API key:**
- `VoiceIntentAgent.resolve_intent()` fetches patient context (medications, allergies, diagnoses) and invokes the LLM to generate context-grounded bilingual (English/Urdu) answers
- Emergency keyword detection works without an API key; general queries require the LLM

**Configuration:**
```env
LLM_PROVIDER=dashscope
DASHSCOPE_API_KEY=sk-xxxxx
```

---

## ✅ Endpoints That Do NOT Require API Keys

These endpoints work fully with just a database connection:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/v1/auth/register` | `POST` | User registration (JWT issued locally) |
| `/api/v1/auth/login` | `POST` | Authentication (JWT issued locally) |
| `/api/v1/auth/me` | `GET` | Current user profile (JWT-protected) |
| `/api/v1/user/profile` | `GET` | Get user profile (JWT-protected) |
| `/api/v1/user/profile` | `PATCH` | Update vitals & emergency contacts (JWT-protected) |
| `/api/v1/user/privacy-settings` | `PATCH` | Update privacy toggles |
| `/api/v1/user/qr-code` | `GET` | Get QR code details (JWT-protected) |
| `/api/v1/user/regenerate-qr` | `POST` | Regenerate emergency token (JWT-protected) |
| `/api/v1/user/emergency-toggle` | `PATCH` | Toggle emergency mode (JWT-protected) |
| `/api/v1/emergency/{health_id}` | `GET` | Public emergency profile (token-gated) |
| `/api/v1/biomarkers/timeline` | `GET` | Biomarker trends (DB-only) |
| `/api/v1/vault/upload` | `POST` | File upload & metadata persistence (DB-only) |
| `/api/v1/vault/records/{user_id}` | `GET` | List user records (DB-only) |
| `/api/v1/health` | `GET` | Health check |

---

## 🧪 Mock Mode (Development / Demo)

Set `USE_MOCK=True` in `.env` to bypass **all** external API calls:

```env
USE_MOCK=True
```

In mock mode:
- All LLM-dependent endpoints return deterministic, domain-aware mock data
- Voice transcription returns realistic Urdu medical queries
- Document extraction returns pre-built prescription/lab mock payloads
- Drug interactions return a fixed alert response
- Doctor summary returns a fixed clinical briefing

> **Warning:** Mock mode is for development and demo purposes only. All responses are static and do not reflect real patient data.

---

## 📦 Quick Start — Minimal Configuration for Full Functionality

To enable all features with real API calls, configure these in `.env`:

```env
# Feature flag — set to False for production
USE_MOCK=False

# Choose your LLM provider
LLM_PROVIDER=dashscope

# Alibaba Cloud DashScope (Qwen)
DASHSCOPE_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxx

# Google Gemini (alternative)
# LLM_PROVIDER=gemini
# GEMINI_API_KEY=AIza-xxxxxxxxxxxxxxxxxxxxxxxx

# Groq Whisper (Urdu Speech-to-Text)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
```

---

## 🔄 Fallback Behavior Summary

| Service | Primary | Fallback 1 | Fallback 2 |
|---------|---------|------------|------------|
| LLM (Qwen/Gemini) | Live API call | `FallbackLLMProvider` catches errors | `MockLLMProvider` returns deterministic data |
| Groq Whisper | Live API call | Exception caught in `VoiceService` | Mock Urdu transcription returned |
| PaddleOCR | Local model inference | Embedded PDF text extraction | Fallback warning message |

All fallbacks are **automatic** — no endpoint returns HTTP 500 due to missing API keys. Instead, degraded/mock responses are returned with appropriate logging.
