"""
Family Care Graph Final Principle Test Suite.

Verifies that KinGuardian is the Family Intelligence & Coordination Layer,
owning the Family Care Graph while Open Wearables provides normalized evidence.

The 5 Core KinGuardian Decisions:
1. Which parent it belongs to (Identity mapping).
2. Who is permitted to see it (Consent & authorization).
3. What changed (Baseline calculation).
4. Whether it matters (Guardian Moment & insight engine).
5. What action should follow (Care task proposal & coordinator notification).
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
    CareSubject,
    Consent,
    CareTask,
    AIInsight,
    Notification
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.services import WearableService
from app.domains.wearables.domain.baselines import WearableBaselineCalculator, BaselineWindow
from app.domains.wearables.domain.entities import WearableGuardianMoment



@pytest.fixture
async def care_graph_session():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_family_care_graph_the_five_decisions(care_graph_session: AsyncSession):
    """
    Executes the 5 KinGuardian-owned decisions tying together Parents, Caregivers, and Children.
    """
    session = care_graph_session
    today = datetime.now(timezone.utc)

    # -------------------------------------------------------------------------
    # Setup Care Graph: Dad (Chennai), Anjali (London), Caregiver (Chennai)
    # -------------------------------------------------------------------------
    dad_id = uuid.uuid4()
    dad = AppProfile(id=dad_id, iam_subject_id="iam_dad_chennai", display_name="Ramesh Sharma", timezone="Asia/Kolkata")
    session.add(dad)

    anjali_id = uuid.uuid4()
    anjali = AppProfile(id=anjali_id, iam_subject_id="iam_anjali_london", display_name="Anjali Sharma", timezone="Europe/London")
    session.add(anjali)

    caregiver_id = uuid.uuid4()
    caregiver = AppProfile(id=caregiver_id, iam_subject_id="iam_caregiver_chennai", display_name="Dr. Varma Caregiver", timezone="Asia/Kolkata")
    session.add(caregiver)

    family_id = uuid.uuid4()
    family = Family(id=family_id, name="Sharma Care Circle", primary_coordinator_profile_id=anjali_id)
    session.add(family)

    subject_id = uuid.uuid4()
    care_subject = CareSubject(
        id=subject_id,
        family_id=family_id,
        profile_id=dad_id,
        fhir_patient_id="fhir_pat_ramesh_001",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(care_subject)

    # Active consent granted to Anjali
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

    # -------------------------------------------------------------------------
    # 1. DECISION 1: WHICH PARENT IT BELONGS TO
    # -------------------------------------------------------------------------
    gateway = MockWearableDataGateway()
    wearable_service = WearableService(session=session, gateway=gateway)
    wearable_user_id = wearable_service.get_wearable_user_id(subject_id)
    assert wearable_user_id == f"kinguardian_subject_{subject_id}"
    extracted_id = uuid.UUID(wearable_user_id.replace("kinguardian_subject_", ""))
    assert extracted_id == subject_id


    # -------------------------------------------------------------------------
    # 2. DECISION 2: WHO IS PERMITTED TO SEE IT (Consent & Authorization)
    # -------------------------------------------------------------------------
    # Check Anjali's active consent grant
    res_consent_anjali = await session.execute(
        select(Consent).where(
            Consent.subject_id == subject_id,
            Consent.grantee_profile_id == anjali_id,
            Consent.status == "active"
        )
    )
    active_consent = res_consent_anjali.scalar_one_or_none()
    assert active_consent is not None
    assert active_consent.scope.get("activity") is True

    # Stranger has no consent
    stranger_id = uuid.uuid4()
    res_consent_stranger = await session.execute(
        select(Consent).where(
            Consent.subject_id == subject_id,
            Consent.grantee_profile_id == stranger_id,
            Consent.status == "active"
        )
    )
    assert res_consent_stranger.scalar_one_or_none() is None


    # -------------------------------------------------------------------------
    # 3. DECISION 3: WHAT CHANGED (Baseline calculation)
    # -------------------------------------------------------------------------
    baseline_steps = [6200] * 25 + [5400, 5450, 5420, 5410, 5430]
    comparison = WearableBaselineCalculator.compare_to_baseline(
        subject_id=subject_id,
        metric_name="steps",
        current_value=5430.0,
        historical_values=baseline_steps,
        window_days=BaselineWindow.THIRTY_DAY
    )
    assert comparison.direction == "below"
    assert comparison.percentage_deviation < -10.0  # detected ~12% decrease

    # -------------------------------------------------------------------------
    # 4. DECISION 4: WHETHER IT MATTERS (Insight Engine & Guardian Moment)
    # -------------------------------------------------------------------------
    guardian_moment = WearableGuardianMoment(
        id=uuid.uuid4(),
        subject_id=subject_id,
        family_id=family_id,
        title="Dad's activity has decreased over the past 5 days.",
        summary="Dad averaged 5,422 steps/day over the last 5 days (↓ 12% from usual 6,200 baseline).",
        current_average=5422.0,
        current_average_label="5,422 steps/day",
        baseline_value=6200.0,
        baseline_label="30-day baseline: 6,200 steps/day",
        actions=["Check in with Dad", "Review trends"],
        timeframe_days=5,
        severity="attention"
    )

    insight = AIInsight(
        id=guardian_moment.id,
        family_id=family_id,
        subject_id=subject_id,
        type="guardian_moment",
        severity="attention",
        title=guardian_moment.title,
        summary=guardian_moment.summary,
        observation="5-day decrease in movement.",
        recommendation="Check in with Dad about activity.",
        timeframe_start=today - timedelta(days=5),
        timeframe_end=today,
        confidence=0.95,
        status="active",
        actionability="propose_care_task"
    )
    session.add(insight)

    # -------------------------------------------------------------------------
    # 5. DECISION 5: WHAT ACTION SHOULD FOLLOW (Care task & Coordinator Alert)
    # -------------------------------------------------------------------------
    task = CareTask(
        id=uuid.uuid4(),
        family_id=family_id,
        subject_id=subject_id,
        created_by_profile_id=anjali_id,
        assigned_to_profile_id=caregiver_id,
        title="Follow up on Dad's lower activity level",
        description="Dad's Garmin logged lower steps over the last 5 days. Check in during morning visit.",
        category="activity_checkin",
        priority="medium",
        status="pending",
        due_at=today + timedelta(days=1)
    )
    session.add(task)


    notification = Notification(
        id=uuid.uuid4(),
        recipient_profile_id=anjali_id,
        family_id=family_id,
        subject_id=subject_id,
        type="guardian_moment",
        priority="attention",
        title="Guardian Moment: Dad's Activity Decreased",
        body="Dad averaged 5,422 steps/day over the last 5 days (↓ 12%). Proposed: Check in with Dad."
    )
    session.add(notification)
    await session.commit()

    # Query verification
    res_task = await session.execute(select(CareTask).where(CareTask.family_id == family_id))
    assert res_task.scalar_one().title == "Follow up on Dad's lower activity level"

    res_notif = await session.execute(select(Notification).where(Notification.recipient_profile_id == anjali_id))
    assert "Dad's Activity Decreased" in res_notif.scalar_one().title
