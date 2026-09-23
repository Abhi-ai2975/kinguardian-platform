"""
Wearable Connection Flow & Zero-Credential Architectural Test Suite.

Verifies:
1. Parent requests provider connection via KinGuardian API.
2. KinGuardian delegates to Open Wearables via WearableDataGateway.
3. Zero-Credential Invariant: Mobile app and KinGuardian NEVER touch or receive provider secrets (OAuth client secrets, passwords, vendor tokens).
4. Parent authenticates on Open Wearables hosted authorization screen.
5. Open Wearables webhook completes the connection -> KinGuardian updates WearableConnection & WearableDataSource.
6. Disconnect lifecycle.
"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    WearableConnection,
    WearableDataSource,
    Consent
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.schemas import OpenWearablesWebhookPayload
from app.domains.wearables.services import WearableService


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
async def test_connection_flow_zero_credential_boundary(test_db_session: AsyncSession):
    session = test_db_session

    # Setup parent profile & care subject
    parent_id = uuid.uuid4()
    parent = AppProfile(
        id=parent_id,
        iam_subject_id="iam_ramesh_001",
        email="ramesh@family.org",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(parent)

    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_001",
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
        profile_id=parent_id,
        membership_role="care_recipient",
        status="active"
    )
    session.add(membership)

    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=parent_id,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="Self",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(subject)

    # Active Consent for Wearable Health Data
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


    gateway = MockWearableDataGateway()
    service = WearableService(session=session, gateway=gateway)

    # -------------------------------------------------------------------------
    # STEP 1: Parent requests connection URL for Garmin
    # -------------------------------------------------------------------------
    connect_resp = await service.create_connection_invitation(
        subject_id=subject.id,
        provider="garmin",
        redirect_url="kinguardian://wearables/callback"
    )

    # ZERO-CREDENTIAL ASSERTIONS:
    # Verify response schema contains ONLY hosted link or SDK token, NO provider secrets
    resp_dict = connect_resp.model_dump()
    assert "connect_url" in resp_dict
    assert resp_dict["provider"] == "garmin"
    assert "client_secret" not in resp_dict
    assert "oauth_token_secret" not in resp_dict
    assert "api_key" not in resp_dict

    # Verify KinGuardian DB recorded pending state
    res_conn = await session.execute(
        select(WearableConnection).where(
            WearableConnection.subject_id == subject.id,
            WearableConnection.provider == "garmin"
        )
    )
    conn = res_conn.scalar_one()
    assert conn.connection_status == "pending"
    assert conn.open_wearables_user_id == f"kinguardian_subject_{subject.id}"

    # -------------------------------------------------------------------------
    # STEP 2: Parent authenticates provider on Open Wearables hosted screen
    # Open Wearables receives provider tokens & fires webhook callback to KinGuardian
    # -------------------------------------------------------------------------
    webhook_payload = OpenWearablesWebhookPayload(
        event_id=f"evt_{uuid.uuid4().hex[:12]}",
        event_type="connection:completed",
        timestamp=datetime.utcnow().isoformat() + "Z",
        user_id=f"kinguardian_subject_{subject.id}",
        provider="garmin",
        data={
            "provider_user_id": "garmin_ramesh_user_992",
            "device_name": "Garmin Venu 3",
            "device_id": "garmin_venu_sn_1029",
            "source_type": "smartwatch"
        }
    )

    webhook_res = await service.process_inbound_webhook(webhook_payload)
    assert webhook_res["status"] == "processed"

    # Verify Connection status in KinGuardian PostgreSQL is updated to "connected"
    res_conn_updated = await session.execute(
        select(WearableConnection).where(WearableConnection.id == conn.id)
    )
    conn_updated = res_conn_updated.scalar_one()
    assert conn_updated.connection_status == "connected"
    assert conn_updated.connected_at is not None
    assert conn_updated.provider_user_id == "garmin_ramesh_user_992"

    # Verify WearableDataSource is populated
    res_src = await session.execute(
        select(WearableDataSource).where(WearableDataSource.connection_id == conn.id)
    )
    data_source = res_src.scalar_one()
    assert data_source.device_name == "Garmin Venu 3"
    assert data_source.provider == "garmin"
    assert data_source.status == "active"

    # -------------------------------------------------------------------------
    # STEP 3: Disconnect flow
    # -------------------------------------------------------------------------
    disconnect_payload = OpenWearablesWebhookPayload(
        event_id=f"evt_{uuid.uuid4().hex[:12]}",
        event_type="connection:disconnected",
        timestamp=datetime.utcnow().isoformat() + "Z",
        user_id=f"kinguardian_subject_{subject.id}",
        provider="garmin",
        data={"reason": "user_revoked"}
    )
    await service.process_inbound_webhook(disconnect_payload)

    res_conn_disc = await session.execute(
        select(WearableConnection).where(WearableConnection.id == conn.id)
    )
    conn_disc = res_conn_disc.scalar_one()
    assert conn_disc.connection_status == "disconnected"
    assert conn_disc.disconnected_at is not None
