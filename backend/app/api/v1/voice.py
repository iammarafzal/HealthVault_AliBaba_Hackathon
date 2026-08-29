# HealthVault AI — Urdu Voice Assistant Routes
# POST /api/v1/voice/transcribe — Urdu speech-to-text via Groq Whisper
# POST /api/v1/voice/query      — Intent resolution with context-grounded bilingual answers

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.schemas.voice import VoiceIntentRequest, VoiceIntentResponse, VoiceTranscriptionResponse
from app.services.voice_service import VoiceService

router = APIRouter(prefix="/voice", tags=["Voice"])


# ---------------------------------------------------------------------------
# POST /api/v1/voice/transcribe
# ---------------------------------------------------------------------------
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


# ---------------------------------------------------------------------------
# POST /api/v1/voice/query
# ---------------------------------------------------------------------------
@router.post(
    "/query",
    response_model=VoiceIntentResponse,
    status_code=status.HTTP_200_OK,
    summary="Resolve voice query intent with patient-context-grounded bilingual answers",
)
async def resolve_voice_query(
    body: VoiceIntentRequest,
    db: AsyncSession = Depends(get_db),
) -> VoiceIntentResponse:
    """Classify the user's voice query intent and return bilingual answers.

    The agent fetches the patient's active medications, allergies, and
    diagnoses from PostgreSQL, then invokes the LLM provider to generate
    context-grounded responses in English and Urdu.

    Accepts both ``query_text`` (native) and ``text_prompt``
    (API_CONTRACTS §7 VoiceQueryRequest) as the query text field.

    Safety triage: if emergency keywords are detected, the response is
    overridden to ``emergency_sos`` with ``requires_emergency_care=True``.
    """
    from app.agents.voice_intent_agent import VoiceIntentAgent

    query_text = body.resolved_query
    if not query_text:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Either 'query_text' or 'text_prompt' must be provided.",
        )

    try:
        return await VoiceIntentAgent.resolve_intent(
            db=db,
            user_id=body.user_id,
            query_text=query_text,
        )
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(exc),
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Voice intent resolution failed. Please try again.",
        ) from exc
