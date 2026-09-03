# HealthVault AI — Voice Intent Agent Tests
# Tests for VoiceIntentAgent.resolve_intent() and POST /api/v1/voice/query

import json
import uuid
from datetime import date, datetime, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.voice_intent_agent import (
    VoiceIntentAgent,
    _build_fallback_response,
    _build_patient_context_json,
    _has_emergency_keywords,
    _parse_llm_response,
)
from app.main import app
from app.schemas.voice import VoiceIntentResponse


# ---------------------------------------------------------------------------
# Emergency keyword detection
# ---------------------------------------------------------------------------

class TestEmergencyKeywords:
    def test_english_chest_pain(self):
        assert _has_emergency_keywords("I have severe chest pain") is True

    def test_english_difficulty_breathing(self):
        assert _has_emergency_keywords("difficulty breathing right now") is True

    def test_urdu_emergency(self):
        assert _has_emergency_keywords("مجھے سینے کا درد ہو رہا ہے") is True

    def test_no_emergency_keywords(self):
        assert _has_emergency_keywords("میری دوائی کب لینی چاہیے") is False

    def test_case_insensitive(self):
        assert _has_emergency_keywords("CHEST PAIN is bad") is True


# ---------------------------------------------------------------------------
# Patient context serialization
# ---------------------------------------------------------------------------

class TestPatientContextJson:
    def test_build_context_with_data(self):
        user = MagicMock()
        user.profile.full_name = "Test Patient"
        user.profile.blood_group = "O+"

        med = MagicMock()
        med.name = "Metformin"
        med.dosage = "500mg"
        med.frequency = "BD"
        med.timing = "Morning"

        allergy = MagicMock()
        allergy.allergen = "Penicillin"
        allergy.severity = "severe"

        result = _build_patient_context_json(user, [med], [allergy], ["Type 2 Diabetes"])
        parsed = json.loads(result)

        assert parsed["patient_name"] == "Test Patient"
        assert parsed["blood_group"] == "O+"
        assert len(parsed["active_medications"]) == 1
        assert parsed["active_medications"][0]["name"] == "Metformin"
        assert len(parsed["known_allergies"]) == 1
        assert parsed["past_diagnoses"] == ["Type 2 Diabetes"]

    def test_build_context_none_user(self):
        result = _build_patient_context_json(None, [], [], [])
        parsed = json.loads(result)
        assert parsed["patient_name"] == "Unknown"
        assert parsed["blood_group"] is None


# ---------------------------------------------------------------------------
# LLM response parsing
# ---------------------------------------------------------------------------

class TestParseLLMResponse:
    def test_valid_response(self):
        raw = {
            "intent": "medication_schedule",
            "entities_detected": {"medications_mentioned": ["Metformin"]},
            "answer_en": "Take Metformin after breakfast.",
            "answer_ur": "میٹفارمین ناشتے کے بعد لیں۔",
            "requires_emergency_care": False,
            "confidence": 0.92,
        }
        result = _parse_llm_response(raw, "query", False)
        assert result.intent == "medication_schedule"
        assert result.confidence == 0.92
        assert result.requires_emergency_care is False

    def test_invalid_intent_fallback(self):
        raw = {
            "intent": "invalid_intent",
            "entities_detected": {},
            "answer_en": "Answer",
            "answer_ur": "جواب",
            "requires_emergency_care": False,
            "confidence": 0.5,
        }
        result = _parse_llm_response(raw, "query", False)
        assert result.intent == "general_inquiry"

    def test_empty_response_fallback(self):
        result = _parse_llm_response({}, "some query", False)
        assert result.intent == "general_inquiry"
        assert result.confidence == 0.5

    def test_emergency_override(self):
        raw = {
            "intent": "symptom_triage",
            "entities_detected": {},
            "answer_en": "Some answer",
            "answer_ur": "جواب",
            "requires_emergency_care": False,
            "confidence": 0.6,
        }
        result = _parse_llm_response(raw, "chest pain query", True)
        assert result.intent == "emergency_sos"
        assert result.requires_emergency_care is True
        assert result.confidence >= 0.9

    def test_confidence_clamped(self):
        raw = {
            "intent": "general_inquiry",
            "entities_detected": {},
            "answer_en": "Answer",
            "answer_ur": "جواب",
            "requires_emergency_care": False,
            "confidence": 1.5,  # out of range
        }
        result = _parse_llm_response(raw, "query", False)
        assert result.confidence == 1.0

    def test_empty_answers_get_fallback(self):
        raw = {
            "intent": "dosage_inquiry",
            "entities_detected": {},
            "answer_en": "",
            "answer_ur": "",
            "requires_emergency_care": False,
            "confidence": 0.7,
        }
        result = _parse_llm_response(raw, "query", False)
        assert result.answer_en != ""
        assert result.answer_ur != ""


