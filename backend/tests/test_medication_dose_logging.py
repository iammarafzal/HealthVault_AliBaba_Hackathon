import uuid
from datetime import date
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import create_application
from app.models.user import User
from app.models.medication import Medication
from app.api.deps import get_current_user
from app.core.database import async_session_factory


@pytest.mark.asyncio
async def test_medication_dose_logging_flow():
    """Test getting today's doses and toggling dose log."""
    app = create_application()
    test_user_id = uuid.uuid4()
    med_id = uuid.uuid4()

    user = User(
        id=test_user_id,
        health_id=f"HV-{test_user_id.hex[:8].upper()}",
        full_name="Test User",
        email=f"dose_test_{test_user_id.hex[:6]}@example.com",
        role="patient",
    )

    med = Medication(
        id=med_id,
        user_id=test_user_id,
        name="Metformin 500mg",
        dosage="500mg",
        frequency="BD",
        timing="morning",
        is_active=True,
    )

    # Insert user and medication into DB
    async with async_session_factory() as session:
        session.add(user)
        session.add(med)
        await session.commit()

    # Override current user dependency
    app.dependency_overrides[get_current_user] = lambda: user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Toggle dose to taken
        toggle_res = await ac.post(
            "/api/v1/medications/doses/toggle",
            json={
                "medication_id": str(med_id),
                "time_slot": "morning",
                "taken": True,
            },
        )
        assert toggle_res.status_code == 200
        data = toggle_res.json()
        assert data["taken"] is True
        assert data["time_slot"] == "morning"
        assert data["medication_id"] == str(med_id)

        # 2. Query today's doses
        today_res = await ac.get(
            "/api/v1/medications/doses/today",
        )
        assert today_res.status_code == 200
        today_data = today_res.json()
        assert f"{med_id}_morning" in today_data["dose_logs"]
        assert today_data["dose_logs"][f"{med_id}_morning"] is True

        # 3. Undo dose
        undo_res = await ac.post(
            "/api/v1/medications/doses/toggle",
            json={
                "medication_id": str(med_id),
                "time_slot": "morning",
                "taken": False,
            },
        )
        assert undo_res.status_code == 200
        undo_data = undo_res.json()
        assert undo_data["taken"] is False

        # 4. Verify updated today's doses
        today_res_after = await ac.get(
            "/api/v1/medications/doses/today",
        )
        assert today_res_after.status_code == 200
        today_data_after = today_res_after.json()
        assert today_data_after["dose_logs"][f"{med_id}_morning"] is False


