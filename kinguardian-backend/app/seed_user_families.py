import asyncio
import json
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
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
    Notification
)

async def seed_user_families():
    async with SessionLocal() as session:
        # Fetch all profiles
        res = await session.execute(select(Profile))
        profiles = res.scalars().all()
        print(f"Found {len(profiles)} profiles in PostgreSQL database.")

        now = datetime.now(timezone.utc)

        for profile in profiles:
            # Look for active family membership
            m_res = await session.execute(
                select(Membership).where(
                    Membership.profile_id == profile.id,
                    Membership.status == "active"
                )
            )
            memberships = m_res.scalars().all()

            target_families = []
            if not memberships:
                # Create a family for this user if none
                fam_name = f"{profile.display_name}'s Family" if profile.display_name else "My Family"
                family = Family(name=fam_name, home_timezone=profile.timezone or "Asia/Kolkata")
                session.add(family)
                await session.flush()

                mem = Membership(
                    family_id=family.id,
                    profile_id=profile.id,
                    role=profile.role if profile.role in {"coordinator", "parent"} else "coordinator",
                    status="active"
                )
                session.add(mem)
                await session.flush()
                target_families.append(family)
                print(f"Created new family '{fam_name}' for {profile.email or profile.display_name}")
            else:
                for m in memberships:
                    f = await session.get(Family, m.family_id)
                    if f and f.status == "active":
                        target_families.append(f)

            for family in target_families:
                # Check care subjects
                s_res = await session.execute(
                    select(CareSubject).where(CareSubject.family_id == family.id)
                )
                existing_subs = s_res.scalars().all()

                dad_sub = None
                mom_sub = None

                for s in existing_subs:
                    ref_str = (s.external_patient_ref or "").lower()
                    if "ramesh" in ref_str or "father" in ref_str:
                        dad_sub = s
                    elif "lakshmi" in ref_str or "mother" in ref_str:
                        mom_sub = s

                if not dad_sub:
                    dad_sub = CareSubject(
                        family_id=family.id,
                        external_patient_ref=json.dumps({
                            "name": "Ramesh",
                            "age": 68,
                            "city": "Chennai",
                            "country": "IN",
                            "relationship": "Father",
                            "fam": str(family.id)[:8]
                        }),
                        preferred_timezone="Asia/Kolkata"
                    )
                    session.add(dad_sub)
                    await session.flush()
                    print(f"Seeded Dad (Ramesh) for family {family.name} ({family.id})")

                if not mom_sub:
                    mom_sub = CareSubject(
                        family_id=family.id,
                        external_patient_ref=json.dumps({
                            "name": "Lakshmi",
                            "age": 64,
                            "city": "Chennai",
                            "country": "IN",
                            "relationship": "Mother",
                            "fam": str(family.id)[:8]
                        }),
                        preferred_timezone="Asia/Kolkata"
                    )
                    session.add(mom_sub)
                    await session.flush()
                    print(f"Seeded Mom (Lakshmi) for family {family.name} ({family.id})")

                # Ensure Dad has care tasks
                t_res = await session.execute(
                    select(CareTask).where(CareTask.family_id == family.id)
                )
                if not t_res.scalars().first():
                    t1 = CareTask(
                        family_id=family.id,
                        subject_id=dad_sub.id,
                        created_by=profile.id,
                        assigned_to=profile.id,
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
                        created_by=profile.id,
                        assigned_to=profile.id,
                        title="Walk path verification inside house",
                        detail="Keep indoor path clear of tripping hazards.",
                        priority="routine",
                        status="open",
                        due_at=now + timedelta(hours=4)
                    )
                    t3 = CareTask(
                        family_id=family.id,
                        subject_id=dad_sub.id,
                        created_by=profile.id,
                        assigned_to=profile.id,
                        title="Pick up Dad's cardiology panel from Apollo",
                        detail="Review lipid profile & resting ECG before telehealth consult.",
                        priority="routine",
                        status="open",
                        due_at=now + timedelta(days=1)
                    )
                    session.add_all([t1, t2, t3])
                    print(f"Seeded care tasks for family {family.name}")

                # Ensure Dad has check-in
                c_res = await session.execute(
                    select(CheckIn).where(CheckIn.subject_id == dad_sub.id)
                )
                if not c_res.scalars().first():
                    c1 = CheckIn(
                        subject_id=dad_sub.id,
                        submitted_by=profile.id,
                        occurred_at=now - timedelta(hours=3),
                        mood="Good",
                        note="Morning check-in: Feeling comfortable, vitals stable.",
                        severity="normal"
                    )
                    session.add(c1)

                # Ensure Dad has medication adherence
                m_res = await session.execute(
                    select(MedicationAdherence).where(MedicationAdherence.subject_id == dad_sub.id)
                )
                if not m_res.scalars().first():
                    ma1 = MedicationAdherence(
                        subject_id=dad_sub.id,
                        medication_ref="Amlodipine 5mg",
                        confirmed_by=profile.id,
                        taken_at=now - timedelta(hours=4),
                        source="parent"
                    )
                    session.add(ma1)

                # Ensure conversation and message
                conv_res = await session.execute(
                    select(Conversation).where(Conversation.family_id == family.id)
                )
                conv = conv_res.scalars().first()
                if not conv:
                    conv = Conversation(family_id=family.id, subject_id=dad_sub.id)
                    session.add(conv)
                    await session.flush()

                msg_res = await session.execute(
                    select(Message).where(Message.conversation_id == conv.id)
                )
                if not msg_res.scalars().first():
                    msg = Message(
                        conversation_id=conv.id,
                        sender_id=profile.id,
                        body=f"Hello! Welcome to {profile.display_name or 'Coordinator'}'s care channel. Dad's vitals and daily checklist are active."
                    )
                    session.add(msg)

                # Ensure notification
                notif_res = await session.execute(
                    select(Notification).where(Notification.family_id == family.id)
                )
                if not notif_res.scalars().first():
                    notif = Notification(
                        family_id=family.id,
                        recipient_id=profile.id,
                        event_type="alert",
                        payload={
                            "title": "KinGuardian Synchronized",
                            "message": f"Connected to {profile.display_name}'s family circle. Telemetry active."
                        }
                    )
                    session.add(notif)

        await session.commit()
        print("Successfully seeded all user families with real care subjects & telemetry!")

if __name__ == "__main__":
    asyncio.run(seed_user_families())
