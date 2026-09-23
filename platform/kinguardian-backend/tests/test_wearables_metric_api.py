"""
Unified Wearable Metric API Test Suite.

Verifies:
1. GET /subjects/{subject_id}/wearables/metrics (Unified endpoint with metric, from, to)
2. Metric type filtering (e.g. metric=steps, metric=resting_heart_rate, metric=sleep_duration)
3. Provider and source filtering (provider=garmin)
4. Cursor-based pagination with limit and next_cursor
5. Contract compliance with KinGuardian WearableMetric domain models.
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
async def test_unified_wearable_metric_api_filters_and_cursor(test_db_session: AsyncSession):
    session = test_db_session

    # 1. Setup Care Circle
    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_metric_01",
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
        iam_subject_id="iam_ramesh_metric_01",
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

    # 2. Add active Consent & WearableConnection
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
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subject.id}",
        provider_user_id="garmin_user_9921",
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
        # ---------------------------------------------------------------------
        # 1. GET /subjects/{id}/wearables/metrics?metric=steps&from=2026-08-01&to=2026-08-22
        # ---------------------------------------------------------------------
        resp_steps = await client.get(
            f"/api/v1/subjects/{subject.id}/wearables/metrics",
            params={
                "metric": "steps",
                "from": "2026-08-01",
                "to": "2026-08-27"
            }
        )
        assert resp_steps.status_code == 200
        steps_data = resp_steps.json()
        assert "items" in steps_data
        assert len(steps_data["items"]) >= 1
        for item in steps_data["items"]:
            assert item["metric"] == "steps"
            assert item["unit"] == "steps"
            assert item["subject_id"] == str(subject.id)
            assert item["source_provider"] == "garmin"
            assert "measured_at" in item

        # ---------------------------------------------------------------------
        # 2. Filter by metric=resting_heart_rate & provider=garmin
        # ---------------------------------------------------------------------
        resp_hr = await client.get(
            f"/api/v1/subjects/{subject.id}/wearables/metrics",
            params={
                "metric": "resting_heart_rate",
                "provider": "garmin"
            }
        )
        assert resp_hr.status_code == 200
        hr_data = resp_hr.json()
        assert len(hr_data["items"]) >= 1
        for item in hr_data["items"]:
            assert item["metric"] == "resting_heart_rate"
            assert item["unit"] == "bpm"
            assert item["source_provider"] == "garmin"

        # ---------------------------------------------------------------------
        # 3. Cursor-based pagination (limit=5, next_cursor)
        # ---------------------------------------------------------------------
        resp_p1 = await client.get(
            f"/api/v1/subjects/{subject.id}/wearables/metrics",
            params={"limit": 5}
        )
        assert resp_p1.status_code == 200
        p1_data = resp_p1.json()
        assert len(p1_data["items"]) == 5
        assert p1_data["has_more"] is True
        assert p1_data["next_cursor"] is not None
        cursor_token = p1_data["next_cursor"]

        # Fetch page 2 using cursor
        resp_p2 = await client.get(
            f"/api/v1/subjects/{subject.id}/wearables/metrics",
            params={"limit": 5, "cursor": cursor_token}
        )
        assert resp_p2.status_code == 200
        p2_data = resp_p2.json()
        assert len(p2_data["items"]) == 5
        # Ensure page 2 items are distinct from page 1
        p1_times = [it["measured_at"] + it["metric"] for it in p1_data["items"]]
        p2_times = [it["measured_at"] + it["metric"] for it in p2_data["items"]]
        assert set(p1_times).isdisjoint(set(p2_times))

    app.dependency_overrides.clear()
