# HealthVault AI — Unit Tests for Privacy Filter Logic (PrivacyFilterService)

from unittest.mock import AsyncMock, MagicMock
import uuid
import pytest

from app.models.privacy import PrivacySettings as PrivacySettingsORM
from app.schemas.emergency import EmergencyProfileResponse
from app.schemas.user import PrivacySettings, PrivacySettingsUpdate
from app.services.privacy_service import PrivacyFilterService


# ==============================================================================
# Pure Privacy Filtering Logic Tests (filter_emergency_data)
# ==============================================================================

def test_filter_emergency_data_all_enabled():
    privacy = PrivacySettings(
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )
    raw_contacts = [
        {"name": "Kamran Ali", "relation": "Brother", "phone": "+923001234567"},
    ]

    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=raw_contacts,
        privacy_settings=privacy,
        active_meds=["Metformin 500mg"],
        allergies=["Penicillin (severe)"],
        chronic_conditions=["Type 2 Diabetes"],
    )

    assert isinstance(res, EmergencyProfileResponse)
    assert res.health_id == "HV-1001"
    assert res.full_name == "Ahmad Raza"
    assert res.blood_group == "B+"
    assert res.critical_allergies == ["Penicillin (severe)"]
    assert res.active_medications == ["Metformin 500mg"]
    assert res.chronic_conditions == ["Type 2 Diabetes"]
    assert len(res.emergency_contacts) == 1
    assert res.emergency_contacts[0].name == "Kamran Ali"
    assert res.is_revoked is False


def test_filter_emergency_data_blood_group_masked():
    privacy = PrivacySettings(
        show_blood_group=False,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )

    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=[],
        privacy_settings=privacy,
        active_meds=["Metformin 500mg"],
        allergies=["Penicillin (severe)"],
        chronic_conditions=["Type 2 Diabetes"],
    )

    assert res.blood_group is None
    assert res.critical_allergies == ["Penicillin (severe)"]


def test_filter_emergency_data_allergies_masked():
    privacy = PrivacySettings(
        show_blood_group=True,
        show_allergies=False,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )

    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=[],
        privacy_settings=privacy,
        active_meds=["Metformin 500mg"],
        allergies=["Penicillin (severe)"],
        chronic_conditions=["Type 2 Diabetes"],
    )

    assert res.critical_allergies == []
    assert res.blood_group == "B+"


def test_filter_emergency_data_active_meds_masked():
    privacy = PrivacySettings(
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=False,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )

    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=[],
        privacy_settings=privacy,
        active_meds=["Metformin 500mg"],
        allergies=["Penicillin (severe)"],
        chronic_conditions=["Type 2 Diabetes"],
    )

    assert res.active_medications == []
    assert res.critical_allergies == ["Penicillin (severe)"]


def test_filter_emergency_data_emergency_contacts_masked():
    privacy = PrivacySettings(
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=False,
        qr_revoked=False,
    )
    raw_contacts = [
        {"name": "Kamran Ali", "relation": "Brother", "phone": "+923001234567"},
    ]

    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=raw_contacts,
        privacy_settings=privacy,
        active_meds=["Metformin 500mg"],
        allergies=["Penicillin (severe)"],
        chronic_conditions=["Type 2 Diabetes"],
    )

    assert res.emergency_contacts == []


def test_filter_emergency_data_qr_revocation():
    privacy = PrivacySettings(qr_revoked=True)
    raw_contacts = [
        {"name": "Kamran Ali", "relation": "Brother", "phone": "+923001234567"},
    ]

    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-REVOKED",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=raw_contacts,
        privacy_settings=privacy,
        active_meds=["Metformin 500mg"],
        allergies=["Penicillin (severe)"],
        chronic_conditions=["Type 2 Diabetes"],
    )

    assert res.is_revoked is True
    assert res.health_id == "HV-REVOKED"
    assert res.full_name == "Ahmad Raza"
    assert res.blood_group is None
    assert res.critical_allergies == []
    assert res.active_medications == []
    assert res.chronic_conditions == []
    assert res.emergency_contacts == []


