# HealthVault AI — Unit & Integration Tests for Public Zero-Login Emergency Service & Endpoint

from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.core.mock_data import MOCK_EMERGENCY_PROFILE
from app.main import app
from app.models.allergy import Allergy
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import PrivacySettings, User
from app.schemas.emergency import EmergencyProfileResponse
from app.services.emergency_service import EmergencyService, _build_profile, _fetch_medical_data


def _create_test_user(health_id: str = "HV-99999") -> User:
    user_id = uuid.uuid4()
    return User(
        id=user_id,
        email="emergency_test@example.com",
        full_name="Fatima Noor",
        health_id=health_id,
        gender="female",
        blood_group="O-",
        emergency_contacts=[
            {"name": "Ali Noor", "relation": "Brother", "phone": "+923001234567"},
            {"name": "Ayesha Noor", "relation": "Mother", "phone": "+923007654321"},
        ],
    )


# ==============================================================================
# Helper Unit Tests
# ==============================================================================

def test_build_profile_all_visible():
    user = _create_test_user()
    privacy = PrivacySettings(
        user_id=user.id,
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )
    meds = [Medication(id=uuid.uuid4(), user_id=user.id, name="Insulin", dosage="10 units", is_active=True)]
    allergies = [Allergy(id=uuid.uuid4(), user_id=user.id, allergen="Penicillin", severity="severe")]
    records = [
        MedicalRecord(
            id=uuid.uuid4(),
            user_id=user.id,
            document_type="prescription",
            extracted_data={"diagnoses": ["Type 1 Diabetes"]},
        )
    ]

    profile = _build_profile(
        user=user,
        privacy=privacy,
        active_meds=meds,
        severe_allergies=allergies,
        records=records,
    )

    assert isinstance(profile, EmergencyProfileResponse)
    assert profile.health_id == user.health_id
    assert profile.full_name == "Fatima Noor"
    assert profile.blood_group == "O-"
    assert profile.critical_allergies == ["Penicillin (severe)"]
    assert profile.active_medications == ["Insulin 10 units"]
    assert profile.chronic_conditions == ["Type 1 Diabetes"]
    assert len(profile.emergency_contacts) == 2
    assert profile.is_revoked is False


def test_build_profile_privacy_redacted():
    user = _create_test_user()
    privacy = PrivacySettings(
        user_id=user.id,
        show_blood_group=False,
        show_allergies=False,
        show_active_meds=False,
        show_chronic_conditions=False,
        show_emergency_contacts=False,
        qr_revoked=False,
    )
    meds = [Medication(id=uuid.uuid4(), user_id=user.id, name="Insulin", dosage="10 units", is_active=True)]
    allergies = [Allergy(id=uuid.uuid4(), user_id=user.id, allergen="Penicillin", severity="severe")]
    records = [
        MedicalRecord(
            id=uuid.uuid4(),
            user_id=user.id,
            document_type="prescription",
            extracted_data={"diagnoses": ["Type 1 Diabetes"]},
        )
    ]

    profile = _build_profile(
        user=user,
        privacy=privacy,
        active_meds=meds,
        severe_allergies=allergies,
        records=records,
    )

    assert profile.blood_group is None
    assert profile.critical_allergies == []
    assert profile.active_medications == []
    assert profile.chronic_conditions == []
    assert profile.emergency_contacts == []
    assert profile.is_revoked is False


# ==============================================================================
# EmergencyService.get_emergency_profile_by_health_id Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_get_emergency_profile_user_not_found():
    mock_db = AsyncMock()
    mock_db.scalar.return_value = None

    with pytest.raises(ValueError, match="No user found with health_id"):
        await EmergencyService.get_emergency_profile_by_health_id(db=mock_db, health_id="NON_EXISTENT")


