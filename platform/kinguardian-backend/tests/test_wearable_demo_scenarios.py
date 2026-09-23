"""
Wearable Demo Scenarios Comprehensive Test Suite.

Verifies that all 6 canonical demo scenarios exercise actual backend workflows:

1. #Normal (Activity near baseline)
2. #Reduced activity (5-day decline)
3. #Reduced sleep (Sleep below baseline)
4. #Data unavailable (Device disconnected)
5. #Multiple sources (Garmin + Apple Health)
6. #New device (Parent connects wearable)
"""

import pytest
import uuid
from datetime import datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    CareSubject,
    Consent
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.scenarios import (
    WearableDemoScenarioType,
    WearableScenarioExecutionResult,
    WearableDemoScenarioEngine
)


@pytest.fixture
async def demo_db_session():
    """In-memory SQLite async database session for demo scenarios testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.fixture
async def setup_care_circle(demo_db_session: AsyncSession):
    session = demo_db_session

    dad_id = uuid.uuid4()
    dad = AppProfile(
        id=dad_id,
        iam_subject_id="iam_dad_demo",
        email="dad@family.org",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(dad)

    anjali_id = uuid.uuid4()
    anjali = AppProfile(
        id=anjali_id,
        iam_subject_id="iam_anjali_demo",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(anjali)

    family_id = uuid.uuid4()
    family = Family(id=family_id, name="Sharma Care Circle", primary_coordinator_profile_id=anjali_id)
    session.add(family)

    subject_id = uuid.uuid4()
    subject = CareSubject(
        id=subject_id,
        family_id=family_id,
        profile_id=dad_id,
        fhir_patient_id="pat_demo_01",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(subject)

    consent = Consent(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=dad_id,
        grantee_profile_id=anjali_id,
        consent_type="wearable_health_data",
        scope={"activity": True, "sleep": True, "heart_rate": True},
        status="active"
    )
    session.add(consent)
    await session.commit()

    return {"subject_id": subject_id, "family_id": family_id, "dad_id": dad_id, "anjali_id": anjali_id}


@pytest.mark.asyncio
async def test_demo_scenario_1_normal(demo_db_session: AsyncSession, setup_care_circle: dict):
    """
    #Normal: Activity near baseline (5,840 steps, sleep 7h 20m). No false alerts.
    """
    subject_id = setup_care_circle["subject_id"]
    gateway = MockWearableDataGateway()

    result: WearableScenarioExecutionResult = await WearableDemoScenarioEngine.run_normal_scenario(
        session=demo_db_session,
        subject_id=subject_id,
        gateway=gateway
    )

    assert result.scenario == WearableDemoScenarioType.NORMAL
    assert result.status == "completed"
    assert result.guardian_moment_generated is False
    assert result.data_points["steps"] == 5840
    assert "Doing well" in result.headline


@pytest.mark.asyncio
async def test_demo_scenario_2_reduced_activity(demo_db_session: AsyncSession, setup_care_circle: dict):
    """
    #Reduced activity: 5-day decline triggers Guardian Moment and suggested action.
    """
    subject_id = setup_care_circle["subject_id"]
    gateway = MockWearableDataGateway()

    result: WearableScenarioExecutionResult = await WearableDemoScenarioEngine.run_reduced_activity_scenario(
        session=demo_db_session,
        subject_id=subject_id,
        gateway=gateway
    )

    assert result.scenario == WearableDemoScenarioType.REDUCED_ACTIVITY
    assert result.status == "completed"
    assert result.guardian_moment_generated is True
    assert result.guardian_moment is not None
    assert "Dad's activity has decreased" in result.guardian_moment["title"]
    assert result.notification_dispatched is True


@pytest.mark.asyncio
async def test_demo_scenario_3_reduced_sleep(demo_db_session: AsyncSession, setup_care_circle: dict):
    """
    #Reduced sleep: Sleep below baseline (5h 30m) triggers sleep disruption insight.
    """
    subject_id = setup_care_circle["subject_id"]
    gateway = MockWearableDataGateway()

    result: WearableScenarioExecutionResult = await WearableDemoScenarioEngine.run_reduced_sleep_scenario(
        session=demo_db_session,
        subject_id=subject_id,
        gateway=gateway
    )

    assert result.scenario == WearableDemoScenarioType.REDUCED_SLEEP
    assert result.status == "completed"
    assert result.guardian_moment_generated is True
    assert "Dad's sleep has been shorter" in result.guardian_moment["title"]
    assert result.notification_dispatched is True


@pytest.mark.asyncio
async def test_demo_scenario_4_data_unavailable(demo_db_session: AsyncSession, setup_care_circle: dict):
    """
    #Data unavailable: Disconnected device delivers reassuring message and suppresses false alarms.
    """
    subject_id = setup_care_circle["subject_id"]
    gateway = MockWearableDataGateway()

    result: WearableScenarioExecutionResult = await WearableDemoScenarioEngine.run_data_unavailable_scenario(
        session=demo_db_session,
        subject_id=subject_id,
        gateway=gateway
    )

    assert result.scenario == WearableDemoScenarioType.DATA_UNAVAILABLE
    assert result.guardian_moment_generated is False
    assert "Your connection is still intact" in result.headline
    assert result.data_points["false_alarms_suppressed"] is True


@pytest.mark.asyncio
async def test_demo_scenario_5_multiple_sources(demo_db_session: AsyncSession, setup_care_circle: dict):
    """
    #Multiple sources: Synthesizes Garmin + Apple Health with zero double-counting.
    """
    subject_id = setup_care_circle["subject_id"]
    gateway = MockWearableDataGateway()

    result: WearableScenarioExecutionResult = await WearableDemoScenarioEngine.run_multiple_sources_scenario(
        session=demo_db_session,
        subject_id=subject_id,
        gateway=gateway
    )

    assert result.scenario == WearableDemoScenarioType.MULTIPLE_SOURCES
    assert result.status == "completed"
    assert "zero double counting" in result.headline
    assert result.data_points["active_devices"] == ["Garmin", "Apple Health"]


@pytest.mark.asyncio
async def test_demo_scenario_6_new_device(demo_db_session: AsyncSession, setup_care_circle: dict):
    """
    #New device: Connects a new wearable with zero-credential invitation and webhook processing.
    """
    subject_id = setup_care_circle["subject_id"]
    gateway = MockWearableDataGateway()

    result: WearableScenarioExecutionResult = await WearableDemoScenarioEngine.run_new_device_scenario(
        session=demo_db_session,
        subject_id=subject_id,
        gateway=gateway,
        provider="garmin"
    )

    assert result.scenario == WearableDemoScenarioType.NEW_DEVICE
    assert result.status == "completed"
    assert "Successfully connected" in result.headline
    assert result.data_points["status"] == "connected"