# ==============================================================================
# Database CRUD Helper Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_get_user_privacy_settings_existing():
    user_id = uuid.uuid4()
    existing = PrivacySettingsORM(user_id=user_id, show_blood_group=False)

    mock_db = AsyncMock()
    mock_db.scalar.return_value = existing

    result = await PrivacyFilterService.get_user_privacy_settings(db=mock_db, user_id=user_id)
    assert result is existing
    assert result.show_blood_group is False
    mock_db.add.assert_not_called()


@pytest.mark.asyncio
async def test_get_user_privacy_settings_creates_default():
    user_id = uuid.uuid4()

    mock_db = AsyncMock()
    mock_db.add = MagicMock()
    mock_db.scalar.return_value = None

    result = await PrivacyFilterService.get_user_privacy_settings(db=mock_db, user_id=user_id)
    assert result.user_id == user_id
    assert result.show_blood_group is True
    assert result.show_allergies is True
    assert result.qr_revoked is False
    mock_db.add.assert_called_once()
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_user_privacy_settings_success():
    user_id = uuid.uuid4()
    existing = PrivacySettingsORM(
        user_id=user_id,
        show_blood_group=True,
        show_allergies=True,
        show_active_meds=True,
        show_chronic_conditions=True,
        show_emergency_contacts=True,
        qr_revoked=False,
    )

    mock_db = AsyncMock()
    mock_db.scalar.return_value = existing

    update_payload = PrivacySettingsUpdate(show_blood_group=False, qr_revoked=True)
    result = await PrivacyFilterService.update_user_privacy_settings(
        db=mock_db,
        user_id=user_id,
        update_data=update_payload,
    )

    assert result.show_blood_group is False
    assert result.qr_revoked is True
    # Unchanged fields stay intact
    assert result.show_allergies is True
    assert result.show_active_meds is True
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_update_user_privacy_settings_not_found():
    user_id = uuid.uuid4()

    mock_db = AsyncMock()
    mock_db.scalar.return_value = None

    update_payload = PrivacySettingsUpdate(show_blood_group=False)
    with pytest.raises(ValueError, match="No privacy settings found"):
        await PrivacyFilterService.update_user_privacy_settings(
            db=mock_db,
            user_id=user_id,
            update_data=update_payload,
        )


def test_filter_emergency_data_emergency_notes_enabled():
    privacy = PrivacySettings(
        show_emergency_notes=True,
        emergency_notes="Carries EpiPen in backpack.\nPacemaker fitted 2024.",
    )
    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=[],
        privacy_settings=privacy,
        active_meds=[],
        allergies=[],
        chronic_conditions=[],
    )
    assert res.emergency_notes == "Carries EpiPen in backpack. Pacemaker fitted 2024."


def test_filter_emergency_data_emergency_notes_disabled():
    privacy = PrivacySettings(
        show_emergency_notes=False,
        emergency_notes="Carries EpiPen in backpack.",
    )
    res = PrivacyFilterService.filter_emergency_data(
        raw_user_health_id="HV-1001",
        raw_user_full_name="Ahmad Raza",
        raw_user_blood_group="B+",
        raw_user_emergency_contacts=[],
        privacy_settings=privacy,
        active_meds=[],
        allergies=[],
        chronic_conditions=[],
    )
    assert res.emergency_notes is None


def test_privacy_settings_emergency_notes_length_validation():
    from pydantic import ValidationError

    # > 250 characters should fail validation
    long_note = "A" * 251
    with pytest.raises(ValidationError):
        PrivacySettings(emergency_notes=long_note)

    # Multi-line note sanitization
    multiline_note = "  Carries EpiPen   in backpack. \n\n Pacemaker \t fitted 2024.  "
    settings = PrivacySettings(emergency_notes=multiline_note)
    assert settings.emergency_notes == "Carries EpiPen in backpack. Pacemaker fitted 2024."

    # <= 250 characters should succeed
    valid_note = "A" * 250
    settings = PrivacySettings(emergency_notes=valid_note)
    assert len(settings.emergency_notes) == 250

