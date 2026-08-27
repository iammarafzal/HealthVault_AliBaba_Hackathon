from datetime import date
from unittest.mock import AsyncMock, MagicMock
import uuid
import pytest

from app.models.allergy import Allergy
from app.services.persistence_service import persistence_service


@pytest.mark.asyncio
async def test_insert_medications():
    mock_db = MagicMock()
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()

    user_id = uuid.uuid4()
    record_id = uuid.uuid4()

    meds = [
        {
            "name": "Metformin",
            "dosage": "500mg",
            "frequency": "BD",
            "timing": "After meals",
            "instructions_en": "Take twice daily",
            "instructions_ur": "دن میں دو بار لیں",
            "is_active": True,
        },
        {
            "name": "Amlodipine",
            "dosage": "5mg",
            "frequency": "OD",
            "is_active": True,
        },
    ]

    saved_count = await persistence_service._insert_medications(
        mock_db, user_id, record_id, meds
    )

    assert saved_count == 2
    assert mock_db.add.call_count == 2
    mock_db.flush.assert_awaited_once()


@pytest.mark.asyncio
async def test_upsert_allergies_new_and_existing():
    existing_allergy = Allergy(
        id=uuid.uuid4(),
        user_id=uuid.uuid4(),
        allergen="penicillin",
        severity="moderate",
    )

    # Mock execute returning existing allergy
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [existing_allergy]

    mock_db = MagicMock()
    mock_db.execute = AsyncMock(return_value=mock_result)
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()

    allergies_input = [
        {"allergen": "Penicillin", "severity": "severe", "reaction_details": "Anaphylaxis"},
        {"allergen": "Sulfa", "severity": "mild", "reaction_details": "Rash"},
    ]

    saved_count = await persistence_service._upsert_allergies(
        mock_db, existing_allergy.user_id, allergies_input
    )

    assert saved_count == 2
    # One existing updated, one new inserted -> 2 add calls
    assert mock_db.add.call_count == 2
    assert existing_allergy.severity == "severe"


@pytest.mark.asyncio
async def test_insert_biomarkers():
    mock_db = MagicMock()
    mock_db.add = MagicMock()
    mock_db.flush = AsyncMock()

    user_id = uuid.uuid4()
    record_id = uuid.uuid4()

    biomarkers = [
        {
            "biomarker_name": "HbA1c",
            "value": 7.4,
            "unit": "%",
            "reference_min": 4.0,
            "reference_max": 5.6,
            "status": "high",
            "test_date": "2025-02-14",
        },
        {
            "biomarker_name": "Fasting Glucose",
            "value": "145",
            "unit": "mg/dL",
            "status": "high",
            "test_date": date(2025, 2, 14),
        },
    ]

    saved_count = await persistence_service._insert_biomarkers(
        mock_db, user_id, record_id, biomarkers
    )

    assert saved_count == 2
    assert mock_db.add.call_count == 2
    mock_db.flush.assert_awaited_once()
