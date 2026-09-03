# HealthVault AI — Prescription Chat & Interpreter Schemas

from __future__ import annotations

from typing import Any, Dict, List, Literal, Optional
from pydantic import BaseModel, Field

from app.agents.interpreter_graph import StructuredPrescriptionOutput, StructuredMedicationSlot


class ChatMessage(BaseModel):
    role: Literal["user", "assistant", "system"]
    content: str


class PrescriptionChatRequest(BaseModel):
    record_id: Optional[str] = Field(None, description="Optional UUID of the medical record")
    language: Literal["en", "ur"] = Field("ur", description="Active conversation language")
    messages: List[ChatMessage] = Field(default_factory=list, description="Chat message history")
    prescription_context: Optional[Dict[str, Any]] = Field(
        None, description="Structured parsed prescription details (doctor, meds, timing, diagnoses)"
    )


class PrescriptionChatResponse(BaseModel):
    reply: str = Field(..., description="Assistant reply in requested language")
    suggested_followups: List[str] = Field(
        default_factory=list, description="Localized quick follow-up prompt chips"
    )


class PrescriptionIngestRequest(BaseModel):
    raw_text: Optional[str] = Field(None, description="Scanned raw text or OCR text")
    language: Literal["en", "ur"] = Field("ur", description="Target language")


class PrescriptionIngestResponse(BaseModel):
    extracted_prescription: Optional[StructuredPrescriptionOutput] = Field(
        None, description="Structured extracted prescription clinical details"
    )
    summary_en: str = Field(..., description="Short English clinical summary")
    summary_ur: str = Field(..., description="Short Urdu clinical summary")
