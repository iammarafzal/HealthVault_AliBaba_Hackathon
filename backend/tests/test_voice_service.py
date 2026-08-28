# HealthVault AI — Unit & Integration Tests for Urdu Voice Service (Groq Whisper & Mock Fallback)

import io
from unittest.mock import MagicMock, patch
import pytest
from fastapi import UploadFile
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app
from app.schemas.voice import VoiceTranscriptionResponse
from app.services.voice_service import VoiceService, _mock_transcription


# ==============================================================================
# Helper Unit Tests
# ==============================================================================

def test_validate_format_supported():
    assert VoiceService._validate_format("recording.wav") == ".wav"
    assert VoiceService._validate_format("audio.MP3") == ".mp3"
    assert VoiceService._validate_format("voice.m4a") == ".m4a"
    assert VoiceService._validate_format("clip.webm") == ".webm"
    assert VoiceService._validate_format("note.ogg") == ".ogg"


def test_validate_format_unsupported():
    assert VoiceService._validate_format("document.pdf") is None
    assert VoiceService._validate_format("video.mp4") is None
    assert VoiceService._validate_format("notes.txt") is None
    assert VoiceService._validate_format("") is None


def test_mock_transcription_round_robin():
    res1 = _mock_transcription()
    res2 = _mock_transcription()

    assert isinstance(res1, VoiceTranscriptionResponse)
    assert res1.language == "ur"
    assert res1.confidence == 0.97
    assert len(res1.transcribed_text) > 0
    assert isinstance(res2, VoiceTranscriptionResponse)


# ==============================================================================
# VoiceService.transcribe_audio Unit Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_transcribe_audio_unsupported_format():
    upload = UploadFile(
        filename="test.txt",
        file=io.BytesIO(b"not audio"),
    )

    with pytest.raises(ValueError, match="Unsupported audio format"):
        await VoiceService.transcribe_audio(upload)


@pytest.mark.asyncio
async def test_transcribe_audio_use_mock_true():
    settings.USE_MOCK = True
    upload = UploadFile(
        filename="query.wav",
        file=io.BytesIO(b"RIFF dummy wav content"),
    )

    res = await VoiceService.transcribe_audio(upload)
    assert isinstance(res, VoiceTranscriptionResponse)
    assert res.language == "ur"
    assert res.confidence == 0.97
    assert len(res.transcribed_text) > 0


@pytest.mark.asyncio
async def test_transcribe_audio_missing_api_key_fallback():
    settings.USE_MOCK = False
    settings.GROQ_API_KEY = ""

    upload = UploadFile(
        filename="query.mp3",
        file=io.BytesIO(b"dummy mp3 content"),
    )

    res = await VoiceService.transcribe_audio(upload)
    assert isinstance(res, VoiceTranscriptionResponse)
    assert res.language == "ur"
    assert len(res.transcribed_text) > 0


@pytest.mark.asyncio
async def test_transcribe_audio_groq_whisper_success():
    settings.USE_MOCK = False
    settings.GROQ_API_KEY = "gsk_test_key"

    upload = UploadFile(
        filename="query.wav",
        file=io.BytesIO(b"RIFF sample audio content"),
    )

    mock_client = MagicMock()
    mock_transcription = MagicMock()
    mock_transcription.text = "مجھے خون کے ٹیسٹ کی رپورٹ چیک کرنی ہے"
    mock_client.audio.transcriptions.create.return_value = mock_transcription

    with patch("groq.Groq", return_value=mock_client):
        res = await VoiceService.transcribe_audio(upload)

        assert isinstance(res, VoiceTranscriptionResponse)
        assert res.transcribed_text == "مجھے خون کے ٹیسٹ کی رپورٹ چیک کرنی ہے"
        assert res.language == "ur"
        assert res.confidence is None


@pytest.mark.asyncio
async def test_transcribe_audio_groq_whisper_api_failure_fallback():
    settings.USE_MOCK = False
    settings.GROQ_API_KEY = "gsk_test_key"

    upload = UploadFile(
        filename="query.wav",
        file=io.BytesIO(b"RIFF sample audio content"),
    )

    mock_client = MagicMock()
    mock_client.audio.transcriptions.create.side_effect = RuntimeError("Groq Rate Limit Exceeded")

    with patch("groq.Groq", return_value=mock_client):
        # Should gracefully fall back to mock Urdu transcription
        res = await VoiceService.transcribe_audio(upload)

        assert isinstance(res, VoiceTranscriptionResponse)
        assert res.language == "ur"
        assert len(res.transcribed_text) > 0


# ==============================================================================
# Endpoint Integration Tests: POST /api/v1/voice/transcribe
# ==============================================================================

@pytest.mark.asyncio
async def test_api_transcribe_mock_mode():
    settings.USE_MOCK = True
    audio_bytes = b"RIFF dummy audio content"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/voice/transcribe",
            files={"audio": ("sample_voice.wav", audio_bytes, "audio/wav")},
        )
        assert response.status_code == 200
        data = response.json()
        assert "transcribed_text" in data
        assert data["language"] == "ur"
        assert len(data["transcribed_text"]) > 0


@pytest.mark.asyncio
async def test_api_transcribe_unsupported_format():
    pdf_bytes = b"%PDF-1.4 dummy pdf"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/voice/transcribe",
            files={"audio": ("report.pdf", pdf_bytes, "application/pdf")},
        )
        assert response.status_code == 400
        assert "Unsupported audio format" in response.json()["detail"]


@pytest.mark.asyncio
async def test_api_transcribe_server_error():
    audio_bytes = b"RIFF dummy audio"

    with patch("app.api.v1.voice.VoiceService.transcribe_audio", side_effect=RuntimeError("Unexpected crash")):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/voice/transcribe",
                files={"audio": ("sample.wav", audio_bytes, "audio/wav")},
            )
            assert response.status_code == 500
            assert "Audio transcription failed" in response.json()["detail"]
