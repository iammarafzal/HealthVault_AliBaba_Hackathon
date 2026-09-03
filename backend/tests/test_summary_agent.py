# HealthVault AI — Unit & Integration Tests for AI Doctor Summary Agent & Endpoint

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.agents.summary_agent import SummaryAgent
from app.core.config import settings
from app.core.mock_data import MOCK_DOCTOR_SUMMARY
from app.main import app
from app.models.allergy import Allergy
from app.models.biomarker import Biomarker
from app.models.medication import Medication
from app.models.record import MedicalRecord
from app.models.user import User
from app.schemas.summary import DoctorSummaryResponse


def _create_mock_user(user_id: uuid.UUID) -> User:
    user = User(
        id=user_id,
        email="patient@example.com",
        health_id="HV-98214",
        full_name="Ahmad Raza",
        gender="male",
        date_of_birth=date(1982, 5, 14),
        blood_group="B+",
        emergency_contacts=[],
        emergency_enabled=True,
    )
    user.privacy_settings = None
    return user


def _create_mock_data(user_id: uuid.UUID):
    user = _create_mock_user(user_id)

    meds = [
        Medication(id=uuid.uuid4(), user_id=user_id, name="Metformin", dosage="500mg BD", is_active=True),
        Medication(id=uuid.uuid4(), user_id=user_id, name="Lisinopril", dosage="10mg OD", is_active=True),
    ]

    allergies = [
        Allergy(id=uuid.uuid4(), user_id=user_id, allergen="Penicillin", severity="severe"),
        Allergy(id=uuid.uuid4(), user_id=user_id, allergen="Peanuts", severity="mild"),
    ]

    records = [
        MedicalRecord(
            id=uuid.uuid4(),
            user_id=user_id,
            document_type="prescription",
            doctor_name="Dr. Tariq",
            hospital_name="Shaukat Khanum",
            extracted_data={"diagnoses": ["Type 2 Diabetes", "Hypertension"]},
        ),
        MedicalRecord(
            id=uuid.uuid4(),
            user_id=user_id,
            document_type="discharge_summary",
            doctor_name="Dr. Khan",
            hospital_name="Aga Khan Hospital",
            extracted_data={
                "diagnoses": ["Hypertension"],
                "procedures": ["Appendectomy (2018)"],
            },
        ),
    ]

    biomarkers = [
        Biomarker(
            id=uuid.uuid4(),
            user_id=user_id,
            biomarker_name="HbA1c",
            value=8.2,
            unit="%",
            status="high",
            test_date=date(2026, 8, 1),
        ),
        Biomarker(
            id=uuid.uuid4(),
            user_id=user_id,
            biomarker_name="Total Cholesterol",
            value=240.0,
            unit="mg/dL",
            status="high",
            test_date=date(2026, 8, 1),
        ),
    ]

    return user, meds, allergies, records, biomarkers


# ==============================================================================
# Helper Unit Tests
# ==============================================================================

def test_compute_age():
    # None DOB
    assert SummaryAgent._compute_age(None) is None

    # Exact DOB calculations
    today = date.today()
    dob_past = date(today.year - 30, today.month, today.day)
    assert SummaryAgent._compute_age(dob_past) == 30


def test_build_fallback_summary():
    user_id = uuid.uuid4()
    user, meds, allergies, records, biomarkers = _create_mock_data(user_id)

    summary = SummaryAgent._build_fallback_summary(
        user=user,
        active_meds=meds,
        allergies=allergies,
        records=records,
        abnormal_biomarkers=biomarkers,
    )

    assert isinstance(summary, DoctorSummaryResponse)
    assert summary.patient_name == "Ahmad Raza"
    assert summary.health_id == "HV-98214"
    assert summary.blood_group == "B+"
    assert "Type 2 Diabetes" in summary.active_diagnoses
    assert "Hypertension" in summary.active_diagnoses
    # De-duplicated check
    assert summary.active_diagnoses.count("Hypertension") == 1
    assert "Metformin 500mg BD" in summary.current_medications
    assert "Penicillin (severe)" in summary.known_allergies
    assert "Appendectomy (2018)" in summary.surgical_history
    assert any("HbA1c: 8.2" in b for b in summary.recent_abnormal_biomarkers)
    assert any("Severe allergy risk: Penicillin" in rf for rf in summary.risk_factors)
    assert any("Elevated biomarkers requiring monitoring" in rf for rf in summary.risk_factors)
    assert len(summary.clinical_notes) > 0


# ==============================================================================
# SummaryAgent.generate_clinical_summary Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_summary_agent_user_not_found():
    mock_db = AsyncMock()
    mock_db.scalar.return_value = None

    with pytest.raises(ValueError, match="User .* not found"):
        await SummaryAgent.generate_clinical_summary(db=mock_db, user_id=uuid.uuid4())


