import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from app.db import engine
from sqlalchemy import text

async def main():
    async with engine.begin() as conn:
        print("Creating appointments table if not exists...")
        await conn.execute(text("""
            CREATE TABLE IF NOT EXISTS appointments (
                id UUID PRIMARY KEY,
                created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
                family_id UUID NOT NULL REFERENCES families(id) ON DELETE CASCADE,
                subject_id UUID NOT NULL REFERENCES care_subjects(id) ON DELETE CASCADE,
                created_by UUID NOT NULL REFERENCES profiles(id),
                doctor_name VARCHAR(200) NOT NULL,
                specialty VARCHAR(100),
                date TIMESTAMP WITH TIME ZONE NOT NULL,
                time VARCHAR(10) NOT NULL,
                location VARCHAR(255),
                status VARCHAR(24) DEFAULT 'scheduled' NOT NULL,
                telehealth_link VARCHAR(500),
                notes TEXT
            )
        """))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_family_id ON appointments(family_id)"))
        await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_appointments_subject_id ON appointments(subject_id)"))
        print("appointments table created/verified.")

        # Check if any appointments exist
        count = (await conn.execute(text("SELECT COUNT(*) FROM appointments;"))).scalar()
        if count == 0:
            # Find Ramesh care_subject and Anjali profile
            res = await conn.execute(text("""
                SELECT s.id, s.family_id, p.id 
                FROM care_subjects s
                JOIN families f ON f.id = s.family_id
                JOIN memberships m ON m.family_id = f.id
                JOIN profiles p ON p.id = m.profile_id
                WHERE s.external_patient_ref ILIKE '%Ramesh%'
                LIMIT 1
            """))
            row = res.fetchone()
            if row:
                subject_id, family_id, profile_id = row
                apt1_id = uuid.uuid4()
                apt2_id = uuid.uuid4()
                now = datetime.now(timezone.utc)
                await conn.execute(text("""
                    INSERT INTO appointments (id, family_id, subject_id, created_by, doctor_name, specialty, date, time, location, status, notes)
                    VALUES 
                    (:id1, :family_id, :subject_id, :profile_id, 'Dr. K. S. Rao', 'Cardiology', :d1, '16:00', 'Apollo Heart Centre, Greams Road, Chennai', 'scheduled', 'Routine blood pressure and ECG follow-up for Ramesh'),
                    (:id2, :family_id, :subject_id, :profile_id, 'Dr. V. Meenakshi', 'Endocrinology', :d2, '10:30', 'Apollo Hospitals, Chennai', 'scheduled', 'Quarterly HbA1c review and diabetic management')
                """), {
                    "id1": apt1_id,
                    "id2": apt2_id,
                    "family_id": family_id,
                    "subject_id": subject_id,
                    "profile_id": profile_id,
                    "d1": now + timedelta(days=2),
                    "d2": now + timedelta(days=14),
                })
                print("Inserted 2 sample appointments for Ramesh!")
            else:
                print("Could not find Ramesh to link appointments.")
        else:
            print(f"Appointments table already has {count} rows.")

        # Also check wearable_connections has sample rows
        wear_count = (await conn.execute(text("SELECT COUNT(*) FROM wearable_connections;"))).scalar()
        if wear_count == 0:
            res = await conn.execute(text("SELECT id FROM care_subjects WHERE external_patient_ref ILIKE '%Ramesh%' LIMIT 1"))
            s_row = res.fetchone()
            if s_row:
                s_id = s_row[0]
                now = datetime.now(timezone.utc)
                await conn.execute(text("""
                    INSERT INTO wearable_connections (id, subject_id, provider, connection_status, device_type, device_id, source, last_sync_at, sync_status, is_stale)
                    VALUES 
                    (:id1, :subject_id, 'fitbit', 'connected', 'Fitbit Sense 2', 'fb-sense-9901', 'fitbit', :now, 'synced', false),
                    (:id2, :subject_id, 'apple_health', 'connected', 'Apple Watch Series 9', 'aw-s9-4412', 'apple_health', :now, 'synced', false)
                """), {
                    "id1": uuid.uuid4(),
                    "id2": uuid.uuid4(),
                    "subject_id": s_id,
                    "now": now
                })
                print("Inserted 2 wearable connections for Ramesh!")
        else:
            print(f"wearable_connections already has {wear_count} rows.")

        # Also check wearable_data has sample rows
        data_count = (await conn.execute(text("SELECT COUNT(*) FROM wearable_data;"))).scalar()
        if data_count == 0:
            res = await conn.execute(text("SELECT id FROM care_subjects WHERE external_patient_ref ILIKE '%Ramesh%' LIMIT 1"))
            s_row = res.fetchone()
            if s_row:
                s_id = s_row[0]
                now = datetime.now(timezone.utc)
                await conn.execute(text("""
                    INSERT INTO wearable_data (id, subject_id, steps, heart_rate, date, source, last_sync_at)
                    VALUES 
                    (:id1, :subject_id, 6420, 72, :d1, 'fitbit', :d1),
                    (:id2, :subject_id, 7150, 70, :d2, 'apple_health', :d2),
                    (:id3, :subject_id, 5890, 74, :d3, 'fitbit', :d3)
                """), {
                    "id1": uuid.uuid4(),
                    "id2": uuid.uuid4(),
                    "id3": uuid.uuid4(),
                    "subject_id": s_id,
                    "d1": now,
                    "d2": now - timedelta(days=1),
                    "d3": now - timedelta(days=2),
                })
                print("Inserted 3 wearable_data records for Ramesh!")
        else:
            print(f"wearable_data already has {data_count} rows.")

        # Update alembic_version to c1a2b3d4e5f6
        await conn.execute(text("UPDATE alembic_version SET version_num = 'c1a2b3d4e5f6'"))
        print("Updated alembic_version to c1a2b3d4e5f6")

if __name__ == '__main__':
    asyncio.run(main())
