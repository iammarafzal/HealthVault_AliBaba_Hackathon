# HealthVault AI — Urdu Speech-to-Text Voice Service
# Groq Whisper (whisper-large-v3) with deterministic mock fallback.

import asyncio
import logging
from typing import Set

from fastapi import UploadFile

from app.core.config import settings
from app.schemas.voice import VoiceTranscriptionResponse

logger = logging.getLogger("healthvault")

# Allowed audio MIME → extension mapping
_ALLOWED_EXTENSIONS: Set[str] = {".wav", ".mp3", ".m4a", ".webm", ".ogg"}

# Realistic mock Urdu medical voice queries for demo / offline mode
_MOCK_URDU_TRANSCRIPTIONS = [
    "میرا شوگر لیول پچھلے ہفتے سے زیادہ ہے اور ڈاکٹر نے دوائی بدلنے کا کہا ہے",
    "مجھے صبح کی دوائی یاد دلائیں اور بلڈ پریشر کی رپورٹ بھی دکھا دیں",
    "میری الرجی کی تفصیل بتائیں اور نئی دوائی کا اثر چیک کریں",
]
_MOCK_INDEX = 0


def _mock_transcription() -> VoiceTranscriptionResponse:
    """Return a deterministic mock Urdu transcription (round-robin)."""
    global _MOCK_INDEX
    text = _MOCK_URDU_TRANSCRIPTIONS[_MOCK_INDEX % len(_MOCK_URDU_TRANSCRIPTIONS)]
    _MOCK_INDEX += 1
    return VoiceTranscriptionResponse(
        transcribed_text=text,
        language="ur",
        confidence=0.97,
    )


class VoiceService:
    """Urdu speech-to-text service backed by Groq Whisper with mock fallback."""

    # ------------------------------------------------------------------
    # Public entry-point
    # ------------------------------------------------------------------
    @staticmethod
    async def transcribe_audio(file: UploadFile) -> VoiceTranscriptionResponse:
        """Transcribe an uploaded audio file to Urdu text.

        Falls back to a realistic mock transcription when:
        - ``settings.USE_MOCK`` is True, or
        - ``GROQ_API_KEY`` is not configured, or
        - The Groq API call fails for any reason.

        Args:
            file: FastAPI ``UploadFile`` with audio content.

        Returns:
            VoiceTranscriptionResponse with transcribed Urdu text.

        Raises:
            ValueError: If the audio format is not supported.
        """
        # 1. Validate format -------------------------------------------------------
        ext = VoiceService._validate_format(file.filename or "")
        if ext is None:
            raise ValueError(
                f"Unsupported audio format. Allowed: {', '.join(sorted(_ALLOWED_EXTENSIONS))}"
            )

        # 2. Mock fast-path --------------------------------------------------------
        if settings.USE_MOCK or not settings.GROQ_API_KEY:
            logger.info("VoiceService: returning mock transcription (USE_MOCK=%s)", settings.USE_MOCK)
            return _mock_transcription()

        # 3. Groq Whisper API call -------------------------------------------------
        try:
            return await VoiceService._call_groq_whisper(file, ext)
        except Exception as exc:
            logger.warning("Groq Whisper failed (%s), falling back to mock", exc)
            return _mock_transcription()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------
    @staticmethod
    def _validate_format(filename: str) -> str | None:
        """Return the lower-cased file extension if supported, else None."""
        import os
        ext = os.path.splitext(filename)[1].lower()
        if ext in _ALLOWED_EXTENSIONS:
            return ext
        return None

    @staticmethod
    async def _call_groq_whisper(file: UploadFile, ext: str) -> VoiceTranscriptionResponse:
        """Invoke Groq Whisper-large-v3 for Urdu transcription (runs sync SDK in thread)."""
        import groq

        audio_bytes = await file.read()

        # Build a filename the API accepts
        safe_name = f"voice_input{ext}"

        def _sync_call() -> str:
            client = groq.Groq(api_key=settings.GROQ_API_KEY)
            transcription = client.audio.transcriptions.create(
                model=settings.GROQ_ASR_MODEL,
                file=(safe_name, audio_bytes),
                language="ur",
                response_format="text",
            )
            # The SDK returns either a string or an object with a .text attribute
            if isinstance(transcription, str):
                return transcription.strip()
            return getattr(transcription, "text", str(transcription)).strip()

        text = await asyncio.to_thread(_sync_call)

        if not text:
            raise RuntimeError("Empty transcription returned by Groq Whisper")

        logger.info("Groq Whisper transcribed %d chars (ur)", len(text))

        return VoiceTranscriptionResponse(
            transcribed_text=text,
            language="ur",
            confidence=None,  # Groq Whisper text format does not include confidence
        )
