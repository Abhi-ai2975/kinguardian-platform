"""
Wearable Connection API & Lifecycle Test Suite.

Verifies:
1. POST /subjects/{subject_id}/wearables/connections (Create connection descriptor)
2. GET /subjects/{subject_id}/wearables/connections (List connections)
3. POST /wearables/connections/{id}/reconnect (Regenerate connection link)
4. POST /wearables/connections/{id}/disconnect (Revoke and disconnect device)
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
async def test_wearable_connection_api_endpoints_lifecycle(test_db_session: AsyncSession):
    session = test_db_session

    # 1. Setup Care Circle
    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_conn_01",
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
        iam_subject_id="iam_ramesh_conn_01",
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

    # 2. Add active Consent for Wearable Health Data
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
    await session.commit()

    # Override dependencies
    mock_gw = MockWearableDataGateway()
    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: coordinator
    from app.domains.wearables.read_router import get_wearable_service as get_read_service
    from app.domains.wearables.connection_router import get_wearable_service as get_conn_service
    app.dependency_overrides[get_read_service] = lambda: WearableService(session=session, gateway=mock_gw)
    app.dependency_overrides[get_conn_service] = lambda: WearableService(session=session, gateway=mock_gw)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # ---------------------------------------------------------------------
        # 1. POST /subjects/{subject_id}/wearables/connections
        # (Creates connection flow descriptor with ZERO credentials)
        # ---------------------------------------------------------------------
        create_resp = await client.post(
            f"/api/v1/subjects/{subject.id}/wearables/connections",
            json={
                "provider": "garmin",
                "redirect_url": "https://kinguardian.app/callback"
            }
        )
        assert create_resp.status_code == 201
        descriptor = create_resp.json()
        assert "connection_id" in descriptor
        assert descriptor["provider"] == "garmin"
        assert descriptor["status"] == "pending"
        assert "connection_url" in descriptor
        assert "openwearables" in descriptor["connection_url"] or "mock" in descriptor["connection_url"]
        connection_id = descriptor["connection_id"]

        # Verify ZERO credentials returned
        assert "client_secret" not in descriptor
        assert "password" not in descriptor
        assert "access_token" not in descriptor

        # ---------------------------------------------------------------------
        # 2. GET /subjects/{subject_id}/wearables/connections
        # ---------------------------------------------------------------------
        get_conns_resp = await client.get(f"/api/v1/subjects/{subject.id}/wearables/connections")
        assert get_conns_resp.status_code == 200
        conns_list = get_conns_resp.json()
        assert len(conns_list) >= 1

        # ---------------------------------------------------------------------
        # 3. POST /wearables/connections/{id}/reconnect
        # ---------------------------------------------------------------------
        reconnect_resp = await client.post(f"/api/v1/wearables/connections/{connection_id}/reconnect")
        assert reconnect_resp.status_code == 200
        reconnect_data = reconnect_resp.json()
        assert reconnect_data["connection_id"] == connection_id
        assert reconnect_data["provider"] == "garmin"
        assert reconnect_data["status"] == "pending"
        assert "connection_url" in reconnect_data

        # ---------------------------------------------------------------------
        # 4. POST /wearables/connections/{id}/disconnect
        # ---------------------------------------------------------------------
        disconnect_resp = await client.post(f"/api/v1/wearables/connections/{connection_id}/disconnect")
        assert disconnect_resp.status_code == 200
        disconnect_data = disconnect_resp.json()
        assert disconnect_data["connection_id"] == connection_id
        assert disconnect_data["provider"] == "garmin"
        assert disconnect_data["status"] == "disconnected"
        assert "disconnected_at" in disconnect_data

    app.dependency_overrides.clear()
