# HealthVault AI — Patient Routine Schedule Tests
# Validates custom meal routine timings (Breakfast, Lunch, Dinner), validation, dynamic slotting, and dismissal.

import json
import uuid
from datetime import date, datetime
from unittest.mock import patch
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.core.database import async_session_factory, engine
from app.main import create_application
from app.models.medication import Medication
from app.models.notification import PushSubscription
from app.models.user import User
from app.models.user_schedule import PatientRoutineSchedule
from app.services.notification_service import notification_service


@pytest.mark.asyncio
async def test_routine_schedule_api_flow():
    """Test getting default routine schedule and updating timings."""
    app = create_application()
    test_user_id = uuid.uuid4()

    user = User(
        id=test_user_id,
        health_id=f"HV-{test_user_id.hex[:8].upper()}",
        full_name="Routine Test User",
        email=f"routine_test_{test_user_id.hex[:6]}@example.com",
        role="patient",
    )

    async with async_session_factory() as session:
        session.add(user)
        await session.commit()

    app.dependency_overrides[get_current_user] = lambda: user

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. GET schedule -> should auto-generate defaults
        res_get = await ac.get("/api/v1/user/routine-schedule")
        assert res_get.status_code == 200
        data = res_get.json()
        assert data["breakfast_time"] == "08:00"
        assert data["lunch_time"] == "13:30"
        assert data["dinner_time"] == "20:30"
        assert data["reminder_lead_minutes"] == 15
        assert data["timezone"] == "Asia/Karachi"

        # 2. PUT schedule -> update to custom timings
        res_put = await ac.put(
            "/api/v1/user/routine-schedule",
            json={
                "breakfast_time": "07:15",
                "lunch_time": "12:45",
                "dinner_time": "19:45",
                "reminder_lead_minutes": 20,
            },
        )
        assert res_put.status_code == 200
        put_data = res_put.json()
        assert put_data["breakfast_time"] == "07:15"
        assert put_data["lunch_time"] == "12:45"
        assert put_data["dinner_time"] == "19:45"
        assert put_data["reminder_lead_minutes"] == 20

        # 3. PUT with invalid time format -> returns 422
        res_invalid = await ac.put(
            "/api/v1/user/routine-schedule",
            json={"breakfast_time": "25:61"},
        )
        assert res_invalid.status_code == 422

    await engine.dispose()


def test_custom_routine_slot_and_offset_calculations():
    """Verify dynamic slot mapping and meal offset thresholds (Before Meal / After Meal)."""
    schedule = PatientRoutineSchedule(
        breakfast_time="07:30",
        lunch_time="13:00",
        dinner_time="20:00",
        reminder_lead_minutes=15,
    )

    # 1. Slot resolution
    # 07:00 is Morning
    assert notification_service.get_user_time_slot(schedule, datetime(2026, 9, 3, 7, 0)) == "morning"
    # 10:00 is Morning (midpoint between 07:30 (450) and 13:00 (780) is 615 -> 10:15)
    assert notification_service.get_user_time_slot(schedule, datetime(2026, 9, 3, 10, 0)) == "morning"
    # 11:00 is Afternoon
    assert notification_service.get_user_time_slot(schedule, datetime(2026, 9, 3, 11, 0)) == "afternoon"
    # 15:00 is Afternoon
    assert notification_service.get_user_time_slot(schedule, datetime(2026, 9, 3, 15, 0)) == "afternoon"
    # 18:00 is Night (midpoint between 13:00 (780) and 20:00 (1200) is 990 -> 16:30)
    assert notification_service.get_user_time_slot(schedule, datetime(2026, 9, 3, 18, 0)) == "night"

    # 2. Meal offset evaluation
    med_ac = Medication(
        name="Omeprazole 20mg",
        dosage="20mg",
        frequency="OD",
        dosage_schedule={"morning": True, "meal_relation": "before_meals"},
    )
    # Breakfast is at 07:30. "before_meals" target is 07:00 (30 mins before)
    # At 06:50, not yet due
    assert notification_service.is_dose_time_due(med_ac, "morning", schedule, datetime(2026, 9, 3, 6, 50)) is False
    # At 07:05, due!
    assert notification_service.is_dose_time_due(med_ac, "morning", schedule, datetime(2026, 9, 3, 7, 5)) is True

    med_pc = Medication(
        name="Metformin 500mg",
        dosage="500mg",
        frequency="OD",
        dosage_schedule={"morning": True, "meal_relation": "after_meals"},
    )
    # Breakfast is at 07:30. "after_meals" target is 07:30
    # At 07:15, not yet due
    assert notification_service.is_dose_time_due(med_pc, "morning", schedule, datetime(2026, 9, 3, 7, 15)) is False
    # At 07:35, due!
    assert notification_service.is_dose_time_due(med_pc, "morning", schedule, datetime(2026, 9, 3, 7, 35)) is True


