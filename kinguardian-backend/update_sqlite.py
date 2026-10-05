import sqlite3
import json

def main():
    conn = sqlite3.connect("kinguardian.db")
    cur = conn.cursor()

    # 1. Update profiles
    cur.execute("UPDATE profiles SET display_name = 'Aniruddha' WHERE email = 'aniruddha123@gmail.com' OR LOWER(display_name) LIKE '%aniruddha%'")
    cur.execute("UPDATE profiles SET display_name = 'Vandana' WHERE email = 'vandana123@gmail.com' OR LOWER(display_name) LIKE '%vandana%'")
    print(f"Updated profiles in SQLite. Total affected: {cur.rowcount}")

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
            ref["name"] = "Ramesh"
            ref["relationship"] = "Father"
            updated = True

        if updated:
            cur.execute("UPDATE care_subjects SET external_patient_ref = ? WHERE id = ?", (json.dumps(ref), cid))
            print(f"Updated care_subject {cid}: {json.dumps(ref)}")

    conn.commit()
    conn.close()
    print("Done updating SQLite.")

if __name__ == "__main__":
    main()
