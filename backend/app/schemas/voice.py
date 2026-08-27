# HealthVault AI — Voice Assistant Pydantic Schemas
# VoiceQueryRequest, VoiceQueryResponse

from typing import Any, Dict, Optional

from pydantic import BaseModel


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
