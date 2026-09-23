import asyncio
from app.db import engine
from sqlalchemy import text

async def main():
    tables = [
        'profiles', 'families', 'memberships', 'care_subjects', 'care_grants',
        'consents', 'care_tasks', 'checkins', 'medication_adherence',
        'document_references', 'appointments', 'wearable_connections', 'wearable_data',
        'conversations', 'messages', 'notifications', 'insights',
        'outbox_events', 'audit_log'
    ]
    async with engine.connect() as conn:
        print("=" * 65)
        print("          KINGUARDIAN POSTGRESQL LIVE TABLE REPORT")
        print("=" * 65)
        print(f"| {'Table Name':<24} | {'Live Rows':>10} | {'Status':<10} |")
        print("|" + "-" * 26 + "|" + "-" * 12 + "|" + "-" * 12 + "|")
        total_active = 0
        for t in tables:
            try:
                res = await conn.execute(text(f"SELECT COUNT(*) FROM {t};"))
                count = res.scalar()
                print(f"| {t:<24} | {count:>10} | {'ACTIVE':<10} |")
                total_active += 1
            except Exception as e:
                print(f"| {t:<24} | {'ERROR':>10} | {str(e)[:25]} |")
        print("=" * 65)
        print(f"Total Active Tables Reporting Live Data: {total_active}/{len(tables)}")
        res_v = await conn.execute(text("SELECT version_num FROM alembic_version;"))
        v = res_v.scalar()
        print(f"Alembic Migration Version: {v}")
        print("=" * 65)

if __name__ == '__main__':
    asyncio.run(main())
