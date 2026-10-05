import asyncio
import json
import sqlite3
import asyncpg

async def update_postgres():
    print("--- Updating PostgreSQL ---")
    try:
        conn = await asyncpg.connect("postgresql://kinguardian:kinguardian@localhost:5432/kinguardian")
    except Exception as e:
        print(f"Could not connect to postgres directly on localhost:5432: {e}")
        return

    try:
        # 1. Update Aniruddha's profile display_name
        res1 = await conn.execute("""
            UPDATE profiles 
            SET display_name = 'Aniruddha' 
            WHERE email = 'aniruddha123@gmail.com' OR display_name ILIKE '%aniruddha%'
            AND email != 'aniruddha1234@gmail.com';
        """)
        print(f"Updated Aniruddha profiles: {res1}")

        # 2. Update Vandana's profile display_name (remove Sharma)
        res2 = await conn.execute("""
            UPDATE profiles 
            SET display_name = 'Vandana' 
            WHERE display_name ILIKE '%vandana%';
        """)
        print(f"Updated Vandana profiles: {res2}")

        # 3. Update CareSubjects for Aniruddha
        # Family c3450830-33c0-43cf-a207-690739b9ee70
        ani_ref = {
            "name": "Aniruddha",
            "relationship": "Father",
            "role": "parent",
            "age": 68,
            "city": "Chennai",
            "country": "IN",
            "uid": "09826f1e",
            "fhir_id": "Patient/aniruddha-1",
            "fhir_identifier": "MRN-ANIRUDDHA-2026"
        }
        res3 = await conn.execute("""
            UPDATE care_subjects
            SET external_patient_ref = $1
            WHERE id = 'a8a8f689-6ae7-441f-bba3-262dfbfe022c'
            OR (profile_id = '09826f1e-24b8-4512-bb93-daa751ec9ae1');
        """, json.dumps(ani_ref))
        print(f"Updated Aniruddha care_subjects: {res3}")

        # 4. Update CareSubjects for Vandana
        van_ref = {
            "name": "Vandana",
            "relationship": "Mother",
            "role": "parent",
            "age": 62,
            "city": "Chennai",
            "country": "IN",
            "uid": "6107be90",
            "fam": "f8420352"
        }
        res4 = await conn.execute("""
            UPDATE care_subjects
            SET external_patient_ref = $1
            WHERE id = '3c01634a-b867-4e3b-a5a6-17762505cfbc'
            OR (profile_id = '6107be90-9a18-4543-b1b2-1e0fe7a09319');
        """, json.dumps(van_ref))
        print(f"Updated Vandana care_subjects: {res4}")

        # 5. Delete duplicate / test aniruddha1234 profile, memberships, care_subject, and family
        await conn.execute("DELETE FROM care_subjects WHERE profile_id = '43e29ad6-f76e-4102-ada9-d0373e5b6022' OR id = '1349576d-a050-445b-8cb9-7fc8b10ccc3c';")
        await conn.execute("DELETE FROM memberships WHERE profile_id = '43e29ad6-f76e-4102-ada9-d0373e5b6022';")
        await conn.execute("DELETE FROM profiles WHERE id = '43e29ad6-f76e-4102-ada9-d0373e5b6022';")
        await conn.execute("DELETE FROM families WHERE id = '8a4d6934-88ce-44e7-8350-82f3e68590a7';")
        print("Deleted duplicate aniruddha1234 profile, care subject, and family")

        # 6. Verify care subjects in Ram's active family c3450830-33c0-43cf-a207-690739b9ee70
        rows = await conn.fetch("""
            SELECT cs.id, cs.family_id, cs.profile_id, p.display_name, cs.external_patient_ref 
            FROM care_subjects cs
            LEFT JOIN profiles p ON cs.profile_id = p.id
            WHERE cs.family_id = 'c3450830-33c0-43cf-a207-690739b9ee70';
        """)
        print("\nVerified subjects in Ram's active family (c3450830-33c0-43cf-a207-690739b9ee70):")
        for r in rows:
            print("  ", r['id'], "| profile:", r['display_name'], "| ref:", r['external_patient_ref'])

    finally:
        await conn.close()

def update_sqlite():
    print("\n--- Updating SQLite (kinguardian.db) ---")
    conn = sqlite3.connect("kinguardian.db")
    cur = conn.cursor()
    
    # 1. Update profiles
    cur.execute("UPDATE profiles SET display_name = 'Aniruddha' WHERE email = 'aniruddha123@gmail.com' OR LOWER(display_name) LIKE '%aniruddha%'")
    cur.execute("UPDATE profiles SET display_name = 'Vandana' WHERE email = 'vandana123@gmail.com' OR LOWER(display_name) LIKE '%vandana%'")
    print(f"Updated SQLite profiles. Rows affected: {cur.rowcount}")

    # 2. Update care_subjects
    cur.execute("SELECT id, family_id, profile_id, external_patient_ref FROM care_subjects")
    rows = cur.fetchall()
    for row in rows:
        cid, fid, pid, ref_str = row
        if not ref_str:
            continue
        try:
            ref = json.loads(ref_str)
        except Exception:
            continue
        name = ref.get("name", "")
        updated = False
        if "aniruddha" in name.lower():
            ref["name"] = "Aniruddha"
            ref["relationship"] = "Father"
            ref["role"] = "parent"
            updated = True
        elif "vandana" in name.lower():
            ref["name"] = "Vandana"
            ref["relationship"] = "Mother"
            ref["role"] = "parent"
            updated = True
        elif "sharma" in name.lower() and "ramesh" in name.lower():
            # If Ramesh Sharma, remove surname as well
            ref["name"] = "Ramesh"
            ref["relationship"] = "Father"
            updated = True

        if updated:
            cur.execute("UPDATE care_subjects SET external_patient_ref = ? WHERE id = ?", (json.dumps(ref), cid))
            print(f"Updated care_subject {cid}: {json.dumps(ref)}")

    conn.commit()
    conn.close()
    print("SQLite update complete.")

if __name__ == "__main__":
    asyncio.run(update_postgres())
    update_sqlite()