@pytest.mark.asyncio
async def test_summary_agent_llm_success():
    user_id = uuid.uuid4()
    user, meds, allergies, records, biomarkers = _create_mock_data(user_id)

    mock_db = AsyncMock()
    mock_db.scalar.return_value = user

    # Mock db.scalars(...).all()
    mock_scalars_result_meds = MagicMock()
    mock_scalars_result_meds.all.return_value = meds

    mock_scalars_result_allergies = MagicMock()
    mock_scalars_result_allergies.all.return_value = allergies

    mock_scalars_result_records = MagicMock()
    mock_scalars_result_records.all.return_value = records

    mock_scalars_result_biomarkers = MagicMock()
    mock_scalars_result_biomarkers.all.return_value = biomarkers

    mock_db.scalars.side_effect = [
        mock_scalars_result_meds,
        mock_scalars_result_allergies,
        mock_scalars_result_records,
        mock_scalars_result_biomarkers,
    ]

    llm_payload = {
        "patient_name": "Ahmad Raza",
        "health_id": "HV-98214",
        "age_gender": "44M",
        "blood_group": "B+",
        "active_diagnoses": ["Type 2 Diabetes Mellitus"],
        "current_medications": ["Metformin 500mg BD"],
        "known_allergies": ["Penicillin (severe)"],
        "surgical_history": ["Appendectomy (2018)"],
        "recent_abnormal_biomarkers": ["HbA1c: 8.2% (high)"],
        "risk_factors": ["Uncontrolled glycaemia"],
        "clinical_notes": "Patient presents with poorly controlled T2D.",
    }

    mock_llm_provider = AsyncMock()
    mock_llm_provider.generate_json.return_value = llm_payload

    with patch("app.agents.summary_agent.get_llm_provider", return_value=mock_llm_provider):
        summary = await SummaryAgent.generate_clinical_summary(db=mock_db, user_id=user_id)

        assert isinstance(summary, DoctorSummaryResponse)
        assert summary.patient_name == "Ahmad Raza"
        assert summary.clinical_notes == "Patient presents with poorly controlled T2D."
        mock_llm_provider.generate_json.assert_awaited_once()


@pytest.mark.asyncio
async def test_summary_agent_llm_fallback_on_empty_result():
    user_id = uuid.uuid4()
    user, meds, allergies, records, biomarkers = _create_mock_data(user_id)

    mock_db = AsyncMock()
    mock_db.scalar.return_value = user

    mock_scalars_result_meds = MagicMock()
    mock_scalars_result_meds.all.return_value = meds

    mock_scalars_result_allergies = MagicMock()
    mock_scalars_result_allergies.all.return_value = allergies

    mock_scalars_result_records = MagicMock()
    mock_scalars_result_records.all.return_value = records

    mock_scalars_result_biomarkers = MagicMock()
    mock_scalars_result_biomarkers.all.return_value = biomarkers

    mock_db.scalars.side_effect = [
        mock_scalars_result_meds,
        mock_scalars_result_allergies,
        mock_scalars_result_records,
        mock_scalars_result_biomarkers,
    ]

    mock_llm_provider = AsyncMock()
    # Simulate LLM returning empty dict or failing
    mock_llm_provider.generate_json.return_value = {}

    with patch("app.agents.summary_agent.get_llm_provider", return_value=mock_llm_provider):
        summary = await SummaryAgent.generate_clinical_summary(db=mock_db, user_id=user_id)

        assert isinstance(summary, DoctorSummaryResponse)
        assert summary.patient_name == "Ahmad Raza"
        assert "Type 2 Diabetes" in summary.active_diagnoses


# ==============================================================================
# API Endpoint Integration Tests
# ==============================================================================

@pytest.mark.asyncio
async def test_api_summary_generate_mock_mode():
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/summary/generate",
            params={"user_id": user_id},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["patient_name"] == MOCK_DOCTOR_SUMMARY.patient_name
        assert data["health_id"] == MOCK_DOCTOR_SUMMARY.health_id
        assert data["blood_group"] == MOCK_DOCTOR_SUMMARY.blood_group


@pytest.mark.asyncio
async def test_api_summary_generate_non_mock_success():
    settings.USE_MOCK = False
    user_id = uuid.uuid4()

    mock_response = DoctorSummaryResponse(
        patient_name="Fatima Ali",
        health_id="HV-11223",
        age_gender="35F",
        blood_group="A+",
        active_diagnoses=["Asthma"],
        current_medications=["Salbutamol Inhaler"],
        known_allergies=["Dust Mites"],
        surgical_history=[],
        recent_abnormal_biomarkers=[],
        risk_factors=["Bronchospasm risk"],
        clinical_notes="Patient with mild persistent asthma.",
    )

    with patch("app.api.v1.summary.SummaryAgent.generate_clinical_summary", new_callable=AsyncMock) as mock_agent:
        mock_agent.return_value = mock_response

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/summary/generate",
                params={"user_id": str(user_id)},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["patient_name"] == "Fatima Ali"
            assert data["active_diagnoses"] == ["Asthma"]


@pytest.mark.asyncio
async def test_api_summary_generate_not_found():
    settings.USE_MOCK = False
    user_id = uuid.uuid4()

    with patch("app.api.v1.summary.SummaryAgent.generate_clinical_summary", new_callable=AsyncMock) as mock_agent:
        mock_agent.side_effect = ValueError(f"User {user_id} not found")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/summary/generate",
                params={"user_id": str(user_id)},
            )
            assert response.status_code == 404
            data = response.json()
            assert "not found" in data["detail"].lower()


@pytest.mark.asyncio
async def test_api_summary_generate_internal_error():
    settings.USE_MOCK = False
    user_id = uuid.uuid4()

    with patch("app.api.v1.summary.SummaryAgent.generate_clinical_summary", new_callable=AsyncMock) as mock_agent:
        mock_agent.side_effect = RuntimeError("Database connection timed out")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/summary/generate",
                params={"user_id": str(user_id)},
            )
            assert response.status_code == 500
            data = response.json()
            assert "Failed to generate clinical summary" in data["detail"]
