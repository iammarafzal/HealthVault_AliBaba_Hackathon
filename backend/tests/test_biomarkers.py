# HealthVault AI — Unit & Integration Tests for Biomarker Timeline Endpoint & Service

from datetime import date
from unittest.mock import AsyncMock, MagicMock, patch
import uuid
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app
from app.models.biomarker import Biomarker
from app.schemas.biomarker import (
    BiomarkerDataPoint,
    BiomarkerSeries,
    BiomarkerTimelineResponse,
)
from app.services.biomarker_service import (
    BiomarkerService,
    _compute_trend,
    _normalize_name,
)


# ==============================================================================
# Helper Unit Tests
# ==============================================================================

def test_normalize_name():
    # Diabetes aliases
    assert _normalize_name("hba1c") == ("HbA1c", "Diabetes")
    assert _normalize_name("FastinG Glucose") == ("Fasting Glucose", "Diabetes")
    assert _normalize_name("fbg") == ("Fasting Glucose", "Diabetes")

    # Lipid aliases
    assert _normalize_name("cholesterol") == ("Total Cholesterol", "Lipid Profile")
    assert _normalize_name("LDL-C") == ("LDL Cholesterol", "Lipid Profile")
    assert _normalize_name("triglycerides") == ("Triglycerides", "Lipid Profile")

    # CBC aliases
    assert _normalize_name("hb") == ("Hemoglobin", "Complete Blood Count")
    assert _normalize_name("platelets") == ("Platelet Count", "Complete Blood Count")
    assert _normalize_name("wbc") == ("WBC Count", "Complete Blood Count")

    # Vitamins alias
    assert _normalize_name("vitamin d3") == ("Vitamin D (25-OH)", "Vitamins")


def test_compute_trend():
    # Less than 2 data points
    dp_single = [
        BiomarkerDataPoint(
            record_id=uuid.uuid4(),
            test_date=date(2026, 1, 1),
            value=8.0,
            unit="%",
            reference_min=4.0,
            reference_max=5.6,
            status="high",
        )
    ]
    assert _compute_trend(dp_single, "HbA1c") == "stable"

    # Both in range
    dp_normal = [
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 1, 1), value=5.0, unit="%", reference_min=4.0, reference_max=5.6, status="normal"),
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 6, 1), value=5.2, unit="%", reference_min=4.0, reference_max=5.6, status="normal"),
    ]
    assert _compute_trend(dp_normal, "HbA1c") == "stable"

    # Abnormal to normal -> improving
    dp_improving_to_normal = [
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 1, 1), value=8.5, unit="%", reference_min=4.0, reference_max=5.6, status="high"),
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 6, 1), value=5.4, unit="%", reference_min=4.0, reference_max=5.6, status="normal"),
    ]
    assert _compute_trend(dp_improving_to_normal, "HbA1c") == "improving"

    # Normal to abnormal -> worsening
    dp_worsening_to_abnormal = [
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 1, 1), value=5.2, unit="%", reference_min=4.0, reference_max=5.6, status="normal"),
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 6, 1), value=8.5, unit="%", reference_min=4.0, reference_max=5.6, status="high"),
    ]
    assert _compute_trend(dp_worsening_to_abnormal, "HbA1c") == "worsening"

    # Both high, but decreasing towards boundary -> improving
    dp_both_high_improving = [
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 1, 1), value=9.5, unit="%", reference_min=4.0, reference_max=5.6, status="high"),
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 6, 1), value=7.2, unit="%", reference_min=4.0, reference_max=5.6, status="high"),
    ]
    assert _compute_trend(dp_both_high_improving, "HbA1c") == "improving"

    # Both high, and increasing away from boundary -> worsening
    dp_both_high_worsening = [
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 1, 1), value=7.2, unit="%", reference_min=4.0, reference_max=5.6, status="high"),
        BiomarkerDataPoint(record_id=uuid.uuid4(), test_date=date(2026, 6, 1), value=9.5, unit="%", reference_min=4.0, reference_max=5.6, status="high"),
    ]
    assert _compute_trend(dp_both_high_worsening, "HbA1c") == "worsening"


# ==============================================================================
# Service Tests: BiomarkerService.get_biomarker_timeline
# ==============================================================================

