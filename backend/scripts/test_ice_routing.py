import asyncio
import uuid
from app.core.database import async_session_factory
from app.models.user import User
from app.services.emergency_service import get_secure_ntfy_topic_for_patient, dispatch_emergency_scan_alert_to_ice
from sqlalchemy import select

AHMAD_USER_ID = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")
ALI_USER_ID = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")

async def test_verification():
    async with async_session_factory() as db:
        ahmad = await db.scalar(select(User).where(User.id == AHMAD_USER_ID))
        ali = await db.scalar(select(User).where(User.id == ALI_USER_ID))
        assert ahmad is not None, "Ahmad not found"
        assert ali is not None, "Ali not found"
        ahmad.notified_ice_id = ali.id
        await db.commit()
        await db.refresh(ahmad)
        assert str(ahmad.notified_ice_id) == str(ali.id), f"Ahmad notified_ice_id mismatch: {ahmad.notified_ice_id} vs {ali.id}"

        topic = get_secure_ntfy_topic_for_patient(str(ahmad.id))
        print(f"[OK] Deterministic secure topic for Ahmad ({ahmad.id}): {topic}")
        assert topic.startswith("hv-"), f"Topic should start with hv-: {topic}"

        # Test alert dispatch to ntfy.sh
        ok = await dispatch_emergency_scan_alert_to_ice(
            patient=ahmad,
            notified_user=ali,
            city="Islamabad",
        )
        print(f"[OK] Dispatched emergency scan alert to ntfy.sh topic {topic}: success={ok}")

if __name__ == "__main__":
    asyncio.run(test_verification())
