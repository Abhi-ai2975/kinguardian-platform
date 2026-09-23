import uuid
from datetime import UTC, datetime
import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from app.db import Base
from app.models import CareSubject, Profile
from app.services import authorize_subject, create_family, grant_access


@pytest.mark.asyncio
async def test_subject_grant_allows_delegated_scope_only():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    sessions = async_sessionmaker(engine, expire_on_commit=False)
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    async with sessions() as session:
        coordinator = Profile(identity_subject="coordinator", display_name="Coordinator", timezone="America/Toronto")
        caregiver = Profile(identity_subject="caregiver", display_name="Caregiver", timezone="Asia/Kolkata")
        session.add_all([coordinator, caregiver])
        await session.flush()
        family = await create_family(session, coordinator.id, "Kumar family", "Asia/Kolkata")
        subject = CareSubject(family_id=family.id, preferred_timezone="Asia/Kolkata")
        session.add(subject)
        await session.flush()
        from app.models import Membership
        session.add(Membership(family_id=family.id, profile_id=caregiver.id, role="caregiver"))
        await grant_access(session, family.id, subject.id, coordinator.id, caregiver.id, {"checkins"}, None)
        await session.commit()
        allowed = await authorize_subject(session, family.id, subject.id, caregiver.id, "checkins", write=True)
        assert allowed.id == subject.id
    await engine.dispose()
