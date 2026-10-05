import asyncio
import os
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
import app.models
from app.security import hash_password

# Force SQLite for development by setting environment variable first
os.environ["DATABASE_URL"] = "sqlite+aiosqlite:///./kinguardian.db"

# Create new engine with SQLite (after env var is set)
engine = create_async_engine("sqlite+aiosqlite:///./kinguardian.db", pool_pre_ping=True)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)

async def setup_ram_family():
    """Initialize database and seed Ram's family."""
    
    # Create tables using the models' Base
    async with engine.begin() as conn:
        await conn.run_sync(app.models.Base.metadata.create_all)
    print("Database tables created successfully!")
    
    # Seed data
    async with SessionLocal() as session:
        # Create Ram as coordinator
        ram_res = await session.execute(select(app.models.Profile).where(app.models.Profile.email == "ram123@gmail.com"))
        ram = ram_res.scalar_one_or_none()
        if not ram:
            ram = app.models.Profile(
                identity_subject="local:ram123@gmail.com",
                email="ram123@gmail.com",
                display_name="Ram",
                timezone="Asia/Kolkata",
                role="coordinator",
                password_hash=hash_password("ram123"),
                is_active=True
            )
            session.add(ram)
            await session.flush()
            print("Created Ram profile as coordinator")
        else:
            print("Ram profile already exists")

        # Create Ram's family
        family_res = await session.execute(select(app.models.Family).where(app.models.Family.name == "Ram's Family"))
        family = family_res.scalar_one_or_none()
        if not family:
            family = app.models.Family(name="Ram's Family", home_timezone="Asia/Kolkata")
            session.add(family)
            await session.flush()
            print("Created Ram's family")
        else:
            print("Ram's family already exists")

        # Add Ram to family as coordinator
        mem_res = await session.execute(
            select(app.models.Membership).where(
                app.models.Membership.family_id == family.id,
                app.models.Membership.profile_id == ram.id
            )
        )
        ram_membership = mem_res.scalar_one_or_none()
        if not ram_membership:
            ram_membership = app.models.Membership(
                family_id=family.id,
                profile_id=ram.id,
                role="coordinator",
                status="active"
            )
            session.add(ram_membership)
            await session.flush()
            print("Added Ram to family as coordinator")

        # Create parents/caregivers for Ram's family
        family_members = [
            {
                "name": "Vandana",
                "email": "vandana123@gmail.com",
                "password": "vandana123",
                "role": "parent",
                "identity_subject": "local:vandana123@gmail.com"
            },
            {
                "name": "Aniruddha", 
                "email": "aniruddha123@gmail.com",
                "password": "aniruddha123",
                "role": "parent",
                "identity_subject": "local:aniruddha123@gmail.com"
            },
            {
                "name": "Priya",
                "email": "priya@example.com", 
                "password": "priya123",
                "role": "caregiver",
                "identity_subject": "local:priya@example.com"
            }
        ]

        for member_data in family_members:
            member_res = await session.execute(
                select(app.models.Profile).where(app.models.Profile.email == member_data["email"])
            )
            member = member_res.scalar_one_or_none()
            
            if not member:
                member = app.models.Profile(
                    identity_subject=member_data["identity_subject"],
                    email=member_data["email"],
                    display_name=member_data["name"],
                    timezone="Asia/Kolkata",
                    role=member_data["role"],
                    password_hash=hash_password(member_data["password"]),
                    is_active=True
                )
                session.add(member)
                await session.flush()
                print(f"Created {member_data['name']} profile as {member_data['role']}")
            else:
                print(f"{member_data['name']} profile already exists")

            # Add member to family
            mem_res = await session.execute(
                select(app.models.Membership).where(
                    app.models.Membership.family_id == family.id,
                    app.models.Membership.profile_id == member.id
                )
            )
            membership = mem_res.scalar_one_or_none()
            if not membership:
                membership = app.models.Membership(
                    family_id=family.id,
                    profile_id=member.id,
                    role=member_data["role"],
                    status="active"
                )
                session.add(membership)
                await session.flush()
                print(f"Added {member_data['name']} to family as {member_data['role']}")

            # Create care subject for parent roles
            if member_data["role"] == "parent":
                subject_res = await session.execute(
                    select(app.models.CareSubject).where(
                        app.models.CareSubject.family_id == family.id,
                        app.models.CareSubject.profile_id == member.id
                    )
                )
                subject = subject_res.scalar_one_or_none()
                if not subject:
                    rel = "Father" if member_data["name"] == "Aniruddha" else ("Mother" if member_data["name"] == "Vandana" else "Parent")
                    subject = app.models.CareSubject(
                        family_id=family.id,
                        profile_id=member.id,
                        external_patient_ref=f'{{"name":"{member_data["name"]}","role":"parent","relationship":"{rel}","family":"Ram"}}',
                        preferred_timezone="Asia/Kolkata",
                        status="active"
                    )
                    session.add(subject)
                    await session.flush()
                    print(f"Created care subject for {member_data['name']} in Ram's family")

        # Create a generic dad care subject for the family
        dad_res = await session.execute(
            select(app.models.CareSubject).where(app.models.CareSubject.family_id == family.id)
        )
        subjects = dad_res.scalars().all()
        dad_subject = None
        for s in subjects:
            if s.external_patient_ref and ("ramesh" in s.external_patient_ref.lower() or "father" in s.external_patient_ref.lower()):
                dad_subject = s
                break
        
        if not dad_subject:
            dad_subject = app.models.CareSubject(
                family_id=family.id,
                external_patient_ref='{"name":"Ramesh","age":68,"relationship":"Father","city":"Chennai"}',
                preferred_timezone="Asia/Kolkata",
                status="active"
            )
            session.add(dad_subject)
            await session.flush()
            print("Created care subject for Dad (Ramesh) in Ram's family")

        # Add some sample care tasks for dad
        task_res = await session.execute(
            select(app.models.CareTask).where(app.models.CareTask.family_id == family.id)
        )
        if not task_res.scalars().first():
            now = datetime.now(timezone.utc)
            t1 = app.models.CareTask(
                family_id=family.id,
                subject_id=dad_subject.id,
                created_by=ram.id,
                assigned_to=ram.id,
                title="Morning health check",
                detail="Check Dad's vitals and morning medication",
                priority="high",
                status="open",
                due_at=now + timedelta(hours=2)
            )
            t2 = app.models.CareTask(
                family_id=family.id,
                subject_id=dad_subject.id,
                created_by=ram.id,
                assigned_to=ram.id,
                title="Evening walk assistance",
                detail="Help Dad with evening walk around the house",
                priority="routine",
                status="open",
                due_at=now + timedelta(hours=8)
            )
            session.add_all([t1, t2])
            print("Added sample care tasks for Ram's family")

        # Create a conversation for the family
        conv_res = await session.execute(
            select(app.models.Conversation).where(app.models.Conversation.family_id == family.id)
        )
        conv = conv_res.scalars().first()
        if not conv:
            conv = app.models.Conversation(family_id=family.id, subject_id=dad_subject.id)
            session.add(conv)
            await session.flush()
            
            # Add welcome message
            msg = app.models.Message(
                conversation_id=conv.id,
                sender_id=ram.id,
                body="Welcome to Ram's family care coordination! Let's take care of Dad together."
            )
            session.add(msg)
            print("Created family conversation for Ram")

        await session.commit()
        print("\nSuccessfully seeded Ram's family with all members!")
        print("\nLogin credentials:")
        print("Ram (coordinator): ram123@gmail.com / ram123")
        print("Vandana (parent): vandana123@gmail.com / vandana123") 
        print("Aniruddha (parent): aniruddha123@gmail.com / aniruddha123")
        print("Priya (caregiver): priya@example.com / priya123")

if __name__ == "__main__":
    asyncio.run(setup_ram_family())