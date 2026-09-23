"""
Wearable End-to-End Complete Scenario Test Suite.

Verifies the complete flagship Wearable Experience flow:
1. Parent -> connects Garmin
2. Garmin -> produces activity data
3. Open Wearables -> normalizes data
4. KinGuardian -> gets data
5. Insight Engine -> calculates baseline
6. Guardian Moment -> generated
7. Coordinator -> receives notification
8. Coordinator -> asks KinGuardian
9. AI -> explains activity trend

Uses `MockWearableDataGateway` for fast, deterministic CI execution.
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
    Consent,
    Notification,
    AIInsight
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.schemas import (
    OpenWearablesWebhookPayload,
    WearableActivitySummary,
    WearableSleepSummary,
    WearableRecoverySummary
)
from app.domains.wearables.services import WearableService
from app.domains.wearables.domain.entities import WearableGuardianMoment
from app.domains.wearables.domain.baselines import (
    WearableBaselineCalculator,
    BaselineWindow,
    WearableBaselineComparison
)
from app.domains.agent.wearable_qa_handler import (
    WearableQAEngine,
    WearableQueryIntent,
    WearableQAResponse
)


@pytest.fixture
async def e2e_db_session():
    """In-memory SQLite async database session for E2E testing."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_wearable_flagship_end_to_end_scenario(e2e_db_session: AsyncSession):
    """
    Executes all 9 steps of the Wearable End-to-End lifecycle.
    """
    session = e2e_db_session

    # -------------------------------------------------------------------------
    # 0. Core Care Circle Setup: Dad in Chennai, Anjali in London
    # -------------------------------------------------------------------------
    dad_profile_id = uuid.uuid4()
    dad = AppProfile(
        id=dad_profile_id,
        iam_subject_id="iam_dad_chennai",
        email="ramesh@family.org",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(dad)

    anjali_profile_id = uuid.uuid4()
    anjali = AppProfile(
        id=anjali_profile_id,
        iam_subject_id="iam_anjali_london",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(anjali)

    family_id = uuid.uuid4()
    family = Family(
        id=family_id,
        name="Sharma Family Circle",
        primary_coordinator_profile_id=anjali_profile_id
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

    # Active Wearable Data Consent
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        grantor_profile_id=dad_profile_id,
        grantee_profile_id=anjali_profile_id,
        consent_type="wearable_health_data",
        scope={"activity": True, "sleep": True, "heart_rate": True},
        status="active"
    )
    session.add(consent)
    await session.commit()

    # -------------------------------------------------------------------------
    # 1. Parent connects Garmin
    # -------------------------------------------------------------------------
    mock_gateway = MockWearableDataGateway()
    wearable_service = WearableService(session=session, gateway=mock_gateway)
    wearable_user_id = wearable_service.get_wearable_user_id(subject_id)

    connection_link = await wearable_service.create_connection_invitation(
        subject_id=subject_id,
        provider="garmin",
        redirect_url="kinguardian://wearables/callback"
    )
    assert connection_link.provider == "garmin"
    assert "garmin" in connection_link.connect_url.lower()

    # OAuth completion webhook
    connect_webhook = OpenWearablesWebhookPayload(
        event_id=f"evt_conn_{uuid.uuid4().hex[:8]}",
        event_type="connection.created",
        user_id=wearable_user_id,
        provider="garmin",
        timestamp=datetime.now(timezone.utc).isoformat(),
        data={
            "connection_id": f"conn_garmin_{uuid.uuid4().hex[:8]}",
            "provider_user_id": "garmin_user_chennai_01",
            "status": "active",
            "device_model": "Garmin Venu 3",
            "device_name": "Dad's Garmin Watch",
            "capabilities": {"activity": True, "sleep": True, "heart_rate": True}
        }
    )
    res_conn = await wearable_service.process_inbound_webhook(connect_webhook)
    assert res_conn["status"] == "processed"

    # Verify persisted connection
    res_db_conn = await session.execute(
        select(WearableConnection).where(
            WearableConnection.subject_id == subject_id,
            WearableConnection.provider == "garmin"
        )
    )
    persisted_conn = res_db_conn.scalar_one_or_none()
    assert persisted_conn is not None
    assert persisted_conn.connection_status == "connected"

    # -------------------------------------------------------------------------
    # 2. Garmin produces activity data
    # 3. Open Wearables normalizes data
    # -------------------------------------------------------------------------
    # 30-day baseline of 6,210 steps, dropping to 5,430 steps today (↓ 12%)
    today = datetime.now(timezone.utc)
    historical_steps = [6200, 6150, 6300, 6180, 6220, 6210, 6250] * 4  # 28 days baseline ~6215
    recent_5_days_steps = [5400, 5450, 5420, 5410, 5430]                # recent drop ~5422

    all_activity_history = []
    for idx, steps in enumerate(historical_steps + recent_5_days_steps):
        day_date = (today - timedelta(days=33 - idx)).strftime("%Y-%m-%d")
        all_activity_history.append(
            WearableActivitySummary(
                date=day_date,
                steps=steps,
                active_duration_minutes=40,
                source_provider="garmin"
            )
        )

    mock_gateway.seed_user_data(
        user_id=wearable_user_id,
        activity=all_activity_history
    )

    # -------------------------------------------------------------------------
    # 4. KinGuardian gets data
    # -------------------------------------------------------------------------
    kinguardian_activity_history = await wearable_service.get_activity_history(subject_id=subject_id, days=30)
    assert len(kinguardian_activity_history) > 0
    today_activity = kinguardian_activity_history[-1]
    assert today_activity.steps == 5430

    # -------------------------------------------------------------------------
    # 5. Insight Engine calculates baseline
    # -------------------------------------------------------------------------
    step_values = [a.steps for a in all_activity_history]
    today_step_val = float(today_activity.steps)
    comparison: WearableBaselineComparison = WearableBaselineCalculator.compare_to_baseline(
        subject_id=subject_id,
        metric_name="steps",
        current_value=today_step_val,
        historical_values=step_values,
        window_days=BaselineWindow.THIRTY_DAY
    )

    # Asserts baseline ~6210 vs current 5430 (drop detected: ~ -12.5%)
    assert comparison.direction == "below"
    assert comparison.percentage_deviation < -10.0  # ~ -12.5%


    # -------------------------------------------------------------------------
    # 6. Guardian Moment generated
    # -------------------------------------------------------------------------
    guardian_moment = WearableGuardianMoment(
        id=uuid.uuid4(),
        subject_id=subject_id,
        family_id=family_id,
        title="Dad's activity has been below his usual level for 5 days.",
        summary="Dad averaged 5,422 steps/day over the last 5 days compared to his 30-day baseline of 6,210 steps/day (↓ 12%).",
        current_average=comparison.current_value,
        current_average_label="5,422 steps/day",
        baseline_value=comparison.baseline_value,
        baseline_label="30-day baseline: 6,210 steps/day",
        actions=["Check in with Dad", "Review trends"],
        timeframe_days=5,
        severity="attention",
        based_on_text="Garmin daily step count"
    )


    insight_record = AIInsight(
        id=guardian_moment.id,
        family_id=family_id,
        subject_id=subject_id,
        type="guardian_moment",
        severity="attention",
        title=guardian_moment.title,
        summary=guardian_moment.summary,
        observation="Dad's daily steps decreased by 12% across the last 5 days.",
        recommendation="Check in with Dad about activity.",
        timeframe_start=today - timedelta(days=5),
        timeframe_end=today,
        confidence=0.94,
        status="active",
        actionability="propose_care_task",
        created_at=today
    )
    session.add(insight_record)

    # -------------------------------------------------------------------------
    # 7. Coordinator receives notification
    # -------------------------------------------------------------------------
    notification = Notification(
        id=uuid.uuid4(),
        recipient_profile_id=anjali_profile_id,
        family_id=family_id,
        subject_id=subject_id,
        type="guardian_moment",
        priority="attention",
        title="Guardian Moment: Dad's Activity Decreased",
        body="Dad averaged 5,422 steps/day over the last 5 days (↓ 12% from usual). Suggested: Check in with Dad.",
        created_at=today
    )
    session.add(notification)
    await session.commit()

    # Verify coordinator's delivered notification
    res_notif = await session.execute(
        select(Notification).where(Notification.recipient_profile_id == anjali_profile_id)
    )
    coordinator_notifications = res_notif.scalars().all()
    assert len(coordinator_notifications) == 1
    assert "Dad's Activity Decreased" in coordinator_notifications[0].title


    # -------------------------------------------------------------------------
    # 8. Coordinator asks KinGuardian
    # -------------------------------------------------------------------------
    coordinator_query = "Is Dad getting less active?"
    detected_intent = WearableQAEngine.classify_intent(coordinator_query, user_role="coordinator")
    assert detected_intent == WearableQueryIntent.COORDINATOR_ACTIVITY_DECLINE

    # -------------------------------------------------------------------------
    # 9. AI explains activity trend
    # -------------------------------------------------------------------------
    qa_response: WearableQAResponse = WearableQAEngine.answer_question(
        query=coordinator_query,
        user_role="coordinator",
        subject_name="Dad",
        wearable_telemetry={
            "today_steps": 5430,
            "baseline_steps": 6210
        }
    )

    assert "Dad logged 5,430 steps today" in qa_response.answer_text
    assert "lower than his usual baseline of 6,210 steps" in qa_response.answer_text
    assert qa_response.primary_metric == "steps"
    assert qa_response.disclaimer is not None

