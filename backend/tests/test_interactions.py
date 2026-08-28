# HealthVault AI — Unit & Integration Tests for Drug Interaction & Allergy Guard Agent & Endpoint

from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.interaction_agent import (
    DrugInteractionAgent,
    _is_valid_response,
    _parse_response,
)
from app.core.config import settings
from app.core.mock_data import MOCK_INTERACTION_ALERT
from app.main import app
from app.models.allergy import Allergy
from app.models.medication import Medication
from app.schemas.interactions import InteractionCheckResponse


# ==============================================================================
# Helper Unit Tests
# ==============================================================================

def test_is_valid_response():
    assert _is_valid_response({"has_conflicts": True, "alerts": []}) is True
    assert _is_valid_response({"has_conflicts": False}) is False
    assert _is_valid_response({"alerts": []}) is False
    assert _is_valid_response({}) is False


def test_parse_response_with_alerts():
    raw_data = {
        "has_conflicts": True,
        "alerts": [
            {
                "severity": "critical",
                "interacting_drugs": ["Simvastatin", "Amiodarone"],
                "clinical_risk": "Increased risk of rhabdomyolysis.",
                "recommendation_en": "Do not co-administer without dose adjustment.",
                "recommendation_ur": "ان ادویات کو ایک ساتھ مت استعمال کریں۔",
            }
        ],
    }

    result = _parse_response(raw_data)
    assert isinstance(result, InteractionCheckResponse)
    assert result.has_conflicts is True
    assert len(result.alerts) == 1
    assert result.alerts[0].severity == "critical"
    assert result.alerts[0].interacting_drugs == ["Simvastatin", "Amiodarone"]
    assert "rhabdomyolysis" in result.alerts[0].clinical_risk
    assert "ایک ساتھ" in result.alerts[0].recommendation_ur


def test_parse_response_empty_alerts():
    raw_data = {
        "has_conflicts": False,
        "alerts": [],
    }

    result = _parse_response(raw_data)
    assert isinstance(result, InteractionCheckResponse)
    assert result.has_conflicts is False
    assert len(result.alerts) == 0


# ==============================================================================
# DrugInteractionAgent.check_interactions Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_check_interactions_empty_meds():
    mock_db = AsyncMock()
    user_id = uuid.uuid4()

    response = await DrugInteractionAgent.check_interactions(
        db=mock_db,
        user_id=user_id,
        new_medications=[],
    )

    assert response.has_conflicts is False
    assert len(response.alerts) == 0
    # Should not query the DB when no new medications are provided
    mock_db.scalars.assert_not_called()


@pytest.mark.asyncio
async def test_check_interactions_success():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()

    active_meds = [
        Medication(id=uuid.uuid4(), user_id=user_id, name="Warfarin", dosage="5mg", frequency="OD", is_active=True)
    ]
    allergies = [
        Allergy(id=uuid.uuid4(), user_id=user_id, allergen="Aspirin", severity="severe")
    ]

    mock_scalars_meds = MagicMock()
    mock_scalars_meds.all.return_value = active_meds

    mock_scalars_allergies = MagicMock()
    mock_scalars_allergies.all.return_value = allergies

    mock_db.scalars.side_effect = [
        mock_scalars_meds,
        mock_scalars_allergies,
    ]

    llm_payload = {
        "has_conflicts": True,
        "alerts": [
            {
                "severity": "critical",
                "interacting_drugs": ["Aspirin", "Warfarin"],
                "clinical_risk": "Severe risk of bleeding due to additive anticoagulant and antiplatelet effects.",
                "recommendation_en": "Avoid combining Aspirin with Warfarin without strict INR monitoring.",
                "recommendation_ur": "وارفرین کے ساتھ اسپرین ہرگز نہ لیں، خون بہنے کا شدید خطرہ ہے۔",
            }
        ],
    }

    mock_llm_provider = AsyncMock()
    mock_llm_provider.generate_json.return_value = llm_payload

    with patch("app.agents.interaction_agent.get_llm_provider", return_value=mock_llm_provider):
        result = await DrugInteractionAgent.check_interactions(
            db=mock_db,
            user_id=user_id,
            new_medications=["Aspirin 75mg"],
        )

        assert isinstance(result, InteractionCheckResponse)
        assert result.has_conflicts is True
        assert len(result.alerts) == 1
        assert result.alerts[0].severity == "critical"
        assert "خون بہنے کا شدید خطرہ" in result.alerts[0].recommendation_ur
        mock_llm_provider.generate_json.assert_awaited_once()


@pytest.mark.asyncio
async def test_check_interactions_fallback_on_llm_failure():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()

    mock_scalars_meds = MagicMock()
    mock_scalars_meds.all.return_value = []

    mock_scalars_allergies = MagicMock()
    mock_scalars_allergies.all.return_value = []

    mock_db.scalars.side_effect = [
        mock_scalars_meds,
        mock_scalars_allergies,
    ]

    mock_llm_provider = AsyncMock()
    # LLM returns None or invalid schema
    mock_llm_provider.generate_json.return_value = None

    with patch("app.agents.interaction_agent.get_llm_provider", return_value=mock_llm_provider):
        result = await DrugInteractionAgent.check_interactions(
            db=mock_db,
            user_id=user_id,
            new_medications=["Paracetamol 500mg"],
        )

        assert isinstance(result, InteractionCheckResponse)
        assert result.has_conflicts is False
        assert len(result.alerts) == 0


# ==============================================================================
# API Endpoint Integration Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_api_interactions_mock_mode():
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/interactions/check",
            json={"user_id": user_id, "new_medications": ["Simvastatin", "Metformin"]},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_conflicts"] is True
        assert len(data["alerts"]) >= 1
        assert data["alerts"][0]["severity"] == MOCK_INTERACTION_ALERT.alerts[0].severity
        assert "recommendation_ur" in data["alerts"][0]


@pytest.mark.asyncio
async def test_api_interactions_non_mock_success():
    settings.USE_MOCK = False
    user_id = str(uuid.uuid4())

    mock_check_response = InteractionCheckResponse(
        has_conflicts=False,
        alerts=[],
    )

    with patch("app.api.v1.interactions.DrugInteractionAgent.check_interactions", new_callable=AsyncMock) as mock_agent:
        mock_agent.return_value = mock_check_response

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/interactions/check",
                json={"user_id": user_id, "new_medications": ["Vitamin D3 1000IU"]},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["has_conflicts"] is False
            assert data["alerts"] == []


@pytest.mark.asyncio
async def test_api_interactions_internal_error():
    settings.USE_MOCK = False
    user_id = str(uuid.uuid4())

    with patch("app.api.v1.interactions.DrugInteractionAgent.check_interactions", new_callable=AsyncMock) as mock_agent:
        mock_agent.side_effect = RuntimeError("Database query failed")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.post(
                "/api/v1/interactions/check",
                json={"user_id": user_id, "new_medications": ["Ciprofloxacin"]},
            )
            assert response.status_code == 500
            data = response.json()
            assert "Failed to evaluate drug interactions" in data["detail"]