@pytest.mark.asyncio
async def test_get_biomarker_timeline_all():
    user_id = uuid.uuid4()
    record_id = uuid.uuid4()

    bm1 = Biomarker(
        id=uuid.uuid4(),
        user_id=user_id,
        record_id=record_id,
        biomarker_name="HbA1c",
        value=8.4,
        unit="%",
        reference_min=4.0,
        reference_max=5.6,
        status="high",
        test_date=date(2026, 1, 15),
    )
    bm2 = Biomarker(
        id=uuid.uuid4(),
        user_id=user_id,
        record_id=record_id,
        biomarker_name="hba1c",
        value=7.1,
        unit="%",
        reference_min=4.0,
        reference_max=5.6,
        status="high",
        test_date=date(2026, 7, 20),
    )
    bm3 = Biomarker(
        id=uuid.uuid4(),
        user_id=user_id,
        record_id=record_id,
        biomarker_name="Total Cholesterol",
        value=220.0,
        unit="mg/dL",
        reference_min=0.0,
        reference_max=200.0,
        status="high",
        test_date=date(2026, 7, 20),
    )

    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = [bm1, bm2, bm3]
    mock_db.scalars.return_value = mock_scalars

    res = await BiomarkerService.get_biomarker_timeline(db=mock_db, user_id=user_id)

    assert isinstance(res, BiomarkerTimelineResponse)
    assert res.user_id == user_id
    assert res.total_biomarkers == 3
    assert len(res.series) == 2

    # Verify HbA1c series
    hba1c_series = next(s for s in res.series if s.biomarker_name == "HbA1c")
    assert hba1c_series.category == "Diabetes"
    assert hba1c_series.trend == "improving"
    assert len(hba1c_series.data_points) == 2
    assert hba1c_series.data_points[0].value == 8.4
    assert hba1c_series.data_points[1].value == 7.1

    # Verify Cholesterol series
    chol_series = next(s for s in res.series if s.biomarker_name == "Total Cholesterol")
    assert chol_series.category == "Lipid Profile"
    assert chol_series.trend == "stable"
    assert len(chol_series.data_points) == 1


@pytest.mark.asyncio
async def test_get_biomarker_timeline_empty():
    user_id = uuid.uuid4()
    mock_db = AsyncMock()
    mock_scalars = MagicMock()
    mock_scalars.all.return_value = []
    mock_db.scalars.return_value = mock_scalars

    res = await BiomarkerService.get_biomarker_timeline(db=mock_db, user_id=user_id)
    assert res.total_biomarkers == 0
    assert res.series == []


# ==============================================================================
# Endpoint Integration Tests: GET /api/v1/biomarkers/timeline
# ==============================================================================

@pytest.mark.asyncio
async def test_api_get_biomarker_timeline_success():
    user_id = uuid.uuid4()
    timeline_response = BiomarkerTimelineResponse(
        user_id=user_id,
        total_biomarkers=2,
        series=[
            BiomarkerSeries(
                biomarker_name="HbA1c",
                category="Diabetes",
                unit="%",
                trend="improving",
                data_points=[
                    BiomarkerDataPoint(
                        record_id=uuid.uuid4(),
                        test_date=date(2026, 1, 10),
                        value=8.1,
                        unit="%",
                        reference_min=4.0,
                        reference_max=5.6,
                        status="high",
                    ),
                    BiomarkerDataPoint(
                        record_id=uuid.uuid4(),
                        test_date=date(2026, 6, 10),
                        value=6.9,
                        unit="%",
                        reference_min=4.0,
                        reference_max=5.6,
                        status="high",
                    ),
                ],
            )
        ],
    )

    with patch(
        "app.api.v1.biomarkers.BiomarkerService.get_biomarker_timeline",
        new_callable=AsyncMock,
    ) as mock_svc:
        mock_svc.return_value = timeline_response

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/biomarkers/timeline",
                params={"user_id": str(user_id), "biomarkers": ["HbA1c"]},
            )
            assert response.status_code == 200
            data = response.json()
            assert data["user_id"] == str(user_id)
            assert data["total_biomarkers"] == 2
            assert len(data["series"]) == 1
            assert data["series"][0]["biomarker_name"] == "HbA1c"
            assert data["series"][0]["trend"] == "improving"


@pytest.mark.asyncio
async def test_api_get_biomarker_timeline_invalid_user_id():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/v1/biomarkers/timeline",
            params={"user_id": "invalid-uuid"},
        )
        assert response.status_code == 422


@pytest.mark.asyncio
async def test_api_get_biomarker_timeline_server_error():
    user_id = uuid.uuid4()

    with patch(
        "app.api.v1.biomarkers.BiomarkerService.get_biomarker_timeline",
        new_callable=AsyncMock,
    ) as mock_svc:
        mock_svc.side_effect = RuntimeError("Database query failed")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get(
                "/api/v1/biomarkers/timeline",
                params={"user_id": str(user_id)},
            )
            assert response.status_code == 500
            assert "Failed to retrieve biomarker timeline" in response.json()["detail"]
