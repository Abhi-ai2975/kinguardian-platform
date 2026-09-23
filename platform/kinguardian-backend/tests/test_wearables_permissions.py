"""
Wearable Permissions & Scopes Test Suite.

Verifies:
1. Granular permissions/scope storage on WearableConnection in PostgreSQL.
2. Example schema:
   {
     "activity": true,
     "sleep": true,
     "heart_rate": true,
     "workouts": true,
     "weight": false
   }
3. Clear, human-readable explanations of what data is shared under each scope.
4. Permissions update API & state synchronization.
"""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    WearableConnection
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.services import WearableService
from app.domains.wearables.schemas import WEARABLE_PERMISSION_METADATA


@pytest.fixture
async def test_db_session():
    """In-memory SQLite async test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_wearable_permissions_storage_and_explanations(test_db_session: AsyncSession):
    session = test_db_session

    # 1. Setup Care Circle
    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_london",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(coordinator)

    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=coordinator_id)
    session.add(family)

    membership = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=coordinator_id,
        membership_role="primary_coordinator",
        status="active"
    )
    session.add(membership)

    subject_id = uuid.uuid4()
    subject = CareSubject(
        id=subject_id,
        family_id=family.id,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(subject)

    # 2. Store specific permissions on WearableConnection
    initial_permissions = {
        "activity": True,
        "sleep": True,
        "heart_rate": True,
        "workouts": True,
        "weight": False,
        "blood_oxygen": True,
        "body_temperature": False,
        "stress": True
    }

    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=coordinator_id,
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subject.id}",
        provider_user_id="garmin_user_9921",
        connection_status="connected",
        permissions=initial_permissions
    )
    session.add(conn)
    await session.commit()

    # 3. Retrieve permissions via WearableService
    gateway = MockWearableDataGateway()
    service = WearableService(session=session, gateway=gateway)

    resp = await service.get_connection_permissions(subject_id=subject.id, provider_or_connection_id="garmin")
    assert resp.provider == "garmin"
    assert resp.permissions["activity"] is True
    assert resp.permissions["sleep"] is True
    assert resp.permissions["heart_rate"] is True
    assert resp.permissions["workouts"] is True
    assert resp.permissions["weight"] is False

    # 4. Verify UI explanations for what is being shared
    explanations = {exp.key: exp for exp in resp.permission_explanations}
    assert "activity" in explanations
    assert explanations["activity"].label == "Daily Activity & Movement"
    assert "steps" in explanations["activity"].data_types
    assert explanations["activity"].is_granted is True

    assert "sleep" in explanations
    assert explanations["sleep"].label == "Sleep Architecture & Quality"
    assert explanations["sleep"].is_granted is True

    assert "heart_rate" in explanations
    assert "HRV" in explanations["heart_rate"].description
    assert explanations["heart_rate"].is_granted is True

    assert "workouts" in explanations
    assert explanations["workouts"].is_granted is True

    assert "weight" in explanations
    assert explanations["weight"].is_granted is False
    assert "Body weight" in explanations["weight"].description

    # 5. Update permissions (e.g. user toggles weight=True, stress=False)
    updated_resp = await service.update_connection_permissions(
        subject_id=subject.id,
        provider_or_connection_id="garmin",
        permissions={"weight": True, "stress": False}
    )
    assert updated_resp.permissions["weight"] is True
    assert updated_resp.permissions["stress"] is False
    assert updated_resp.permissions["activity"] is True  # preserved

    # Verify persisted in database
    res_db = await session.execute(
        select(WearableConnection).where(WearableConnection.id == conn.id)
    )
    conn_db = res_db.scalar_one()
    assert conn_db.permissions["weight"] is True
    assert conn_db.permissions["stress"] is False
