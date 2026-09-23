"""
Wearable Read API & Pagination Test Suite.

Verifies:
1. GET /subjects/{subject_id}/wearables (Root subject overview)
2. GET /subjects/{subject_id}/wearables/connections (Active & available connections)
3. GET /subjects/{subject_id}/wearables/summary (Aggregated dashboard summary)
4. GET /subjects/{subject_id}/wearables/activity (Paginated time-series activity data)
5. GET /subjects/{subject_id}/wearables/sleep (Paginated time-series sleep architecture)
6. GET /subjects/{subject_id}/wearables/heart-rate (Paginated time-series recovery vitals)
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
async def test_wearable_read_api_endpoints_and_pagination(test_db_session: AsyncSession):
    session = test_db_session

    # 1. Setup Care Circle
    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_01",
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

    # Add active connection
    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=coordinator_id,
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subject.id}",
        provider_user_id="garmin_user_123",
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
        # 1. GET /subjects/{subject_id}/wearables
        # ---------------------------------------------------------------------
        resp_root = await client.get(f"/api/v1/subjects/{subject.id}/wearables")
        assert resp_root.status_code == 200
        root_data = resp_root.json()
        assert root_data["subject_id"] == str(subject.id)
        assert len(root_data["active_connections"]) >= 1
        assert "sync_status" in root_data

        # ---------------------------------------------------------------------
        # 2. GET /subjects/{subject_id}/wearables/connections
        # ---------------------------------------------------------------------
        resp_conns = await client.get(f"/api/v1/subjects/{subject.id}/wearables/connections")
        assert resp_conns.status_code == 200
        conns_data = resp_conns.json()
        assert len(conns_data) >= 1
        assert any(c["provider"] == "garmin" for c in conns_data)

        # ---------------------------------------------------------------------
        # 3. GET /subjects/{subject_id}/wearables/summary
        # Derived read model (activity, sleep, resting_heart_rate vs baselines)
        # ---------------------------------------------------------------------
        resp_summary = await client.get(f"/api/v1/subjects/{subject.id}/wearables/summary")
        assert resp_summary.status_code == 200
        summary_data = resp_summary.json()
        assert "activity" in summary_data
        assert "today" in summary_data["activity"]
        assert "baseline" in summary_data["activity"]
        assert "change_percent" in summary_data["activity"]
        assert "sleep" in summary_data
        assert "duration_minutes" in summary_data["sleep"]
        assert "baseline_minutes" in summary_data["sleep"]
        assert "resting_heart_rate" in summary_data
        assert "value" in summary_data["resting_heart_rate"]
        assert "baseline" in summary_data["resting_heart_rate"]
        assert "last_sync_at" in summary_data


        # ---------------------------------------------------------------------
        # 4. GET /subjects/{subject_id}/wearables/activity (Paginated)
        # ---------------------------------------------------------------------
        resp_act_p1 = await client.get(f"/api/v1/subjects/{subject.id}/wearables/activity?page=1&page_size=3")
        assert resp_act_p1.status_code == 200
        act_p1 = resp_act_p1.json()
        assert "items" in act_p1
        assert "pagination" in act_p1
        assert len(act_p1["items"]) <= 3
        assert act_p1["pagination"]["page"] == 1
        assert act_p1["pagination"]["page_size"] == 3
        assert act_p1["pagination"]["total_items"] >= 7
        assert act_p1["pagination"]["has_next"] is True
        assert act_p1["pagination"]["has_previous"] is False

        # Page 2
        resp_act_p2 = await client.get(f"/api/v1/subjects/{subject.id}/wearables/activity?page=2&page_size=3")
        assert resp_act_p2.status_code == 200
        act_p2 = resp_act_p2.json()
        assert act_p2["pagination"]["page"] == 2
        assert act_p2["pagination"]["has_previous"] is True

        # ---------------------------------------------------------------------
        # 5. GET /subjects/{subject_id}/wearables/sleep (Paginated)
        # ---------------------------------------------------------------------
        resp_sleep = await client.get(f"/api/v1/subjects/{subject.id}/wearables/sleep?page=1&page_size=4")
        assert resp_sleep.status_code == 200
        sleep_data = resp_sleep.json()
        assert "items" in sleep_data
        assert len(sleep_data["items"]) <= 4
        assert sleep_data["pagination"]["page"] == 1
        assert sleep_data["pagination"]["page_size"] == 4
        assert sleep_data["pagination"]["total_items"] >= 7

        # ---------------------------------------------------------------------
        # 6. GET /subjects/{subject_id}/wearables/heart-rate (Paginated)
        # ---------------------------------------------------------------------
        resp_hr = await client.get(f"/api/v1/subjects/{subject.id}/wearables/heart-rate?page=1&page_size=4")
        assert resp_hr.status_code == 200
        hr_data = resp_hr.json()
        assert "items" in hr_data
        assert len(hr_data["items"]) <= 4
        assert hr_data["pagination"]["page"] == 1
        assert hr_data["pagination"]["page_size"] == 4
        assert hr_data["pagination"]["total_items"] >= 7

    app.dependency_overrides.clear()
