import asyncio
import sys
import io

# Force utf-8 stdout
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

from sqlalchemy import select
from app.db import SessionLocal
from app.models import CareSubject, WearableData, Insight, MedicationAdherence, DocumentReference, Consent, Profile

async def main():
    async with SessionLocal() as s:
        print("--- FHIR-001 CareSubjects ---")
        stmt1 = select(CareSubject.id, CareSubject.external_patient_ref, CareSubject.preferred_timezone, CareSubject.status).where(
            CareSubject.external_patient_ref.ilike('%Ramesh%')
        ).order_by(CareSubject.created_at.desc()).limit(5)
        res1 = (await s.execute(stmt1)).all()
        for r in res1:
            print('  CareSubject:', r)

        print("\n--- FHIR-002 WearableData ---")
        ramesh_subs = [r[0] for r in res1]
        stmt2 = select(WearableData.id, WearableData.subject_id, WearableData.steps, WearableData.heart_rate, WearableData.date, WearableData.source).where(
            WearableData.subject_id.in_(ramesh_subs)
        ).order_by(WearableData.date.desc()).limit(5)
        res2 = (await s.execute(stmt2)).all()
        for r in res2:
            print('  WearableData:', r)

        print("\n--- FHIR-003 Insights ---")
        stmt3 = select(Insight.id, Insight.subject_id, Insight.type, Insight.summary, Insight.sources, Insight.status).where(
            Insight.subject_id.in_(ramesh_subs)
        ).order_by(Insight.created_at.desc()).limit(5)
        res3 = (await s.execute(stmt3)).all()
        for r in res3:
            print('  Insight:', r[0], r[1], r[2], r[3][:60] if r[3] else None, r[5])

        print("\n--- FHIR-004 MedicationAdherence ---")
        stmt4 = select(MedicationAdherence.id, MedicationAdherence.medication_ref, MedicationAdherence.confirmed_by, MedicationAdherence.due_time, MedicationAdherence.taken_at, MedicationAdherence.source).where(
            MedicationAdherence.subject_id.in_(ramesh_subs)
        ).order_by(MedicationAdherence.due_time.asc()).limit(5)
        res4 = (await s.execute(stmt4)).all()
        for r in res4:
            print('  MedAdherence:', r)

        print("\n--- FHIR-005 DocumentReferences ---")
        stmt5 = select(DocumentReference.id, DocumentReference.filenest_file_id, DocumentReference.classification, DocumentReference.status, DocumentReference.uploaded_by, DocumentReference.created_at).where(
            DocumentReference.subject_id.in_(ramesh_subs),
            DocumentReference.classification == 'lab_report'
        ).order_by(DocumentReference.created_at.desc()).limit(5)
        res5 = (await s.execute(stmt5)).all()
        for r in res5:
            print('  DocRef (lab):', r)

        print("\n--- FHIR-006 Consents for Priya ---")
        priya = (await s.execute(select(Profile.id).where(Profile.email == 'priya@example.com'))).scalar_one_or_none()
        print('Priya profile id:', priya)
        if priya:
            stmt6 = select(Consent.id, Consent.subject_id, Consent.granted_to_profile_id, Consent.scopes, Consent.status).where(
                Consent.granted_to_profile_id == priya
            )
            res6 = (await s.execute(stmt6)).all()
            for r in res6:
                print('  Priya Consent:', r)

if __name__ == '__main__':
    asyncio.run(main())
