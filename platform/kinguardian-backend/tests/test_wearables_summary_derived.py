"""
Wearable Derived Summary Read Model Test Suite.

Verifies:
1. GET /subjects/{subject_id}/wearables/summary
2. Returns mobile-friendly derived information:
   - activity: { today, baseline, change_percent }
   - sleep: { duration_minutes, baseline_minutes }
   - resting_heart_rate: { value, baseline }
   - last_sync_at
3. Confirms that this is a derived read model, not raw vendor telemetry.
"""

import pytest
import uuid
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.services import WearableService
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    Consent,
    WearableConnection
)


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
async def test_wearable_derived_summary_endpoint(test_db_session: AsyncSession):
    session = test_db_session

    # 1. Setup Care Circle
    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_summary_01",
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

    parent_id = uuid.uuid4()
    parent = AppProfile(
        id=parent_id,
        iam_subject_id="iam_ramesh_summary_01",
        email="ramesh@chennai.in",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(parent)

    subject_id = uuid.uuid4()
    subject = CareSubject(
        id=subject_id,
        family_id=family.id,
        profile_id=parent_id,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(subject)

    # Add active Consent & WearableConnection
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=parent_id,
        grantee_profile_id=coordinator_id,
        consent_type="wearable_health_data",
        scope={"activity": True, "sleep": True, "heart_rate": True},
        status="active"
    )
    session.add(consent)

    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=coordinator_id,
        provider="apple_health",
        open_wearables_user_id=f"kinguardian_subject_{subject.id}",
        provider_user_id="apple_health_ramesh",
        connection_status="connected"
    )
    session.add(conn)
    await session.commit()

    # Override dependencies
    mock_gw = MockWearableDataGateway()
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: coordinator
    from app.domains.wearables.read_router import get_wearable_service
    app.dependency_overrides[get_wearable_service] = lambda: WearableService(session=session, gateway=mock_gw)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get(f"/api/v1/subjects/{subject.id}/wearables/summary")
        assert resp.status_code == 200, f"Error: status={resp.status_code} body={resp.text}"
        data = resp.json()


        # Validate Activity Derived Model
        assert "activity" in data
        assert isinstance(data["activity"]["today"], int)
        assert isinstance(data["activity"]["baseline"], int)
        assert isinstance(data["activity"]["change_percent"], int)
        assert data["activity"]["today"] > 0
        assert data["activity"]["baseline"] > 0

        # Validate Sleep Derived Model
        assert "sleep" in data
        assert isinstance(data["sleep"]["duration_minutes"], int)
        assert isinstance(data["sleep"]["baseline_minutes"], int)
        assert data["sleep"]["duration_minutes"] > 0

        # Validate Resting Heart Rate Derived Model
        assert "resting_heart_rate" in data
        assert isinstance(data["resting_heart_rate"]["value"], int)
        assert isinstance(data["resting_heart_rate"]["baseline"], int)
        assert data["resting_heart_rate"]["value"] > 0

        # Validate Last Sync Timestamp
        assert "last_sync_at" in data
        assert data["last_sync_at"] is not None

    app.dependency_overrides.clear()
