import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating users table...")
        await conn.execute(text("""
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS notified_ice_id UUID REFERENCES users(id) ON DELETE SET NULL;
        """))
        print("Migrating privacy_settings table...")
        await conn.execute(text("""
            ALTER TABLE privacy_settings 
            ADD COLUMN IF NOT EXISTS enable_ice_scan_alerts BOOLEAN NOT NULL DEFAULT TRUE;
        """))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
