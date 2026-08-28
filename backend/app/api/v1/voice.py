# HealthVault AI — Urdu Voice Assistant Routes
# POST /api/v1/voice/transcribe — Urdu speech-to-text via Groq Whisper

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app.schemas.voice import VoiceTranscriptionResponse
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/voice", tags=["Voice"])


@router.post(
    "/transcribe",
    response_model=VoiceTranscriptionResponse,
    status_code=status.HTTP_200_OK,
    summary="Transcribe Urdu audio to text (Groq Whisper + mock fallback)",
)
async def transcribe_audio(
    audio: UploadFile = File(..., description="Audio file (.wav, .mp3, .m4a, .webm, .ogg)"),
) -> VoiceTranscriptionResponse:
    """Accept an audio upload and return Urdu transcription.

    Uses Groq Whisper-large-v3 when ``GROQ_API_KEY`` is configured and
    ``USE_MOCK`` is False.  Otherwise returns a realistic mock Urdu
    medical voice query.
    """
    try:
        return await VoiceService.transcribe_audio(file=audio)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Audio transcription failed. Please try again.",
        ) from exc
