import asyncio
import uuid
import os
from datetime import datetime, timezone, timedelta
from sqlalchemy import select, update
from app.db import SessionLocal
from app.models import (
    Profile,
    Family,
    Membership,
    CareSubject,
    CareTask,
    CheckIn,
    MedicationAdherence,
    DocumentReference,
    Conversation,
    Message,
    Notification,
    Insight,
    Consent,
    AuditLog
)
from app.security import hash_password

# Force SQLite for development
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./kinguardian.db"

async def seed_comprehensive_test_data():
    async with SessionLocal() as session:
        # Get existing profiles
        profiles_res = await session.execute(select(Profile))
        profiles = {p.email: p for p in profiles_res.scalars().all()}
        
        # Get Ram's family
        family_res = await session.execute(select(Family).where(Family.name == "Ram's Family"))
        ram_family = family_res.scalar_one_or_none()
        
        if not ram_family:
            print("ERROR: Ram's family not found. Run seed_ram_family.py first.")
            return
        
        ram = profiles.get('ram123@gmail.com')
        vandana = profiles.get('vandana123@gmail.com')
        aniruddha = profiles.get('aniruddha123@gmail.com')
        priya = profiles.get('priya@example.com')
        
        # Get care subjects
        subjects_res = await session.execute(select(CareSubject).where(CareSubject.family_id == ram_family.id))
        subjects = subjects_res.scalars().all()
        
        dad_subject = None
        vandana_subject = None
        aniruddha_subject = None
        
        for s in subjects:
            if s.external_patient_ref and ("ramesh" in s.external_patient_ref.lower() or "father" in s.external_patient_ref.lower()):
                dad_subject = s
            elif s.profile_id == vandana.id:
                vandana_subject = s
            elif s.profile_id == aniruddha.id:
                aniruddha_subject = s
        
        print(f"Found care subjects: Dad={dad_subject.id if dad_subject else 'None'}, Vandana={vandana_subject.id if vandana_subject else 'None'}, Aniruddha={aniruddha_subject.id if aniruddha_subject else 'None'}")
        
        # Create check-ins
        print("\n--- Creating Check-ins ---")
        checkin_count = 0
        for i in range(10):
            for subject in [dad_subject, vandana_subject, aniruddha_subject]:
                if subject:
                    # Check if check-in already exists for this time
                    checkin_time = datetime.now(timezone.utc) - timedelta(days=i, hours=(8 if i % 2 == 0 else 20))
                    existing = await session.execute(
                        select(CheckIn).where(
                            CheckIn.subject_id == subject.id,
                            CheckIn.occurred_at == checkin_time
                        )
                    )
                    if not existing.scalar_one_or_none():
                        mood = ["Good", "Okay", "Not Well"][i % 3]
                        severity = "urgent" if mood == "Not Well" else "normal"
                        submitted_by = subject.profile_id if subject.profile_id else ram.id
                        checkin = CheckIn(
                            subject_id=subject.id,
                            submitted_by=submitted_by,
                            mood=mood,
                            note=f"Feeling {mood.lower()} on day {i+1}",
                            severity=severity,
                            occurred_at=checkin_time
                        )
                        session.add(checkin)
                        checkin_count += 1
        await session.flush()
        print(f"Created {checkin_count} check-ins")
        
        # Create medication adherence records
        print("\n--- Creating Medication Adherence ---")
        med_count = 0
        medications = ["Amlodipine 5mg", "Atorvastatin 20mg", "Metformin 500mg"]
        for i in range(7):
            for subject in [dad_subject, vandana_subject]:
                if subject:
                    for med in medications:
                        taken_time = datetime.now(timezone.utc) - timedelta(days=i, hours=8 if "morning" in med.lower() or i % 2 == 0 else 20)
                        existing = await session.execute(
                            select(MedicationAdherence).where(
                                MedicationAdherence.subject_id == subject.id,
                                MedicationAdherence.medication_ref == med,
                                MedicationAdherence.taken_at == taken_time
                            )
                        )
                        if not existing.scalar_one_or_none():
                            adherence = MedicationAdherence(
                                subject_id=subject.id,
                                medication_ref=med,
                                confirmed_by=subject.profile_id if subject.profile_id else ram.id,
                                taken_at=taken_time,
                                due_time=taken_time,
                                source="parent"
                            )
                            session.add(adherence)
                            med_count += 1
        await session.flush()
        print(f"Created {med_count} medication adherence records")
        await session.execute(
            update(MedicationAdherence)
            .where(MedicationAdherence.due_time.is_(None))
            .values(due_time=MedicationAdherence.taken_at)
        )
        
        # Create additional care tasks
        print("\n--- Creating Care Tasks ---")
        task_count = 0
        task_templates = [
            ("Pick up Dad's lab report from Apollo", "Collect printed biochemistry panel from billing desk", "routine"),
            ("Schedule cardiologist appointment", "Book follow-up with Dr. Sharma for Dad", "high"),
            ("Evening walk assistance", "Help Dad with evening walk around the house", "routine"),
            ("Morning health check", "Check Dad's vitals and morning medication", "high"),
            ("Medication reminder setup", "Configure reminder for evening doses", "routine")
        ]
        
        for title, detail, priority in task_templates:
            existing = await session.execute(
                select(CareTask).where(
                    CareTask.family_id == ram_family.id,
                    CareTask.title == title
                )
            )
            if not existing.scalar_one_or_none():
                task = CareTask(
                    family_id=ram_family.id,
                    subject_id=dad_subject.id if dad_subject else None,
                    created_by=ram.id,
                    assigned_to=priya.id if priya else ram.id,
                    title=title,
                    detail=detail,
                    priority=priority,
                    status="open",
                    due_at=datetime.now(timezone.utc) + timedelta(days=1, hours=9)
                )
                session.add(task)
                task_count += 1
        await session.flush()
        print(f"Created {task_count} care tasks")
        
        # Create document references
        print("\n--- Creating Document References ---")
        doc_count = 0
        doc_templates = [
            ("Apollo_Metabolic_Panel_Sep2026.pdf", "Diagnostic Lab"),
            ("Apollo_Prescription_Cardiology.pdf", "Prescription"),
            ("Discharge_Summary_July2026.pdf", "Clinical Record")
        ]
        
        for filename, classification in doc_templates:
            for idx, subject in enumerate([dad_subject, vandana_subject]):
                if subject:
                    # Make filename unique per subject
                    unique_filename = f"{str(subject.id)[:8]}_{filename}"
                    existing = await session.execute(
                        select(DocumentReference).where(
                            DocumentReference.subject_id == subject.id,
                            DocumentReference.filenest_file_id == unique_filename
                        )
                    )
                    if not existing.scalar_one_or_none():
                        doc = DocumentReference(
                            family_id=ram_family.id,
                            subject_id=subject.id,
                            filenest_file_id=unique_filename,
                            classification=classification,
                            status="ready",
                            uploaded_by=ram.id
                        )
                        session.add(doc)
                        doc_count += 1
        await session.flush()
        print(f"Created {doc_count} document references")
        
        # Create notifications
        print("\n--- Creating Notifications ---")
        notif_count = 0
        notif_templates = [
            ("checkin", {"title": "Dad submitted morning check-in", "message": "Feeling Good today", "severity": "normal"}),
            ("reminder", {"title": "Medication Reminder", "message": "Evening dose due at 8:00 PM", "severity": "normal"}),
            ("alert", {"title": "Guardian Moment", "message": "5-day activity decrease detected", "severity": "high"}),
            ("task", {"title": "New Task Assigned", "message": "Pick up lab report from Apollo", "severity": "normal"}),
            ("medication_overdue", {"title": "Medication Overdue", "message": "Atorvastatin not confirmed", "severity": "medium"})
        ]
        
        for event_type, payload in notif_templates:
            for recipient in [ram, vandana, priya]:
                if recipient:
                    notif = Notification(
                        family_id=ram_family.id,
                        recipient_id=recipient.id,
                        event_type=event_type,
                        payload=payload
                    )
                    session.add(notif)
                    notif_count += 1
        await session.flush()
        print(f"Created {notif_count} notifications")
        
        # Create insights
        print("\n--- Creating Insights ---")
        insight_count = 0
        insight_templates = [
            ("Guardian Moment: Afternoon Heatwave Correlation", "Dad's steps decreased 35% over past 5 days during 39°C Chennai peak heat", "wearable_gateway"),
            ("Blood Pressure Baseline Update", "30-day average BP: 126/82 mmHg. Current: 138/88 mmHg (+9.5% variance)", "omron_bp"),
            ("Medication Adherence Trend", "Morning medication adherence at 95% over past week", "medication_adherence")
        ]
        
        # Get or create conversation for insights
        existing_conv = await session.execute(
            select(Conversation).where(Conversation.family_id == ram_family.id)
        )
        conv = existing_conv.scalars().first()
        
        if not conv:
            conv = Conversation(
                family_id=ram_family.id,
                subject_id=dad_subject.id if dad_subject else None
            )
            session.add(conv)
            await session.flush()
        
        for summary, _, source in insight_templates:
            existing = await session.execute(
                select(Insight).where(
                    Insight.family_id == ram_family.id,
                    Insight.summary == summary
                )
            )
            if not existing.scalar_one_or_none():
                insight = Insight(
                    family_id=ram_family.id,
                    subject_id=dad_subject.id if dad_subject else None,
                    conversation_id=conv.id if conv else None,
                    summary=summary,
                    source=source
                )
                session.add(insight)
                insight_count += 1
        await session.flush()
        print(f"Created {insight_count} insights")
        
        # Create consents
        print("\n--- Creating Consents ---")
        consent_count = 0
        if priya and dad_subject:
            consent = Consent(
                subject_id=dad_subject.id,
                granted_to_profile_id=priya.id,
                scopes=["health.summary", "medications", "checkins", "care.tasks"],
                status="active"
            )
            session.add(consent)
            consent_count += 1
        if vandana and vandana_subject:
            existing_vandana_consent = await session.execute(
                select(Consent).where(
                    Consent.subject_id == vandana_subject.id,
                    Consent.granted_to_profile_id == vandana.id
                )
            )
            if not existing_vandana_consent.scalar_one_or_none():
                session.add(Consent(
                    subject_id=vandana_subject.id,
                    granted_to_profile_id=vandana.id,
                    scopes=[],
                    status="inactive"
                ))
                consent_count += 1
        await session.flush()
        print(f"Created {consent_count} consents")
        
        # Create conversations and messages
        print("\n--- Creating Conversations and Messages ---")
        msg_count = 0
        
        # Use existing conversation (created in insights section)
        existing_conv = await session.execute(
            select(Conversation).where(Conversation.family_id == ram_family.id)
        )
        conv = existing_conv.scalars().first()
        
        if conv:
            messages = [
                (ram.id, "Welcome to Ram's family care coordination! Let's take care of Dad together."),
                (vandana.id if vandana else ram.id, "Feeling good today, thanks for checking in!"),
                (ram.id, "Hi Priya and Dad! Calling at 5:00 PM today."),
                (priya.id if priya else ram.id, "I'll pick up the lab report tomorrow morning.")
            ]
            
            for sender_id, body in messages:
                existing = await session.execute(
                    select(Message).where(
                        Message.conversation_id == conv.id,
                        Message.body == body
                    )
                )
                if not existing.scalar_one_or_none():
                    msg = Message(
                        conversation_id=conv.id,
                        sender_id=sender_id,
                        body=body
                    )
                    session.add(msg)
                    msg_count += 1
        await session.flush()
        print(f"Created {msg_count} messages")

        existing_ai_outage = await session.execute(
            select(AuditLog).where(AuditLog.action == "ai_service_unavailable")
        )
        if not existing_ai_outage.scalar_one_or_none():
            now = datetime.now(timezone.utc)
            session.add(AuditLog(
                occurred_at=now,
                created_at=now,
                action="ai_service_unavailable",
                resource_type="ai_service",
                resource_id="simulated-outage",
                error="AI service temporarily unavailable; safe fallback returned.",
                metadata_json={"simulated": True}
            ))
        
        # Commit all changes
        await session.commit()
        
        print("\n" + "="*60)
        print("COMPREHENSIVE TEST DATA SEEDING COMPLETE!")
        print("="*60)
        print(f"\nDatabase Summary:")
        print(f"  Check-ins: {checkin_count}")
        print(f"  Medication Adherence: {med_count}")
        print(f"  Care Tasks: {task_count}")
        print(f"  Document References: {doc_count}")
        print(f"  Notifications: {notif_count}")
        print(f"  Insights: {insight_count}")
        print(f"  Consents: {consent_count}")
        print(f"  Messages: {msg_count}")
        print("\nTest data ready for all 113 functional test cases!")

if __name__ == "__main__":
    asyncio.run(seed_comprehensive_test_data())
