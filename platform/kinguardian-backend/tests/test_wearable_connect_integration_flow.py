"""
Wearable Full Lifecycle Integration Test Suite.

Verifies the complete 3-phase integration lifecycle:

#Connect:
KinGuardian
→ Open Wearables
→ connection link
→ callback / webhook
→ connection persisted

#Sync:
Open Wearables
→ data retrieved
→ normalized
→ available through KinGuardian

#Disconnect:
KinGuardian
→ disconnect
→ connection status updated
→ access revoked
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
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
from app.domains.wearables.schemas import (
    OpenWearablesWebhookPayload,
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary
)
from app.domains.wearables.services import WearableService


@pytest.fixture
async def integration_db_session():
    """In-memory SQLite async database session for integration testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_full_lifecycle_connect_sync_disconnect(integration_db_session: AsyncSession):
    """
    Executes the entire 3-stage Wearable Integration Lifecycle:
    #Connect -> #Sync -> #Disconnect
    """
    session = integration_db_session

    # -------------------------------------------------------------------------
    # SETUP: Ramesh Sharma (Care Subject in Chennai) & Anjali (Coordinator in London)
    # -------------------------------------------------------------------------
    dad_profile_id = uuid.uuid4()
    dad_profile = AppProfile(
        id=dad_profile_id,
        iam_subject_id="iam_ramesh_chennai",
        email="ramesh@family.org",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(dad_profile)

    coordinator_id = uuid.uuid4()
    coordinator_profile = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_london",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(coordinator_profile)

    family_id = uuid.uuid4()
    family = Family(
        id=family_id,
        name="Sharma Family Circle",
        primary_coordinator_profile_id=coordinator_id
    )
    session.add(family)

    subject_id = uuid.uuid4()
    care_subject = CareSubject(
        id=subject_id,
        family_id=family_id,
        profile_id=dad_profile_id,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(care_subject)

    # Active Wearable Data Consent Grant
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=dad_profile_id,
        grantee_profile_id=coordinator_id,
        consent_type="wearable_health_data",
        scope={"activity": True, "sleep": True, "heart_rate": True},
        status="active"
    )
    session.add(consent)
    await session.commit()

    mock_gateway = MockWearableDataGateway()
    wearable_service = WearableService(session=session, gateway=mock_gateway)
    wearable_user_id = wearable_service.get_wearable_user_id(subject_id)

    # =========================================================================
    # 1. #Connect: KinGuardian -> Open Wearables -> link -> callback -> persisted
    # =========================================================================
    # a. Request Connection Link
    connection_invitation = await wearable_service.create_connection_invitation(
        subject_id=subject_id,
        provider="garmin",
        redirect_url="kinguardian://wearables/callback"
    )
    assert connection_invitation.provider == "garmin"
    assert connection_invitation.connect_url is not None

    # b. Verify initial pending record in KinGuardian DB
    res_pending = await session.execute(
        select(WearableConnection).where(
            WearableConnection.subject_id == subject_id,
            WearableConnection.provider == "garmin"
        )
    )
    pending_conn = res_pending.scalar_one_or_none()
    assert pending_conn is not None
    assert pending_conn.connection_status == "pending"

    # c. Upstream OAuth Callback Webhook from Open Wearables
    callback_webhook = OpenWearablesWebhookPayload(
        event_id=f"evt_cb_{uuid.uuid4().hex[:12]}",
        event_type="connection.created",
        user_id=wearable_user_id,
        provider="garmin",
        timestamp=datetime.now(timezone.utc).isoformat(),
        data={
            "connection_id": f"conn_garmin_{uuid.uuid4().hex[:8]}",
            "provider_user_id": "garmin_usr_99812",
            "status": "active",
            "device_model": "Garmin Venu 3",
            "device_name": "Dad's Garmin Watch",
            "capabilities": {"activity": True, "sleep": True, "heart_rate": True}
        }
    )
    webhook_result = await wearable_service.process_inbound_webhook(callback_webhook)
    assert webhook_result["status"] == "processed"

    # d. Assert Connection Persisted in DB as connected
    res_active = await session.execute(
        select(WearableConnection).where(
            WearableConnection.subject_id == subject_id,
            WearableConnection.provider == "garmin"
        )
    )
    active_conn = res_active.scalar_one_or_none()
    assert active_conn is not None
    assert active_conn.connection_status == "connected"
    assert active_conn.provider_user_id == "garmin_usr_99812"

    # =========================================================================
    # 2. #Sync: Open Wearables -> data retrieved -> normalized -> available through KinGuardian
    # =========================================================================
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    mock_gateway.seed_user_data(
        user_id=wearable_user_id,
        activity=[
            WearableActivitySummary(
                date=today_str,
                steps=5430,
                active_duration_minutes=42,
                source_provider="garmin"
            )
        ],
        sleep=[
            WearableSleepSummary(
                date=today_str,
                total_sleep_minutes=402,  # 6h 42m
                sleep_score=82,
                source_provider="garmin"
            )
        ],
        recovery=[
            WearableRecoverySummary(
                date=today_str,
                resting_heart_rate_bpm=64,
                hrv_ms=48.0,
                spo2_percentage=98.0,
                source_provider="garmin"
            )
        ]
    )

    # Ingest Sync Telemetry Webhook
    sync_webhook = OpenWearablesWebhookPayload(
        event_id=f"evt_sync_{uuid.uuid4().hex[:12]}",
        event_type="data.synced",
        user_id=wearable_user_id,
        provider="garmin",
        timestamp=datetime.now(timezone.utc).isoformat(),
        data={
            "metrics": {
                "steps": 5430,
                "sleep_minutes": 402,
                "resting_heart_rate": 64
            }
        }
    )
    sync_result = await wearable_service.process_inbound_webhook(sync_webhook)
    assert sync_result["status"] == "processed"

    # Query normalized telemetry through KinGuardian API
    dashboard = await wearable_service.get_wearable_dashboard(subject_id=subject_id)
    assert dashboard is not None
    assert dashboard.latest_activity is not None
    assert dashboard.latest_activity.steps == 5430
    assert dashboard.latest_sleep is not None
    assert dashboard.latest_sleep.total_sleep_minutes == 402
    assert dashboard.latest_recovery is not None
    assert dashboard.latest_recovery.resting_heart_rate_bpm == 64

    # =========================================================================
    # 3. #Disconnect: KinGuardian -> disconnect -> status updated -> access revoked
    # =========================================================================
    disconnect_res = await wearable_service.disconnect_connection_by_id(connection_id=active_conn.id)
    assert disconnect_res.status == "disconnected"
    assert disconnect_res.connection_id == active_conn.id

    # Verify status updated in PostgreSQL
    res_disconnected = await session.execute(
        select(WearableConnection).where(WearableConnection.id == active_conn.id)
    )
    disc_conn = res_disconnected.scalar_one_or_none()
    assert disc_conn is not None
    assert disc_conn.connection_status == "disconnected"
    assert disc_conn.disconnected_at is not None
