# HealthVault AI — API Contracts & Type Definitions

This file specifies the exact JSON schemas, Pydantic backend models, and TypeScript frontend interfaces for all API endpoints.

---

## 1. Authentication & User Profile

### `POST /api/v1/auth/register` | `GET /api/v1/user/profile`

#### Backend: Pydantic (`app/schemas/user.py`)
```python
from pydantic import BaseModel, EmailStr, Field
from typing import List, Optional
from uuid import UUID
from datetime import date, datetime

class EmergencyContact(BaseModel):
    name: str = Field(..., example="Ali Khan")
    relation: str = Field(..., example="Brother")
    phone: str = Field(..., example="+92-300-1234567")

class UserBase(BaseModel):
    full_name: str
    email: Optional[EmailStr] = None
    phone: str
    blood_group: Optional[str] = "B+"
    date_of_birth: Optional[date] = None
    gender: Optional[str] = "male"
    emergency_contacts: List[EmergencyContact] = []

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    health_id: str
    role: str
    created_at: datetime

    class Config:
        from_attributes = True
```

#### Frontend: TypeScript (`src/types/models.d.ts`)
```typescript
export interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
}

export interface UserProfile {
  id: string;
  health_id: string;
  full_name: string;
  email?: string;
  phone: string;
  role: 'patient' | 'caregiver' | 'doctor';
  blood_group?: string;
  date_of_birth?: string;
  gender?: string;
  emergency_contacts: EmergencyContact[];
  created_at: string;
}
```

---

## 2. Document Ingestion & Extraction Engine

### `POST /api/v1/vault/upload-and-extract`

#### Backend: Pydantic (`app/schemas/vault.py`)
```python
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import date

class ExtractedMedication(BaseModel):
    name: str = Field(..., example="Metformin")
    dosage: str = Field(..., example="500mg")
    frequency: str = Field(..., example="BD (Twice Daily)")
    timing: str = Field(..., example="Morning / Night")
    instructions_en: str
    instructions_ur: str
    is_active: bool = True

class ExtractedAllergy(BaseModel):
    allergen: str
    severity: str = "moderate"
    reaction_details: Optional[str] = None

class ExtractionResponse(BaseModel):
    record_id: UUID
    document_type: str  # "prescription" | "lab_report" | "discharge_summary"
    doctor_name: Optional[str] = None
    hospital_name: Optional[str] = None
    consultation_date: Optional[date] = None
    diagnoses: List[str] = []
    medications: List[ExtractedMedication] = []
    allergies: List[ExtractedAllergy] = []
    raw_ocr_text: str
```

#### Frontend: TypeScript (`src/types/api.d.ts`)
```typescript
export interface ExtractedMedication {
  name: string;
  dosage: string;
  frequency: string;
  timing: string;
  instructions_en: string;
  instructions_ur: string;
  is_active: boolean;
}

export interface ExtractedAllergy {
  allergen: string;
  severity: 'mild' | 'moderate' | 'severe';
  reaction_details?: string;
}

export interface ExtractionResponse {
  record_id: string;
  document_type: 'prescription' | 'lab_report' | 'discharge_summary';
  doctor_name?: string;
  hospital_name?: string;
  consultation_date?: string;
  diagnoses: string[];
  medications: ExtractedMedication[];
  allergies: ExtractedAllergy[];
  raw_ocr_text: string;
}
```

---

## 3. AI Doctor Summary

### `GET /api/v1/summary/generate?user_id={id}`

#### Backend: Pydantic (`app/schemas/summary.py`)
```python
from pydantic import BaseModel
from typing import List, Optional

class DoctorSummaryResponse(BaseModel):
    patient_name: str
    health_id: str
    age_gender: str
    blood_group: str
    active_diagnoses: List[str]
    current_medications: List[str]
    known_allergies: List[str]
    surgical_history: List[str]
    recent_abnormal_biomarkers: List[str]
    risk_factors: List[str]
    clinical_notes: str
```

#### Frontend: TypeScript (`src/types/models.d.ts`)
```typescript
export interface DoctorSummary {
  patient_name: string;
  health_id: string;
  age_gender: string;
  blood_group: string;
  active_diagnoses: string[];
  current_medications: string[];
  known_allergies: string[];
  surgical_history: string[];
  recent_abnormal_biomarkers: string[];
  risk_factors: string[];
  clinical_notes: string;
}
```