@pytest.mark.asyncio
async def test_get_emergency_profile_qr_revoked():
    user = _create_test_user("HV-REVOKED")
    privacy = PrivacySettings(user_id=user.id, qr_revoked=True)

    mock_db = AsyncMock()
    # 1. user lookup, 2. privacy lookup
    mock_db.scalar.side_effect = [user, privacy]

    profile = await EmergencyService.get_emergency_profile_by_health_id(db=mock_db, health_id="HV-REVOKED")

    assert profile.is_revoked is True
    assert profile.health_id == "HV-REVOKED"
    assert profile.full_name == user.full_name
    assert profile.critical_allergies == []
    assert profile.active_medications == []


@pytest.mark.asyncio
async def test_get_emergency_profile_creates_default_privacy_if_missing():
    user = _create_test_user("HV-NEWUSER")

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    # 1. user lookup -> found, 2. privacy lookup -> None (will create default)
    mock_db.scalar.side_effect = [user, None]

    mock_scalars_meds = MagicMock()
    mock_scalars_meds.all.return_value = []

    mock_scalars_allergies = MagicMock()
    mock_scalars_allergies.all.return_value = []

    mock_scalars_records = MagicMock()
    mock_scalars_records.all.return_value = []

    mock_db.scalars.side_effect = [
        mock_scalars_meds,
        mock_scalars_allergies,
        mock_scalars_records,
    ]

    profile = await EmergencyService.get_emergency_profile_by_health_id(db=mock_db, health_id="HV-NEWUSER")

    assert profile.is_revoked is False
    assert profile.full_name == user.full_name
    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()


# ==============================================================================
# API Endpoint Integration Tests (Unauthenticated)
# ==============================================================================

@pytest.mark.asyncio
async def test_api_emergency_mock_mode():
    settings.USE_MOCK = True
    health_id = "HV-MOCK-123"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Note: No authorization headers sent (unauthenticated public access)
        response = await client.get(f"/api/v1/emergency/{health_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["health_id"] == health_id
        assert data["full_name"] == MOCK_EMERGENCY_PROFILE.full_name
        assert data["blood_group"] == MOCK_EMERGENCY_PROFILE.blood_group
        assert data["is_revoked"] is False


@pytest.mark.asyncio
async def test_api_emergency_non_mock_success():
    settings.USE_MOCK = False
    health_id = "HV-77889"

    mock_profile = EmergencyProfileResponse(
        health_id=health_id,
        full_name="Zainab Bibi",
        blood_group="AB+",
        critical_allergies=["Latex (severe)"],
        active_medications=["Amlodipine 5mg"],
        chronic_conditions=["Hypertension"],
        emergency_contacts=[{"name": "Hamza Bibi", "relation": "Spouse", "phone": "+923000000000"}],
        is_revoked=False,
    )

    with patch("app.api.v1.emergency.EmergencyService.get_emergency_profile_by_health_id", new_callable=AsyncMock) as mock_svc:
        mock_svc.return_value = mock_profile

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/emergency/{health_id}")
            assert response.status_code == 200
            data = response.json()
            assert data["health_id"] == health_id
            assert data["full_name"] == "Zainab Bibi"
            assert data["blood_group"] == "AB+"
            assert data["critical_allergies"] == ["Latex (severe)"]


@pytest.mark.asyncio
async def test_api_emergency_not_found():
    settings.USE_MOCK = False
    health_id = "HV-NOTFOUND"

    with patch("app.api.v1.emergency.EmergencyService.get_emergency_profile_by_health_id", new_callable=AsyncMock) as mock_svc:
        mock_svc.side_effect = ValueError(f"No user found with health_id '{health_id}'")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/emergency/{health_id}")
            assert response.status_code == 404
            data = response.json()
            assert "No user found with health_id" in data["detail"]


@pytest.mark.asyncio
async def test_api_emergency_internal_error():
    settings.USE_MOCK = False
    health_id = "HV-ERROR"

    with patch("app.api.v1.emergency.EmergencyService.get_emergency_profile_by_health_id", new_callable=AsyncMock) as mock_svc:
        mock_svc.side_effect = RuntimeError("DB connection timeout")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(f"/api/v1/emergency/{health_id}")
            assert response.status_code == 500
            data = response.json()
            assert "Failed to retrieve emergency profile" in data["detail"]
