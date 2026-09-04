import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating emergency_contacts table...")
        await conn.execute(text("""
            ALTER TABLE emergency_contacts
            ADD COLUMN IF NOT EXISTS contact_health_id VARCHAR(50),
            ADD COLUMN IF NOT EXISTS contact_user_id UUID REFERENCES users(id) ON DELETE SET NULL;
        """))

        print("Creating notifications table...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS notifications (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                type VARCHAR(50) NOT NULL DEFAULT 'SYSTEM',
                title_en VARCHAR(200) NOT NULL,
                title_ur VARCHAR(200) NOT NULL,
                message_en TEXT NOT NULL,
                message_ur TEXT NOT NULL,
                action_url VARCHAR(255) NOT NULL DEFAULT '/',
                is_read BOOLEAN NOT NULL DEFAULT FALSE,
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_user_id ON notifications(user_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_is_read ON notifications(is_read)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_notifications_created_at ON notifications(created_at DESC)"))
        print("[OK] Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
