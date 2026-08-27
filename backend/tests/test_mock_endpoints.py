import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.core.config import settings
from app.main import app


@pytest.mark.asyncio
async def test_vault_upload_and_extract_prescription_mock():
    # Force USE_MOCK = True
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())
    sample_pdf = b"%PDF-1.4 sample prescription content"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/vault/upload-and-extract",
            data={"user_id": user_id, "document_type": "prescription"},
            files={"file": ("test_rx.pdf", sample_pdf, "application/pdf")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "prescription"
        assert data["doctor_name"] == "Dr. Tariq Mahmood"
        assert len(data["medications"]) == 2
        assert data["medications"][0]["name"] == "Metformin"
        assert "instructions_ur" in data["medications"][0]
        assert len(data["allergies"]) == 1
        assert data["allergies"][0]["allergen"] == "Penicillin"


@pytest.mark.asyncio
async def test_vault_upload_and_extract_lab_mock():
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())
    sample_pdf = b"%PDF-1.4 sample lab report content"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/vault/upload-and-extract",
            data={"user_id": user_id, "document_type": "lab_report"},
            files={"file": ("test_lab.pdf", sample_pdf, "application/pdf")},
        )
        assert response.status_code == 200
        data = response.json()
        assert data["document_type"] == "lab_report"
        assert "Chughtai Lab" in data["hospital_name"]
        assert "HbA1c: 7.4 %" in data["raw_ocr_text"]


@pytest.mark.asyncio
async def test_vault_get_user_records():
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/vault/records/{user_id}")
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) >= 2
        assert data[0]["document_type"] == "prescription"


@pytest.mark.asyncio
async def test_doctor_summary_endpoint():
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
        assert data["patient_name"] == "Ahmad Raza"
        assert data["blood_group"] == "B+"
        assert len(data["current_medications"]) >= 2
        assert len(data["recent_abnormal_biomarkers"]) >= 1


@pytest.mark.asyncio
async def test_interactions_check_endpoint():
    settings.USE_MOCK = True
    user_id = str(uuid.uuid4())

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/interactions/check",
            json={
                "user_id": user_id,
                "new_medications": ["Simvastatin", "Metformin"],
            },
        )
        assert response.status_code == 200
        data = response.json()
        assert data["has_conflicts"] is True
        assert len(data["alerts"]) >= 1
        assert "recommendation_ur" in data["alerts"][0]


@pytest.mark.asyncio
async def test_emergency_profile_endpoint():
    settings.USE_MOCK = True
    health_id = "HV-98214"

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(f"/api/v1/emergency/{health_id}")
        assert response.status_code == 200
        data = response.json()
        assert data["health_id"] == health_id
        assert data["full_name"] == "Ahmad Raza"
        assert data["blood_group"] == "B+"
        assert len(data["emergency_contacts"]) >= 1
        assert data["is_revoked"] is False
