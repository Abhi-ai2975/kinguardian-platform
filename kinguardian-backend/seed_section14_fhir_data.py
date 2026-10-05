import asyncio
import uuid
import json
from datetime import datetime, timezone
from sqlalchemy import select, text
from app.db import SessionLocal
from app.models import (
    Profile, Family, Membership, CareSubject, WearableData,
    Insight, MedicationAdherence, DocumentReference, Consent, Conversation
)
from app.security import hash_password

async def seed_fhir_section14():
    async with SessionLocal() as s:
        now = datetime.now(timezone.utc)
        print("--- Seeding/Verifying Section 14 FHIR Integration Data ---")

        # 1. Ensure Profiles: Anjali (coordinator), Priya (caregiver), Ramesh (parent)
        anjali = (await s.execute(select(Profile).where(Profile.email == 'anjali@example.com'))).scalar_one_or_none()
        if not anjali:
            anjali = Profile(
                id=uuid.UUID('4aa85cea-8126-405c-967d-0c3b50a0b4e8'),
                identity_subject='local:anjali@example.com',
                email='anjali@example.com',
                display_name='Anjali Sharma',
                timezone='Europe/London',
                role='coordinator',
                password_hash=hash_password('Password123!'),
                is_active=True
            )
            s.add(anjali)
            await s.flush()
            print("Created Anjali profile")
        else:
            anjali.role = 'coordinator'
            anjali.password_hash = hash_password('Password123!')
            anjali.is_active = True

        priya = (await s.execute(select(Profile).where(Profile.email == 'priya@example.com'))).scalar_one_or_none()
        if not priya:
            priya = Profile(
                id=uuid.UUID('26fe4792-21aa-4169-9580-7fdfe3d9b70e'),
                identity_subject='local:priya@example.com',
                email='priya@example.com',
                display_name='Priya',
                timezone='Asia/Kolkata',
                role='caregiver',
                password_hash=hash_password('Password123!'),
                is_active=True
            )
            s.add(priya)
            await s.flush()
            print("Created Priya profile")
        else:
            priya.role = 'caregiver'
            priya.password_hash = hash_password('Password123!')
            priya.is_active = True

        ramesh_profile = (await s.execute(select(Profile).where(Profile.email == 'ramesh@example.com'))).scalar_one_or_none()
        if not ramesh_profile:
            ramesh_profile = Profile(
                id=uuid.UUID('555587b7-3d08-43c5-9217-0aad003ae100'),
                identity_subject='local:ramesh@example.com',
                email='ramesh@example.com',
                display_name='Ramesh Sharma',
                timezone='Asia/Kolkata',
                role='parent',
                password_hash=hash_password('Password123!'),
                is_active=True
            )
            s.add(ramesh_profile)
            await s.flush()
            print("Created Ramesh profile")
        else:
            ramesh_profile.role = 'parent'
            ramesh_profile.password_hash = hash_password('Password123!')
            ramesh_profile.is_active = True

        # 2. Family
        family = (await s.execute(select(Family).where(Family.name.ilike("%Anjali%")))).scalars().first()
        if not family:
            family = Family(
                id=uuid.UUID('ec6f70f6-3cba-4945-9922-227634a9edcf'),
                name="Anjali's Family Circle",
                home_timezone="Asia/Kolkata",
                status="active"
            )
            s.add(family)
            await s.flush()

        # Memberships
        for prof, role in [(anjali, 'coordinator'), (priya, 'caregiver'), (ramesh_profile, 'parent')]:
            mem = (await s.execute(select(Membership).where(
                Membership.family_id == family.id,
                Membership.profile_id == prof.id
            ))).scalar_one_or_none()
            if not mem:
                mem = Membership(family_id=family.id, profile_id=prof.id, role=role, status='active')
                s.add(mem)

        # 3. Care Subject (Ramesh)
        dad_sub = (await s.execute(select(CareSubject).where(
            CareSubject.external_patient_ref.ilike("%Ramesh%") | CareSubject.external_patient_ref.ilike("%Father%")
        ))).scalars().first()

        ref_data = {
            "name": "Ramesh Sharma",
            "age": 68,
            "relationship": "Father",
            "city": "Chennai",
            "fhir_id": "Patient/ramesh-sharma-1",
            "fhir_identifier": "MRN-RAMESH-2026"
        }
        ref_json = json.dumps(ref_data)

        if not dad_sub:
            dad_sub = CareSubject(
                id=uuid.UUID('06a55a0f-9ef6-4bc4-a1c3-68b2ef52f660'),
                family_id=family.id,
                profile_id=ramesh_profile.id,
                external_patient_ref=ref_json,
                preferred_timezone="Asia/Kolkata",
                status="active"
            )
            s.add(dad_sub)
            await s.flush()
            print("Created CareSubject Ramesh")
        else:
            dad_sub.external_patient_ref = ref_json
            dad_sub.preferred_timezone = "Asia/Kolkata"
            dad_sub.status = "active"
            dad_sub.profile_id = ramesh_profile.id

        # Conversation for family/subject
        conv = (await s.execute(select(Conversation).where(
            Conversation.family_id == family.id
        ))).scalars().first()
        if not conv:
            conv = Conversation(
                id=uuid.UUID('c30641ff-930e-40e8-b864-d1db83999dbf'),
                family_id=family.id,
                subject_id=dad_sub.id,
                visibility="family"
            )
            s.add(conv)
            await s.flush()

        # 4. Wearable Data for Ramesh (FHIR-002)
        w_stmt = select(WearableData).where(WearableData.subject_id == dad_sub.id).order_by(WearableData.date.desc())
        w_row = (await s.execute(w_stmt)).scalars().first()
        if not w_row:
            w_row = WearableData(
                subject_id=dad_sub.id,
                steps=5420,
                heart_rate=68,
                sleep_minutes=475,
                date=now,
                source="health_connect",
                last_sync_at=now,
                device_id="google_health_connect"
            )
            s.add(w_row)
            print("Added WearableData for Ramesh")
        else:
            w_row.steps = 5420
            w_row.heart_rate = 68
            w_row.sleep_minutes = 475
            w_row.source = "health_connect"
            w_row.last_sync_at = now

        # 5. Insights / Conditions for Ramesh (FHIR-003)
        ins_stmt = select(Insight).where(
            Insight.subject_id == dad_sub.id,
            Insight.type == 'condition'
        )
        ins_row = (await s.execute(ins_stmt)).scalars().first()
        if not ins_row:
            ins_row = Insight(
                family_id=family.id,
                subject_id=dad_sub.id,
                conversation_id=conv.id,
                type="condition",
                summary="Essential hypertension (ICD-10: I10) and Type 2 diabetes mellitus (ICD-10: E11.9) confirmed via FHIR clinical record. Well controlled.",
                sources="FHIR:Condition/cond-1,FHIR:Condition/cond-2",
                status="active",
                created_at=now
            )
            s.add(ins_row)
            print("Added Condition Insight for Ramesh")

        # 6. Medication Adherence for Ramesh (FHIR-004)
        med_stmt = select(MedicationAdherence).where(
            MedicationAdherence.subject_id == dad_sub.id,
            MedicationAdherence.medication_ref.ilike('%Amlodipine%')
        )
        med_row = (await s.execute(med_stmt)).scalars().first()
        if not med_row:
            med_row = MedicationAdherence(
                subject_id=dad_sub.id,
                medication_ref="Amlodipine 5mg",
                confirmed_by=anjali.id,
                due_time=now,
                taken_at=now,
                source="FHIR:MedicationRequest/med-amlodipine"
            )
            s.add(med_row)
            print("Added MedicationAdherence for Ramesh")

        # 7. Document References for Ramesh with classification = 'lab_report' (FHIR-005)
        doc_stmt = select(DocumentReference).where(
            DocumentReference.subject_id == dad_sub.id,
            DocumentReference.classification == 'lab_report'
        )
        doc_row = (await s.execute(doc_stmt)).scalars().first()
        if not doc_row:
            doc_row = DocumentReference(
                family_id=family.id,
                subject_id=dad_sub.id,
                filenest_file_id="doc-lab-cmp-apollo-2026",
                classification="lab_report",
                status="verified",
                uploaded_by=anjali.id,
                created_at=now
            )
            s.add(doc_row)
            print("Added lab_report DocumentReference for Ramesh")

        # 8. Consent for Priya without clinical_records (FHIR-006)
        con_stmt = select(Consent).where(
            Consent.granted_to_profile_id == priya.id,
            Consent.subject_id == dad_sub.id
        )
        con_row = (await s.execute(con_stmt)).scalars().first()
        if not con_row:
            con_row = Consent(
                family_id=family.id,
                subject_id=dad_sub.id,
                granter_profile_id=anjali.id,
                granted_to_profile_id=priya.id,
                scopes=["health.summary", "medications", "checkins", "care.tasks"],
                status="active"
            )
            s.add(con_row)
            print("Added restricted Consent for Priya (no clinical_records)")
        else:
            con_row.scopes = ["health.summary", "medications", "checkins", "care.tasks"]
            con_row.status = "active"

        await s.commit()
        print("--- Section 14 FHIR Seed Complete and Committed Successfully! ---")

if __name__ == '__main__':
    asyncio.run(seed_fhir_section14())
