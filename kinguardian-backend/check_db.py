import sys
sys.path.insert(0, '.')
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Profile, Family, Membership

async def check():
    async with SessionLocal() as session:
        profiles = (await session.execute(select(Profile))).scalars().all()
        print('=== PROFILES ===')
        for p in profiles:
            print(f'  id={p.id}, email={p.email}, role={p.role}, display={p.display_name}, tz={p.timezone}, identity={p.identity_subject}')
        
        families = (await session.execute(select(Family))).scalars().all()
        print('=== FAMILIES ===')
        for f in families:
            print(f'  id={f.id}, name={f.name}, tz={f.home_timezone}')
        
        memberships = (await session.execute(select(Membership))).scalars().all()
        print('=== MEMBERSHIPS ===')
        for m in memberships:
            print(f'  family={m.family_id}, profile={m.profile_id}, role={m.role}, status={m.status}')
        
        # Check specifically for anjali
        anjali = (await session.execute(select(Profile).where(Profile.email == 'anjali@example.com'))).scalar_one_or_none()
        print(f'\n=== ANJALI CHECK ===')
        if anjali:
            print(f'  Found: id={anjali.id}, email={anjali.email}, role={anjali.role}, display={anjali.display_name}, tz={anjali.timezone}')
        else:
            print('  NOT FOUND')

import asyncio
asyncio.run(check())
