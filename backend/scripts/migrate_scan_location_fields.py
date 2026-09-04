import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating emergency_scan_logs table for hybrid location pipeline...")
        await conn.execute(text("""
            ALTER TABLE emergency_scan_logs 
            ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS accuracy_meters DOUBLE PRECISION,
            ADD COLUMN IF NOT EXISTS maps_url VARCHAR(500),
            ADD COLUMN IF NOT EXISTS location_name VARCHAR(255),
            ADD COLUMN IF NOT EXISTS device_type VARCHAR(100),
            ADD COLUMN IF NOT EXISTS is_gps_verified BOOLEAN NOT NULL DEFAULT FALSE;
        """))
        print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate())