# ---------------------------------------------------------------------------
# Fallback response builder
# ---------------------------------------------------------------------------

class TestFallbackResponse:
    def test_emergency_fallback(self):
        result = _build_fallback_response("chest pain", True)
        assert result.intent == "emergency_sos"
        assert result.requires_emergency_care is True
        assert "1122" in result.answer_en
        assert result.confidence == 0.85

    def test_general_fallback(self):
        result = _build_fallback_response("some query", False)
        assert result.intent == "general_inquiry"
        assert result.requires_emergency_care is False
        assert result.confidence == 0.5


# ---------------------------------------------------------------------------
# Agent integration tests (with mocked DB and LLM)
# ---------------------------------------------------------------------------

@pytest.fixture
def mock_db():
    db = AsyncMock()
    return db


@pytest.fixture
def mock_user():
    user = MagicMock()
    user.id = uuid.uuid4()
    user.profile.full_name = "Test Patient"
    user.profile.blood_group = "B+"
    return user


@pytest.fixture
def mock_med():
    med = MagicMock()
    med.name = "Metformin"
    med.dosage = "500mg"
    med.frequency = "BD"
    med.timing = "Morning"
    return med


@pytest.fixture
def mock_allergy():
    allergy = MagicMock()
    allergy.allergen = "Penicillin"
    allergy.severity = "severe"
    return allergy


class TestVoiceIntentAgent:
    @pytest.mark.asyncio
    async def test_resolve_intent_success(self, mock_db, mock_user, mock_med, mock_allergy):
        # Mock DB scalar results
        mock_db.scalar = AsyncMock(return_value=mock_user)
        mock_db.scalars = AsyncMock(
            side_effect=[
                AsyncMock(all=MagicMock(return_value=[mock_med])),  # medications
                AsyncMock(all=MagicMock(return_value=[mock_allergy])),  # allergies
                AsyncMock(all=MagicMock(return_value=[])),  # records
            ]
        )

        mock_llm_result = {
            "intent": "medication_schedule",
            "entities_detected": {"medications_mentioned": ["Metformin"]},
            "answer_en": "Take Metformin after breakfast.",
            "answer_ur": "میٹفارمین ناشتے کے بعد لیں۔",
            "requires_emergency_care": False,
            "confidence": 0.95,
        }

        with patch(
            "app.agents.voice_intent_agent.get_llm_provider"
        ) as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.generate_json = AsyncMock(return_value=mock_llm_result)
            mock_get_provider.return_value = mock_provider

            result = await VoiceIntentAgent.resolve_intent(
                db=mock_db,
                user_id=mock_user.id,
                query_text="میری میٹفارمین کی دوائی کب لینی چاہیے",
            )

        assert isinstance(result, VoiceIntentResponse)
        assert result.intent == "medication_schedule"
        assert result.confidence == 0.95
        assert "Metformin" in result.answer_en

    @pytest.mark.asyncio
    async def test_resolve_intent_user_not_found(self, mock_db):
        mock_db.scalar = AsyncMock(return_value=None)
        mock_db.scalars = AsyncMock(
            side_effect=[
                AsyncMock(all=MagicMock(return_value=[])),
                AsyncMock(all=MagicMock(return_value=[])),
                AsyncMock(all=MagicMock(return_value=[])),
            ]
        )

        with pytest.raises(ValueError, match="No user found"):
            await VoiceIntentAgent.resolve_intent(
                db=mock_db,
                user_id=uuid.uuid4(),
                query_text="test query",
            )

    @pytest.mark.asyncio
    async def test_resolve_intent_emergency_keywords(self, mock_db, mock_user):
        mock_db.scalar = AsyncMock(return_value=mock_user)
        mock_db.scalars = AsyncMock(
            side_effect=[
                AsyncMock(all=MagicMock(return_value=[])),
                AsyncMock(all=MagicMock(return_value=[])),
                AsyncMock(all=MagicMock(return_value=[])),
            ]
        )

        with patch(
            "app.agents.voice_intent_agent.get_llm_provider"
        ) as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.generate_json = AsyncMock(return_value={})
            mock_get_provider.return_value = mock_provider

            result = await VoiceIntentAgent.resolve_intent(
                db=mock_db,
                user_id=mock_user.id,
                query_text="I have severe chest pain and difficulty breathing",
            )

        assert result.intent == "emergency_sos"
        assert result.requires_emergency_care is True
        assert "1122" in result.answer_en

    @pytest.mark.asyncio
    async def test_resolve_intent_llm_empty_fallback(self, mock_db, mock_user):
        mock_db.scalar = AsyncMock(return_value=mock_user)
        mock_db.scalars = AsyncMock(
            side_effect=[
                AsyncMock(all=MagicMock(return_value=[])),
                AsyncMock(all=MagicMock(return_value=[])),
                AsyncMock(all=MagicMock(return_value=[])),
            ]
        )

        with patch(
            "app.agents.voice_intent_agent.get_llm_provider"
        ) as mock_get_provider:
            mock_provider = MagicMock()
            mock_provider.generate_json = AsyncMock(return_value={})
            mock_get_provider.return_value = mock_provider

            result = await VoiceIntentAgent.resolve_intent(
                db=mock_db,
                user_id=mock_user.id,
                query_text="general health question",
            )

        assert result.intent == "general_inquiry"
        assert result.confidence == 0.5


