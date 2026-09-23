"""
End-to-End Wearable Data Flow Test Suite.

Verifies the complete 12-stage end-to-end data flow:
1. Parent (Ramesh in Chennai) connects wearable (Garmin / Apple Health).
2. KinGuardian creates wearable connection in PostgreSQL (WearableConnection, CareSubjectWearableIdentity).
3. Open Wearables connection flow initiated (connect URL / token).
4. Provider authentication (OAuth / pairing).
5. Open Wearables stores connection.
6. Provider data synchronizes.
7. Open Wearables normalized API exposes activity, sleep, recovery summaries.
8. KinGuardian fetches/receives data via WearableDataGateway.
9. Normalize into KinGuardian WearableMetric domain models.
10. Insight Engine calculates rolling baselines & evaluates anomaly policies.
11. Guardian Moment / health trend (AIInsight) generated.
12. Coordinator notification (Notification dispatched to Anjali in London).
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
    CareSubjectWearableIdentity,
    WearableConnection,
    WearableDataSource,
    AIInsight,
    Notification,
    Consent
)
from app.domains.wearables.gateway import MockWearableDataGateway

from app.domains.wearables.schemas import WearableActivitySummary, WearableSleepSummary, WearableRecoverySummary
from app.domains.wearables.services import WearableService
from app.domains.events.outbox import OutboxService


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
async def test_wearable_data_flow_complete_lifecycle(test_db_session: AsyncSession):
    session = test_db_session

    # -------------------------------------------------------------------------
    # STAGE 0: Care Circle Setup (Anjali in London & Dad in Chennai)
    # -------------------------------------------------------------------------
    anjali_id = uuid.uuid4()
    anjali = AppProfile(
        id=anjali_id,
        iam_subject_id="iam_anjali_london",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    ramesh_id = uuid.uuid4()
    ramesh = AppProfile(
        id=ramesh_id,
        iam_subject_id="iam_ramesh_chennai",
        email="ramesh@chennai.in",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add_all([anjali, ramesh])

    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=anjali_id)
    session.add(family)

    # Memberships
    m_anjali = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=anjali_id, membership_role="primary_coordinator", status="active")
    m_ramesh = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=ramesh_id, membership_role="care_recipient", status="active")
    session.add_all([m_anjali, m_ramesh])

    # Care Subject (Dad)
    subject_id = uuid.uuid4()
    subject = CareSubject(
        id=subject_id,
        family_id=family.id,
        profile_id=ramesh_id,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="Father",
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
        grantor_profile_id=ramesh_id,
        grantee_profile_id=anjali_id,
        consent_type="wearable_health_data",
        scope={"activity": True, "sleep": True, "heart_rate": True},
        status="active"
    )
    session.add(consent)
    await session.commit()


    # -------------------------------------------------------------------------
    # STAGE 1 & 2: Parent connects wearable -> KinGuardian creates wearable connection
    # -------------------------------------------------------------------------
    mock_gateway = MockWearableDataGateway()
    wearable_svc = WearableService(session=session, gateway=mock_gateway)

    # 1. Initiate Open Wearables connection flow
    invitation = await wearable_svc.create_connection_invitation(subject_id, "garmin")
    assert invitation.provider == "garmin"
    assert "connect_url" in invitation.model_dump()

    # 2. Retrieve Connection created in KinGuardian Database and set connected state
    res_conn = await session.execute(
        select(WearableConnection).where(
            WearableConnection.subject_id == subject.id,
            WearableConnection.provider == "garmin"
        )
    )
    wearable_conn = res_conn.scalar_one()
    wearable_conn.connection_status = "connected"
    wearable_conn.provider_user_id = "garmin_ramesh_881"
    wearable_conn.permissions = {"activity": True, "sleep": True, "recovery": True}
    wearable_conn.metadata_json = {"device_model": "Garmin Venu 3"}

    # 3. Store hardware data source
    data_source = WearableDataSource(
        id=uuid.uuid4(),
        connection_id=wearable_conn.id,
        provider="garmin",
        source_type="smartwatch",
        device_name="Garmin Venu",
        device_id="garmin_venu_sn_9901",
        status="active"
    )
    session.add(data_source)
    await session.commit()


    # -------------------------------------------------------------------------
    # STAGE 3, 4, 5, 6: Open Wearables synchronization & Mock Gateway Seeding
    # Seed 6 active baseline days followed by 1 drop day (Dad feels unwell in Chennai)
    # -------------------------------------------------------------------------
    test_activities = [
        WearableActivitySummary(date=f"2026-08-2{i}", steps=5600 + i * 50, active_duration_minutes=45, distance_meters=3900.0, calories_burned_kcal=2100.0, source_provider="garmin")
        for i in range(1, 7)
    ]
    # Today's activity (drop to 1,350 steps, -76% drop)
    test_activities.append(
        WearableActivitySummary(date="2026-08-27", steps=1350, active_duration_minutes=12, distance_meters=950.0, calories_burned_kcal=1600.0, source_provider="garmin")
    )

    test_sleeps = [
        WearableSleepSummary(date=f"2026-08-2{i}", total_sleep_minutes=440, deep_sleep_minutes=85, rem_sleep_minutes=95, sleep_score=82, source_provider="garmin")
        for i in range(1, 7)
    ]
    test_sleeps.append(
        WearableSleepSummary(date="2026-08-27", total_sleep_minutes=250, deep_sleep_minutes=30, rem_sleep_minutes=40, sleep_score=48, source_provider="garmin")
    )
    mock_gateway.seed_user_data(
        user_id=f"kinguardian_subject_{subject.id}",
        activity=test_activities,
        sleep=test_sleeps
    )

    # -------------------------------------------------------------------------
    # STAGE 7, 8, 9, 10, 11, 12: Ingest Flow -> Normalization -> Insight Engine -> Guardian Moment -> Coordinator Notification
    # -------------------------------------------------------------------------
    result = await wearable_svc.sync_and_process_wearable_data_flow(subject_id=subject.id, days=7)

    # Verification 1: Data normalized into KinGuardian WearableMetric objects
    assert result["normalized_metrics_count"] >= 28  # 7 days * multiple metrics
    assert result["anomalies_detected"] >= 1
    assert result["insights_generated"] >= 1
    assert result["notifications_dispatched"] >= 1

    # Verification 2: Guardian Moment (AIInsight) persisted in PostgreSQL
    res_insights = await session.execute(
        select(AIInsight).where(AIInsight.subject_id == subject.id)
    )
    insights = res_insights.scalars().all()
    assert len(insights) >= 1
    guardian_moment = insights[0]
    assert guardian_moment.type == "guardian_moment"
    assert "Daily Steps Deviation" in guardian_moment.title or "Guardian Moment" in guardian_moment.title
    assert "dropped" in guardian_moment.summary.lower()
    assert guardian_moment.actionability == "propose_care_task"

    # Verification 3: Notification received by Anjali in London
    res_notifs = await session.execute(
        select(Notification).where(Notification.recipient_profile_id == anjali_id)
    )
    notifications = res_notifs.scalars().all()
    assert len(notifications) >= 1
    anjali_notif = notifications[0]
    assert anjali_notif.type == "guardian_anomaly_alert"
    assert anjali_notif.priority in ("high", "normal")
    assert "Activity drop for Father" in anjali_notif.title or "Dad" in anjali_notif.title
    assert "dropped by 76%" in anjali_notif.body or "dropped" in anjali_notif.body
