# HealthVault AI — Voice Assistant Pydantic Schemas
# VoiceQueryRequest, VoiceQueryResponse, VoiceTranscriptionResponse,
# VoiceIntentRequest, VoiceIntentResponse

from typing import Any, Dict, Optional
from uuid import UUID

from pydantic import BaseModel, Field


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


class VoiceTranscriptionResponse(BaseModel):
    """Result of Urdu speech-to-text transcription."""
    transcribed_text: str = Field(
        ...,
        examples=["میرا شوگر لیول پچھلے ہفتے سے زیادہ ہے"],
    )
    language: str = Field(default="ur", examples=["ur"])
    confidence: Optional[float] = Field(default=None, ge=0.0, le=1.0)


class VoiceIntentRequest(BaseModel):
    """Request body for the voice intent-resolution endpoint."""
    user_id: UUID
    query_text: str = Field(
        ...,
        examples=["میری میٹفارمین کی دوائی کب لینی چاہیے"],
    )
    language_hint: Optional[str] = Field(default="ur", examples=["ur", "en"])


class VoiceIntentResponse(BaseModel):
    """Bilingual intent-resolution response grounded in patient context."""
    intent: str = Field(
        ...,
        examples=[
            "medication_schedule",
            "dosage_inquiry",
            "symptom_triage",
            "emergency_sos",
            "general_inquiry",
        ],
    )
    entities_detected: Dict[str, Any] = Field(default_factory=dict)
    answer_en: str
    answer_ur: str
    requires_emergency_care: bool = False
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)
