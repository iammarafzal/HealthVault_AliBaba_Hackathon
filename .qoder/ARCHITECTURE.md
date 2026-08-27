# HealthVault AI — System Architecture & Data Design

## 1. Project Directory Structure

```text
HealthVault-AI/
├── .qoder/
│   ├── SYSTEM_RULES.md
│   ├── ARCHITECTURE.md
│   ├── API_CONTRACTS.md
│   ├── AGENT_PROMPTS.md
│   └── TASKS_ROADMAP.md
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── auth.py
│   │   │   │   ├── vault.py
│   │   │   │   ├── summary.py
│   │   │   │   ├── interpreter.py
│   │   │   │   ├── planner.py
│   │   │   │   ├── emergency.py
│   │   │   │   ├── interactions.py
│   │   │   │   ├── biomarkers.py
│   │   │   │   └── voice.py
│   │   │   └── router.py
│   │   ├── core/
│   │   │   ├── config.py
│   │   │   ├── database.py
│   │   │   └── security.py
│   │   ├── models/
│   │   │   ├── user.py
│   │   │   ├── record.py
│   │   │   ├── medication.py
│   │   │   ├── allergy.py
│   │   │   └── biomarker.py
│   │   ├── schemas/
│   │   │   ├── user.py
│   │   │   ├── vault.py
│   │   │   ├── emergency.py
│   │   │   └── biomarker.py
│   │   ├── services/
│   │   │   ├── oss_service.py
│   │   │   ├── ocr_service.py
│   │   │   └── asr_service.py
│   │   ├── agents/
│   │   │   ├── state.py
│   │   │   ├── graph.py
│   │   │   ├── extraction_agent.py
│   │   │   ├── summary_agent.py
│   │   │   ├── interaction_agent.py
│   │   │   └── voice_agent.py
│   │   └── main.py
│   ├── tests/
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── app/
│   │   │   ├── (auth)/
│   │   │   │   ├── login/page.tsx
│   │   │   │   └── register/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── vault/page.tsx
│   │   │   │   ├── summary/page.tsx
│   │   │   │   ├── interpreter/page.tsx
│   │   │   │   ├── planner/page.tsx
│   │   │   │   ├── biomarkers/page.tsx
│   │   │   │   ├── settings/page.tsx
│   │   │   │   └── layout.tsx
│   │   │   ├── emergency/
│   │   │   │   └── [health_id]/page.tsx
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx
│   │   ├── components/
│   │   │   ├── ui/               # shadcn/ui components
│   │   │   ├── vault/
│   │   │   ├── summary/
│   │   │   ├── planner/
│   │   │   ├── biomarkers/
│   │   │   ├── emergency/
│   │   │   └── voice/
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── utils.ts
│   │   └── types/
│   │       ├── api.d.ts
│   │       └── models.d.ts
│   ├── package.json
│   └── tailwind.config.ts
```

---

## 2. PostgreSQL Relational Database Schema

