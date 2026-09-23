import asyncio
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from app.db import SessionLocal
from app.models import Profile, Family, Membership, CareSubject, CareTask, CheckIn, MedicationAdherence, DocumentReference, Conversation, Message, Notification

async def seed():
    async with SessionLocal() as session:
        # Find or create coordinator profile
        res = await session.execute(select(Profile).where(Profile.email == "anjali.coordinator@example.com"))
        anjali = res.scalar_one_or_none()
        if not anjali:
            anjali = Profile(
                identity_subject="iam_anjali_london_001",
                email="anjali.coordinator@example.com",
                display_name="Anjali",
                timezone="Europe/London",
                role="coordinator"
            )
            session.add(anjali)
            await session.flush()

        # Find or create family
        res = await session.execute(select(Family).where(Family.name == "KinGuardian Family"))
        family = res.scalar_one_or_none()
        if not family:
            family = Family(name="KinGuardian Family", home_timezone="Asia/Kolkata")
            session.add(family)
            await session.flush()

        # Ensure Anjali is a member
        res = await session.execute(select(Membership).where(Membership.family_id == family.id, Membership.profile_id == anjali.id))
        if not res.scalar_one_or_none():
            session.add(Membership(family_id=family.id, profile_id=anjali.id, role="coordinator"))

        # Find or create Dad subject
        res = await session.execute(select(CareSubject).where(CareSubject.family_id == family.id))
        subjects = res.scalars().all()
        dad_sub = None
        for s in subjects:
            if s.external_patient_ref and "ramesh" in s.external_patient_ref.lower():
                dad_sub = s
                break
        if not dad_sub:
            dad_sub = CareSubject(
                family_id=family.id,
                external_patient_ref='{"name":"Ramesh","age":68,"city":"Chennai","country":"IN","relationship":"Father"}',
                preferred_timezone="Asia/Kolkata"
            )
            session.add(dad_sub)
            await session.flush()

        # Seed care tasks if none
        res = await session.execute(select(CareTask).where(CareTask.family_id == family.id))
        if not res.scalars().first():
            now = datetime.now(timezone.utc)
            t1 = CareTask(
                family_id=family.id,
                subject_id=dad_sub.id,
                created_by=anjali.id,
                assigned_to=anjali.id,
                title="Verify afternoon hydration",
                detail="Ensure Dad drinks enough fluids during high temperatures in Chennai.",
                priority="high",
                status="completed",
                due_at=now - timedelta(hours=2),
                completed_at=now - timedelta(hours=1)
            )
            t2 = CareTask(
                family_id=family.id,
                subject_id=dad_sub.id,
                created_by=anjali.id,
                assigned_to=anjali.id,
                title="Walk path verification inside house",
                detail="Keep indoor path clear of tripping hazards.",
                priority="routine",
                status="open",
                due_at=now + timedelta(hours=4)
            )
            t3 = CareTask(
                family_id=family.id,
                subject_id=dad_sub.id,
                created_by=anjali.id,
                assigned_to=anjali.id,
                title="Pick up Dad's lab report from Apollo",
                detail="Cardiology and lipid panel printout.",
                priority="routine",
                status="open",
                due_at=now + timedelta(days=1)
            )
            session.add_all([t1, t2, t3])
            print("Seeded care tasks")

        # Seed checkins if none
        res = await session.execute(select(CheckIn).where(CheckIn.subject_id == dad_sub.id))
        if not res.scalars().first():
            now = datetime.now(timezone.utc)
            c1 = CheckIn(
                subject_id=dad_sub.id,
                submitted_by=anjali.id,
                occurred_at=now - timedelta(hours=3),
                mood="Good",
                note="Morning check-in: Feeling comfortable, resting in AC.",
                severity="normal"
            )
            session.add(c1)
            print("Seeded checkin")

        # Seed medication adherence if none
        res = await session.execute(select(MedicationAdherence).where(MedicationAdherence.subject_id == dad_sub.id))
        if not res.scalars().first():
            now = datetime.now(timezone.utc)
            m1 = MedicationAdherence(
                subject_id=dad_sub.id,
                medication_ref="Amlodipine 5mg",
                confirmed_by=anjali.id,
                taken_at=now - timedelta(hours=4),
                source="parent"
            )
            session.add(m1)
            print("Seeded medication adherence")

        # Seed documents if none
        res = await session.execute(select(DocumentReference).where(DocumentReference.family_id == family.id))
        if not res.scalars().first():
            d1 = DocumentReference(
                family_id=family.id,
                subject_id=dad_sub.id,
                filenest_file_id="doc-cardio-aug18",
                classification="Diagnostic Lab",
                status="verified",
                uploaded_by=anjali.id
            )
            d2 = DocumentReference(
                family_id=family.id,
                subject_id=dad_sub.id,
                filenest_file_id="doc-lipid-aug15",
                classification="Clinical Summary",
                status="verified",
                uploaded_by=anjali.id
            )
            session.add_all([d1, d2])
            print("Seeded documents")

        # Seed conversation and messages if none
        res = await session.execute(select(Conversation).where(Conversation.family_id == family.id))
        conv = res.scalars().first()
        if not conv:
            conv = Conversation(family_id=family.id, subject_id=dad_sub.id)
            session.add(conv)
            await session.flush()

        res = await session.execute(select(Message).where(Message.conversation_id == conv.id))
        if not res.scalars().first():
            msg1 = Message(
                conversation_id=conv.id,
                sender_id=anjali.id,
                body="Hey everyone, KinGuardian noticed Dad's steps are down in Chennai. Has he been walking inside?"
            )
            session.add(msg1)
            print("Seeded initial message")

        # Seed notifications if none
        res = await session.execute(select(Notification).where(Notification.family_id == family.id))
        if not res.scalars().first():
            n1 = Notification(
                family_id=family.id,
                recipient_id=anjali.id,
                event_type="alert",
                payload={"title": "KinGuardian Synchronized", "message": "All family devices and vitals telemetry active."}
            )
            session.add(n1)
            print("Seeded notification")

        await session.commit()
        print("Database seeding completed successfully!")

if __name__ == "__main__":
    asyncio.run(seed())
