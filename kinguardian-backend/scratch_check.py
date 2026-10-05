import asyncio
from app.db import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        for email in ['priya@example.com', 'anjali@example.com', 'ramesh@example.com']:
            r = await conn.execute(text("SELECT id, display_name, email, role FROM profiles WHERE email = :e"), {"e": email})
            print(email, r.mappings().all())
        
        c = await conn.execute(text("SELECT id, subject_id, granted_to_profile_id, status FROM consents"))
        print("Consents:", c.mappings().all())
        
        t = await conn.execute(text("SELECT id, title, status, assigned_to FROM care_tasks LIMIT 5"))
        print("Care tasks:", t.mappings().all())

if __name__ == '__main__':
    asyncio.run(check())