```sql
-- Core User & Patient Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    health_id VARCHAR(16) UNIQUE NOT NULL, -- e.g., "HV-PAK-98214"
    full_name VARCHAR(120) NOT NULL,
    email VARCHAR(255) UNIQUE,
    phone VARCHAR(32) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'patient', -- 'patient', 'caregiver', 'doctor'
    blood_group VARCHAR(8),
    date_of_birth DATE,
    gender VARCHAR(16),
    emergency_contacts JSONB DEFAULT '[]'::jsonb, -- [{name, relation, phone}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Privacy Settings Table
CREATE TABLE privacy_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    show_blood_group BOOLEAN DEFAULT TRUE,
    show_allergies BOOLEAN DEFAULT TRUE,
    show_active_meds BOOLEAN DEFAULT TRUE,
    show_chronic_conditions BOOLEAN DEFAULT TRUE,
    show_emergency_contacts BOOLEAN DEFAULT TRUE,
    qr_revoked BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medical Records Storage Table
CREATE TABLE medical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    document_type VARCHAR(32) NOT NULL, -- 'prescription', 'lab_report', 'discharge_summary'
    document_url TEXT NOT NULL,         -- Alibaba Cloud OSS direct URL
    raw_ocr_text TEXT,
    extracted_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    consultation_date DATE,
    doctor_name VARCHAR(120),
    hospital_name VARCHAR(160),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Structured Medications Table
CREATE TABLE medications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_id UUID REFERENCES medical_records(id) ON DELETE SET NULL,
    name VARCHAR(160) NOT NULL,
    dosage VARCHAR(64) NOT NULL,
    frequency VARCHAR(64) NOT NULL,    -- e.g., "Once daily", "BD", "TDS"
    timing VARCHAR(64),               -- "Morning", "Lunch", "Night"
    instructions_en TEXT,
    instructions_ur TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    start_date DATE,
    end_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Structured Known Allergies Table
CREATE TABLE allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    allergen VARCHAR(120) NOT NULL,    -- e.g., "Penicillin", "Peanuts", "NSAIDs"
    severity VARCHAR(32) DEFAULT 'moderate', -- 'mild', 'moderate', 'severe'
    reaction_details TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Longitudinal Biomarkers Time-Series Table
CREATE TABLE biomarkers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    record_id UUID REFERENCES medical_records(id) ON DELETE CASCADE,
    biomarker_name VARCHAR(64) NOT NULL, -- 'HbA1c', 'Hemoglobin', 'Total Cholesterol', etc.
    value NUMERIC(10, 2) NOT NULL,
    unit VARCHAR(32) NOT NULL,          -- '%', 'g/dL', 'mg/dL'
    reference_min NUMERIC(10, 2),
    reference_max NUMERIC(10, 2),
    status VARCHAR(16) NOT NULL,        -- 'low', 'normal', 'high'
    test_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_user_health_id ON users(health_id);
CREATE INDEX idx_records_user ON medical_records(user_id);
CREATE INDEX idx_biomarkers_timeline ON biomarkers(user_id, biomarker_name, test_date);
```

---

## 3. LangGraph Multi-Agent Workflow Specification

### Agent State Definition (`agent_state.py`)

```python
from typing import TypedDict, List, Dict, Any, Optional

class MedicalAgentState(TypedDict):
    user_id: str
    document_type: str
    raw_image_url: Optional[str]
    raw_ocr_text: Optional[str]
    extracted_entities: Dict[str, Any]
    drug_interaction_flags: List[Dict[str, Any]]
    doctor_summary: Optional[Dict[str, Any]]
    lab_biomarkers: List[Dict[str, Any]]
    errors: List[str]
```

### LangGraph Execution Graph (`graph.py`)

```text
[ START ]
                      │
                      ▼
             ┌─────────────────┐
             │  OCR Extraction │ (PaddleOCR / Vision Agent)
             └────────┬────────┘
                      │
                      ▼
         ┌─────────────────────────┐
         │ Router / Document Type  │
         └────────────┬────────────┘
                      ├───────────────────────┬───────────────────────┐
                      ▼                       ▼                       ▼
            [ Prescription Node ]     [ Lab Report Node ]   [ Discharge Summary Node ]
            (Qwen-Plus Entity Parser) (Qwen-Plus Lab Parser) (Qwen-Plus Clinical Parser)
                      │                       │                       │
                      └───────────────────────┼───────────────────────┘
                                              ▼
                                 ┌─────────────────────────┐
                                 │ Drug Interaction Guard  │ (Safety Cross-Check Agent)
                                 └────────────┬────────────┘
                                              │
                                              ▼
                                 ┌─────────────────────────┐
                                 │ Database Sync & Format  │ (PostgreSQL Async Adapter)
                                 └────────────┬────────────┘
                                              │
                                              ▼
                                           [ END ]
```