# ---------------------------------------------------------------------------
# API endpoint tests
# ---------------------------------------------------------------------------

class TestVoiceQueryEndpoint:
    @pytest.mark.asyncio
    async def test_query_endpoint_success(self):
        mock_response = VoiceIntentResponse(
            intent="medication_schedule",
            entities_detected={"medications_mentioned": ["Metformin"]},
            answer_en="Take Metformin after breakfast.",
            answer_ur="میٹفارمین ناشتے کے بعد لیں۔",
            requires_emergency_care=False,
            confidence=0.92,
        )

        test_user_id = uuid.uuid4()

        with patch(
            "app.agents.voice_intent_agent.VoiceIntentAgent.resolve_intent",
            new_callable=AsyncMock,
            return_value=mock_response,
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as ac:
                resp = await ac.post(
                    "/api/v1/voice/query",
                    json={
                        "user_id": str(test_user_id),
                        "query_text": "میری دوائی کب لینی چاہیے",
                    },
                )

        assert resp.status_code == 200
        data = resp.json()
        assert data["intent"] == "medication_schedule"
        assert data["requires_emergency_care"] is False

    @pytest.mark.asyncio
    async def test_query_endpoint_user_not_found(self):
        test_user_id = uuid.uuid4()

        with patch(
            "app.agents.voice_intent_agent.VoiceIntentAgent.resolve_intent",
            new_callable=AsyncMock,
            side_effect=ValueError(f"No user found with id '{test_user_id}'"),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as ac:
                resp = await ac.post(
                    "/api/v1/voice/query",
                    json={
                        "user_id": str(test_user_id),
                        "query_text": "test",
                    },
                )

        assert resp.status_code == 404

    @pytest.mark.asyncio
    async def test_query_endpoint_invalid_uuid(self):
        async with AsyncClient(
            transport=ASGITransport(app=app),
            base_url="http://test",
        ) as ac:
            resp = await ac.post(
                "/api/v1/voice/query",
                json={
                    "user_id": "not-a-uuid",
                    "query_text": "test",
                },
            )

        assert resp.status_code == 422

    @pytest.mark.asyncio
    async def test_query_endpoint_server_error(self):
        test_user_id = uuid.uuid4()

        with patch(
            "app.agents.voice_intent_agent.VoiceIntentAgent.resolve_intent",
            new_callable=AsyncMock,
            side_effect=RuntimeError("DB connection lost"),
        ):
            async with AsyncClient(
                transport=ASGITransport(app=app),
                base_url="http://test",
            ) as ac:
                resp = await ac.post(
                    "/api/v1/voice/query",
                    json={
                        "user_id": str(test_user_id),
                        "query_text": "test",
                    },
                )

        assert resp.status_code == 500
