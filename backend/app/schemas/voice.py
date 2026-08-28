# HealthVault AI — Voice Assistant Pydantic Schemas
# VoiceQueryRequest, VoiceQueryResponse, VoiceTranscriptionResponse

from typing import Any, Dict, Optional

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