@pytest.mark.asyncio
async def test_slot_dismissal_dispatch():
    """Verify dismissal push is dispatched with expected payload and tag."""
    test_user_id = uuid.uuid4()
    user = User(
        id=test_user_id,
        health_id=f"HV-{test_user_id.hex[:8].upper()}",
        full_name="Dismissal Test User",
        email=f"dismiss_{test_user_id.hex[:6]}@example.com",
        role="patient",
    )
    sub = PushSubscription(
        user_id=test_user_id,
        endpoint=f"https://push.example.com/dismiss-{uuid.uuid4().hex}",
        p256dh="BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DQA",
        auth="tBHItJI5svbpez7KI4CCXg",
    )

    async with async_session_factory() as session:
        session.add(user)
        session.add(sub)
        await session.commit()

    with patch.object(notification_service, "_sync_send_push", return_value=None) as mock_send:
        async with async_session_factory() as db:
            count = await notification_service.dismiss_slot_notification(
                db=db,
                user_id=test_user_id,
                slot="morning",
                target_date=date(2026, 9, 3),
            )
            assert count == 1
            assert mock_send.called
            call_args = mock_send.call_args[0]
            # payload_str is 2nd argument
            payload_data = json.loads(call_args[1])
            assert payload_data["type"] == "DISMISS_DOSE_NOTIFICATION"
            assert payload_data["tag"] == "dose-slot-morning-2026-09-03"

    await engine.dispose()


@pytest.mark.asyncio
async def test_manual_medication_crud_and_slots():
    """Verify manual medication creation with slots, update, and deletion."""
    test_user_id = uuid.uuid4()
    user = User(
        id=test_user_id,
        health_id=f"HV-{test_user_id.hex[:8].upper()}",
        full_name="Manual Med User",
        email=f"manual_{test_user_id.hex[:6]}@example.com",
        role="patient",
    )
    async with async_session_factory() as session:
        session.add(user)
        await session.commit()

    app = create_application()
    app.dependency_overrides[get_current_user] = lambda: user

    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
            # 1. Create with slots ["morning", "night"]
            create_res = await ac.post(
                "/api/v1/medications/manual",
                json={
                    "name": "Vitamin D3 5000IU",
                    "dosage": "1 softgel",
                    "instructions_en": "Take after breakfast",
                    "time_slots": ["morning", "night"],
                },
            )
            assert create_res.status_code == 201
            created_data = create_res.json()
            med_id = created_data["id"]
            assert created_data["is_manual"] is True
            assert created_data["time_slots"] == ["morning", "night"]

            # 2. Get active medications — verify slots are returned
            active_res = await ac.get("/api/v1/medications/active")
            assert active_res.status_code == 200
            active_items = active_res.json()["medications"]
            target = next((m for m in active_items if m["id"] == med_id), None)
            assert target is not None
            assert target["is_manual"] is True
            assert target["time_slots"] == ["morning", "night"]

            # 3. Update medication — change slots to ["morning", "afternoon", "night"]
            put_res = await ac.put(
                f"/api/v1/medications/manual/{med_id}",
                json={
                    "dosage": "2 softgels",
                    "time_slots": ["morning", "afternoon", "night"],
                },
            )
            assert put_res.status_code == 200
            put_data = put_res.json()
            assert put_data["dosage"] == "2 softgels"
            assert put_data["time_slots"] == ["morning", "afternoon", "night"]

            # 4. Delete medication
            del_res = await ac.delete(f"/api/v1/medications/manual/{med_id}")
            assert del_res.status_code == 200

            # 5. Verify gone from active
            after_del = await ac.get("/api/v1/medications/active")
            after_items = after_del.json()["medications"]
            assert not any(m["id"] == med_id for m in after_items)
