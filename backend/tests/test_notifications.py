# HealthVault AI — Push Notification Tests
# Validates VAPID key distribution, subscription management, push dispatch, and time window logic.

import uuid
from datetime import date, datetime
from unittest.mock import MagicMock, patch
import pytest
from httpx import ASGITransport, AsyncClient

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import async_session_factory
from app.main import create_application
from app.models.medication import Medication, MedicationDoseLog
from app.models.notification import PushSubscription
from app.models.user import User
from app.services.notification_service import notification_service


@pytest.mark.asyncio
async def test_vapid_public_key_endpoint():
    """Test retrieving public VAPID key without authentication."""
    app = create_application()
    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        res = await ac.get("/api/v1/notifications/vapid-public-key")
        assert res.status_code == 200
        data = res.json()
        assert "public_key" in data
        assert data["public_key"] == settings.VAPID_PUBLIC_KEY


@pytest.mark.asyncio
async def test_push_subscription_crud_flow():
    """Test subscribe, duplicate upsert, test push, and unsubscribe lifecycle."""
    app = create_application()
    test_user_id = uuid.uuid4()

    user = User(
        id=test_user_id,
        health_id=f"HV-{test_user_id.hex[:8].upper()}",
        full_name="Notification Test User",
        email=f"push_test_{test_user_id.hex[:6]}@example.com",
        role="patient",
    )

    async with async_session_factory() as session:
        session.add(user)
        await session.commit()

    # Override current user dependency
    app.dependency_overrides[get_current_user] = lambda: user

    endpoint_url = f"https://push.example.com/test-client-{uuid.uuid4().hex}"
    keys_payload = {
        "p256dh": "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DQA",
        "auth": "tBHItJI5svbpez7KI4CCXg",
    }

    async with AsyncClient(
        transport=ASGITransport(app=app), base_url="http://test"
    ) as ac:
        # 1. Subscribe
        sub_res = await ac.post(
            "/api/v1/notifications/subscribe",
            json={
                "endpoint": endpoint_url,
                "keys": keys_payload,
                "user_agent": "Mozilla/5.0 TestBrowser",
            },
        )
        assert sub_res.status_code == 201
        sub_data = sub_res.json()
        assert sub_data["endpoint"] == endpoint_url
        assert sub_data["user_id"] == str(test_user_id)

        # 2. Test send notification (mock pywebpush to avoid real network call)
        with patch.object(notification_service, "_sync_send_push", return_value=None):
            test_res = await ac.post(
                "/api/v1/notifications/test",
                json={
                    "title": "Test Pill 💊",
                    "body": "Dose ready",
                    "url": "/planner",
                },
            )
            assert test_res.status_code == 200
            test_data = test_res.json()
            assert test_data["status"] == "success"
            assert test_data["sent_count"] == 1

        # 3. Unsubscribe
        unsub_res = await ac.delete(
            f"/api/v1/notifications/unsubscribe?endpoint={endpoint_url}"
        )
        assert unsub_res.status_code == 200
        unsub_data = unsub_res.json()
        assert unsub_data["status"] == "unsubscribed"
        assert unsub_data["deleted_count"] >= 1

        # 4. Test push after unsubscribe should report no active subscriptions
        test_after_unsub = await ac.post("/api/v1/notifications/test")
        assert test_after_unsub.status_code == 200
        after_data = test_after_unsub.json()
        assert after_data["status"] == "no_active_subscriptions"
        assert after_data["sent_count"] == 0


def test_time_slot_calculation():
    """Verify hour to time-window mapping."""
    # Morning: 06:00 to 11:59
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 8, 30)) == "morning"
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 6, 0)) == "morning"
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 11, 59)) == "morning"

    # Afternoon: 12:00 to 16:59
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 12, 0)) == "afternoon"
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 14, 0)) == "afternoon"
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 16, 59)) == "afternoon"

    # Night: 17:00 to 23:59
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 17, 0)) == "night"
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 21, 30)) == "night"
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 23, 59)) == "night"

    # Late night / off-hours: 00:00 to 05:59
    assert notification_service.get_current_time_slot(datetime(2026, 9, 3, 2, 0)) is None


def test_medication_slot_scheduling():
    """Verify matching medications to slots."""
    med_morning = Medication(
        name="Thyroxine 50mcg",
        dosage="50mcg",
        frequency="OD",
        timing="morning",
        dosage_schedule={"morning": True, "afternoon": False, "evening": False},
    )
    assert notification_service.is_medication_scheduled_for_slot(med_morning, "morning") is True
    assert notification_service.is_medication_scheduled_for_slot(med_morning, "afternoon") is False
    assert notification_service.is_medication_scheduled_for_slot(med_morning, "night") is False

    med_bid = Medication(
        name="Metformin 500mg",
        dosage="500mg",
        frequency="BD",
        dosage_schedule={"morning": True, "afternoon": False, "evening": True},
    )
    assert notification_service.is_medication_scheduled_for_slot(med_bid, "morning") is True
    assert notification_service.is_medication_scheduled_for_slot(med_bid, "afternoon") is False
    assert notification_service.is_medication_scheduled_for_slot(med_bid, "night") is True


@pytest.mark.asyncio
async def test_medicine_reminder_scheduler_job():
    """Verify check_and_dispatch_medicine_reminders checks due doses and dispatches alerts."""
    test_user_id = uuid.uuid4()
    med_id = uuid.uuid4()

    user = User(
        id=test_user_id,
        health_id=f"HV-{test_user_id.hex[:8].upper()}",
        full_name="Scheduler Test User",
        email=f"sched_test_{test_user_id.hex[:6]}@example.com",
        role="patient",
    )

    med = Medication(
        id=med_id,
        user_id=test_user_id,
        name="Atorvastatin 20mg",
        dosage="20mg",
        frequency="OD",
        timing="morning",
        dosage_schedule={"morning": True, "afternoon": False, "evening": False},
        is_active=True,
    )

    sub = PushSubscription(
        user_id=test_user_id,
        endpoint=f"https://push.example.com/sched-sub-{uuid.uuid4().hex}",
        p256dh="BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DQA",
        auth="tBHItJI5svbpez7KI4CCXg",
    )

    async with async_session_factory() as session:
        session.add(user)
        session.add(med)
        session.add(sub)
        await session.commit()

    # Clear previously dispatched memory cache
    notification_service._dispatched_reminders.clear()

    # Mock slot to "morning" and mock _sync_send_push
    with patch.object(notification_service, "get_current_time_slot", return_value="morning"), \
         patch.object(notification_service, "_sync_send_push", return_value=None):
        
        # 1. Run reminder check -> should dispatch 1 notification
        count = await notification_service.check_and_dispatch_medicine_reminders()
        assert count >= 1

        # 2. Running again immediately in the same slot is deduplicated
        count_dup = await notification_service.check_and_dispatch_medicine_reminders()
        assert count_dup == 0

        # 3. Clear deduplication but insert dose log as taken
        notification_service._dispatched_reminders.clear()
        async with async_session_factory() as session:
            dose_log = MedicationDoseLog(
                user_id=test_user_id,
                medication_id=med_id,
                dose_date=date.today(),
                time_slot="morning",
                taken=True,
            )
            session.add(dose_log)
            await session.commit()

        # Dosing has been taken -> test user should not be dispatched
        dispatch_key = f"{test_user_id}_{date.today().isoformat()}_morning"
        await notification_service.check_and_dispatch_medicine_reminders()
        assert dispatch_key not in notification_service._dispatched_reminders

