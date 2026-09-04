import asyncio
import uuid
from datetime import date
from sqlalchemy import select
from app.core.database import async_session_factory
from app.core.security import hash_password
from app.models.user import User
from app.models.privacy import PrivacySettings
from app.models.emergency_contact import EmergencyContact
from app.services.security_service import generate_emergency_token

ALI_USER_ID = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")
AHMAD_USER_ID = uuid.UUID("3fa85f64-5717-4562-b3fc-2c963f66afa6")

async def seed_ali():
    async with async_session_factory() as db:
        # Check if Ali Raza exists
        ali = await db.scalar(select(User).where(User.email == "ali.raza@example.com"))
        if not ali:
            ali = User(
                id=ALI_USER_ID,
                health_id="HV-PAK-11002",
                emergency_token=generate_emergency_token(),
                emergency_enabled=True,
                full_name="Ali Raza",
                email="ali.raza@example.com",
                phone="+92-300-9876543",
                hashed_password=hash_password("Patient789!"),
                role="patient",
                blood_group="B+",
                date_of_birth=date(1998, 1, 10),
                gender="male",
                emergency_contacts=[],
            )
            db.add(ali)
            await db.flush()
            ali_privacy = PrivacySettings(user_id=ALI_USER_ID)
            db.add(ali_privacy)
            print(f"[OK] Created Ali Raza user (id={ALI_USER_ID})")
        else:
            print(f"[INFO] Ali Raza already exists (id={ali.id})")
            ALI_ID = ali.id

        # Update Ahmad Raza to designate Ali Raza as notified_ice_id
        ahmad = await db.scalar(select(User).where(User.id == AHMAD_USER_ID))
        if ahmad:
            ahmad.notified_ice_id = ali.id
            # Also ensure emergency contact in emergency_contacts table exists
            c = await db.scalar(
                select(EmergencyContact)
                .where(EmergencyContact.user_id == ahmad.id)
                .where(EmergencyContact.name == "Ali Raza")
            )
            if not c:
                new_c = EmergencyContact(
                    user_id=ahmad.id,
                    name="Ali Raza",
                    relation="Son",
                    phone="+92-300-9876543",
                    is_primary=True,
                    priority_order=1,
                )
                db.add(new_c)
            await db.commit()
            print(f"[OK] Linked Ahmad Raza (Father) notified_ice_id -> Ali Raza (Son id={ali.id})")

if __name__ == "__main__":
    asyncio.run(seed_ali())
