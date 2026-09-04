import asyncio
from sqlalchemy import text
from app.core.database import engine

async def migrate():
    async with engine.begin() as conn:
        print("Migrating EMERGENCY_SCAN notifications action_url to /emergency/activity...")
        res = await conn.execute(text("""
            UPDATE notifications 
            SET action_url = '/emergency/activity?health_id=HV-PAK-98214'
            WHERE type = 'EMERGENCY_SCAN' AND (action_url = '/emergency' OR action_url = '/' OR action_url LIKE 'https://www.google.com%' OR action_url IS NULL);
        """))
        print(f"Updated {res.rowcount} notification records.")

if __name__ == "__main__":
    asyncio.run(migrate())
