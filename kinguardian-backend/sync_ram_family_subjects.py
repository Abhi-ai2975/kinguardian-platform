import asyncio
import uuid
import asyncpg

async def main():
    conn = await asyncpg.connect("postgresql://kinguardian:kinguardian@localhost:5432/kinguardian")
    # Check all families of Ram
    rows = await conn.fetch("""
        SELECT f.id, f.name, f.created_at 
        FROM families f 
        JOIN memberships m ON f.id = m.family_id 
        WHERE m.profile_id = '5f884c2c-fc3c-4d5a-92c9-640966ae6d77' AND m.status = 'active'
    """)
    print("Ram families count:", len(rows))
    for r in rows:
        fid = r['id']
        fname = r['name']
        # Check care subjects
        subjects = await conn.fetch("SELECT id, profile_id, external_patient_ref FROM care_subjects WHERE family_id = $1", fid)
        print(f"Family {fid} ({fname}) has {len(subjects)} care subjects:")
        for s in subjects:
            print("  -", s['profile_id'], s['external_patient_ref'])
        
        # Ensure Aniruddha is a care subject for all Ram families
        has_aniruddha = any('aniruddha' in (s['external_patient_ref'] or '').lower() or s['profile_id'] == uuid.UUID('09826f1e-24b8-4512-bb93-daa751ec9ae1') for s in subjects)
        if not has_aniruddha:
            ref_json = '{"name": "Aniruddha", "age": 68, "city": "Chennai", "country": "IN", "relationship": "Father", "role": "parent"}'
            await conn.execute("""
                INSERT INTO care_subjects (id, family_id, profile_id, external_patient_ref, status, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, '09826f1e-24b8-4512-bb93-daa751ec9ae1', $2, 'active', NOW(), NOW())
            """, fid, ref_json)
            print(f"  --> Inserted Aniruddha for family {fid}")
            
        # Ensure Vandana is a care subject for all Ram families
        has_vandana = any('vandana' in (s['external_patient_ref'] or '').lower() or s['profile_id'] == uuid.UUID('6107be90-9a18-4543-b1b2-1e0fe7a09319') or s['profile_id'] == uuid.UUID('1b2608ad-92c1-4a1d-986e-5ee22c0b05ad') for s in subjects)
        if not has_vandana:
            ref_json = '{"name": "Vandana", "age": 62, "city": "Chennai", "country": "IN", "relationship": "Mother", "role": "parent"}'
            await conn.execute("""
                INSERT INTO care_subjects (id, family_id, profile_id, external_patient_ref, status, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, '6107be90-9a18-4543-b1b2-1e0fe7a09319', $2, 'active', NOW(), NOW())
            """, fid, ref_json)
            print(f"  --> Inserted Vandana for family {fid}")

    await conn.close()

asyncio.run(main())