---

## 4. AI Drug Interaction & Allergy Guard

### `POST /api/v1/interactions/check`

#### Backend: Pydantic (`app/schemas/interactions.py`)
```python
from pydantic import BaseModel
from typing import List
from uuid import UUID

class InteractionCheckRequest(BaseModel):
    user_id: UUID
    new_medications: List[str]

class DrugInteractionAlert(BaseModel):
    severity: str  # "low" | "medium" | "critical"
    interacting_drugs: List[str]
    clinical_risk: str
    recommendation_en: str
    recommendation_ur: str

class InteractionCheckResponse(BaseModel):
    has_conflicts: bool
    alerts: List[DrugInteractionAlert]
```

#### Frontend: TypeScript (`src/types/api.d.ts`)
```typescript
export interface DrugInteractionAlert {
  severity: 'low' | 'medium' | 'critical';
  interacting_drugs: string[];
  clinical_risk: string;
  recommendation_en: string;
  recommendation_ur: string;
}

export interface InteractionCheckResponse {
  has_conflicts: boolean;
  alerts: DrugInteractionAlert[];
}
```

---

## 5. Public Emergency Access (Zero Login)

### `GET /api/v1/emergency/{health_id}`

#### Backend: Pydantic (`app/schemas/emergency.py`)
```python
from pydantic import BaseModel
from typing import List, Optional
from app.schemas.user import EmergencyContact

class EmergencyProfileResponse(BaseModel):
    health_id: str
    full_name: str
    blood_group: Optional[str] = None
    critical_allergies: List[str] = []
    active_medications: List[str] = []
    chronic_conditions: List[str] = []
    emergency_contacts: List[EmergencyContact] = []
    is_revoked: bool = False
```

#### Frontend: TypeScript (`src/types/models.d.ts`)
```typescript
export interface EmergencyProfile {
  health_id: string;
  full_name: string;
  blood_group?: string;
  critical_allergies: string[];
  active_medications: string[];
  chronic_conditions: string[];
  emergency_contacts: EmergencyContact[];
  is_revoked: boolean;
}
```

---

## 6. Longitudinal Lab Biomarkers

### `GET /api/v1/biomarkers/timeline?user_id={id}&metric={name}`

#### Backend: Pydantic (`app/schemas/biomarker.py`)
```python
from pydantic import BaseModel
from typing import List, Optional
from datetime import date

class BiomarkerDataPoint(BaseModel):
    test_date: date
    value: float
    unit: str
    reference_min: Optional[float] = None
    reference_max: Optional[float] = None
    status: str  # "normal" | "low" | "high"

class BiomarkerTimelineResponse(BaseModel):
    biomarker_name: str
    timeline: List[BiomarkerDataPoint]
    summary_insight: str
```

#### Frontend: TypeScript (`src/types/models.d.ts`)
```typescript
export interface BiomarkerDataPoint {
  test_date: string;
  value: number;
  unit: string;
  reference_min?: number;
  reference_max?: number;
  status: 'normal' | 'low' | 'high';
}

export interface BiomarkerTimeline {
  biomarker_name: string;
  timeline: BiomarkerDataPoint[];
  summary_insight: string;
}
```

---

## 7. Urdu Voice Assistant (Speech Intent)

### `POST /api/v1/voice/query`

#### Backend: Pydantic (`app/schemas/voice.py`)
```python
from pydantic import BaseModel
from typing import Optional, Dict, Any

class VoiceQueryRequest(BaseModel):
    user_id: str
    audio_base64: Optional[str] = None
    text_prompt: Optional[str] = None  # Fallback for typed queries

class VoiceQueryResponse(BaseModel):
    transcription_ur: str
    intent: str  # "medication_schedule" | "symptom_log" | "allergy_check"
    response_ur: str
    response_en: str
    structured_payload: Optional[Dict[str, Any]] = None
```

#### Frontend: TypeScript (`src/types/api.d.ts`)
```typescript
export interface VoiceQueryResponse {
  transcription_ur: string;
  intent: 'medication_schedule' | 'symptom_log' | 'allergy_check';
  response_ur: string;
  response_en: string;
  structured_payload?: Record<string, any>;
}
```