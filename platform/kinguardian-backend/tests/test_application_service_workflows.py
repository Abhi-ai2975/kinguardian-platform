"""
Application Service Tests for KinGuardian Platform:
1. Submit Check-in Workflow:
   Parent submits check-in -> check-in persisted -> domain event created -> coordinator notification created.
2. Medication Taken Workflow:
   Parent confirms medication -> adherence updated -> event created -> coordinator notification.
3. Guardian Moment Workflow:
   Health data changes -> baseline calculation -> insight created -> notification policy evaluation.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent,
    WellbeingCheckin,
    MedicationAdherenceEvent,
    AIInsight,
    Notification
)
from app.domains.events.models import EventLog
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.family.application.services import FamilyService
from app.domains.family.application.transaction_coordinator import TransactionCoordinatorService
from app.domains.events.services import EventService
from app.domains.notifications.services import NotificationService
from app.domains.insights.baseline import BaselineService, DataPoint
from app.domains.insights.strategies import BloodPressureTrendStrategy


@pytest.mark.application_service
@pytest.mark.asyncio
async def test_workflow_submit_checkin(db_session: AsyncSession):
    """
    Workflow 1: Submit Check-in
    Parent submits check-in
    -> check-in persisted
    -> domain event created
    -> coordinator notification created
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Profiles & Family Circle
    coord = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id="iam_coord_wf1",
        display_name="Anjali Coordinator",
        email="anjali.coord@example.com",
        timezone="Europe/London"
    )
    parent = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id="iam_parent_wf1",
        display_name="Ramesh Parent",
        email="ramesh.parent@example.com",
        timezone="Asia/Kolkata"
    )
    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=coord.id)
    db_session.add_all([coord, parent, family])
    await db_session.flush()

    m_coord = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=coord.id, membership_role="primary_coordinator")
    m_parent = FamilyMembership(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, membership_role="elder_parent")
    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="synth-pat-wf1", timezone="Asia/Kolkata")
    db_session.add_all([m_coord, m_parent, subject])
    await db_session.commit()

    # 2. Services
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_service = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_service)
    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_service
    )

    # 3. Parent submits check-in via FamilyService
    checkin_entity = await family_service.add_wellbeing_checkin(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        feeling="good",
        notes="Took morning walk in Chennai park. Energy level high.",
        severity="low"
    )
    assert checkin_entity is not None
    assert checkin_entity.feeling == "good"

    # -> Step A: Check-in persisted in PostgreSQL
    db_checkin = (await db_session.execute(
        select(WellbeingCheckin).where(WellbeingCheckin.id == checkin_entity.id)
    )).scalar_one_or_none()
    assert db_checkin is not None
    assert db_checkin.notes == "Took morning walk in Chennai park. Energy level high."

    # -> Step B: Domain event created in event_logs
    events = (await db_session.execute(
        select(EventLog).where(
            EventLog.family_id == family.id,
            EventLog.event_type == "wellbeing_checkin_submitted"
        )
    )).scalars().all()
    assert len(events) >= 1
    assert events[0].event_type == "wellbeing_checkin_submitted"

    # -> Step C: Coordinator notification created via policy rule
    dispatched = await notif_service.process_domain_event(
        event_type="wellbeing_checkin_submitted",
        family_id=family.id,
        subject_id=subject.id,
        payload={"feeling": "good", "notes": "Took morning walk in Chennai park."}
    )
    assert len(dispatched) >= 1
    notif = dispatched[0]
    assert notif.recipient_profile_id == coord.id
    assert notif.title == "Parent Check-in Received"
    assert "good" in notif.body



@pytest.mark.application_service
@pytest.mark.asyncio
async def test_workflow_medication_taken(db_session: AsyncSession):
    """
    Workflow 2: Medication Taken
    Parent confirms medication
    -> adherence updated
    -> event created
    -> coordinator notification
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Actors & Family Circle
    coord = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_coord_wf2", display_name="Anjali", email="anjali.wf2@example.com", timezone="Europe/London")
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_parent_wf2", display_name="Ramesh", email="ramesh.wf2@example.com", timezone="Asia/Kolkata")
    family = Family(id=uuid.uuid4(), name="Sharma Medication Circle", primary_coordinator_profile_id=coord.id)
    db_session.add_all([coord, parent, family])
    await db_session.flush()

    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="synth-pat-wf2", timezone="Asia/Kolkata")
    db_session.add(subject)
    await db_session.commit()

    # 2. Transaction Coordinator Service executes atomic transaction
    coordinator_svc = TransactionCoordinatorService(db_session)
    event_id = uuid.uuid4()
    scheduled_at = now - timedelta(minutes=15)

    # -> Step A & B: Adherence updated & Outbox / Health event created atomically
    adherence, outbox_event = await coordinator_svc.confirm_parent_medication(
        adherence_id=event_id,
        subject_id=subject.id,
        family_id=family.id,
        actor_id=parent.id,
        medication_name="Synthetic Metformin 500mg",
        dosage="500mg",
        scheduled_at=scheduled_at
    )

    assert adherence.status == "taken"
    assert adherence.confirmed_at is not None
    assert adherence.confirmed_by_profile_id == parent.id

    # Verify event_log created in DB
    event_logs = (await db_session.execute(
        select(EventLog).where(
            EventLog.family_id == family.id,
            EventLog.aggregate_type == "MedicationAdherenceEvent"
        )
    )).scalars().all()
    assert len(event_logs) >= 1
    assert event_logs[0].event_type == "medication.confirmed"

    # -> Step C: Asynchronous Post-commit Notification Execution
    async_res = await coordinator_svc.execute_asynchronous_medication_workflow(outbox_event)
    assert async_res["outbox_status"] == "published"

    # Verify coordinator notification persisted
    notifs = (await db_session.execute(
        select(Notification).where(
            Notification.family_id == family.id,
            Notification.type == "medication_taken"
        )
    )).scalars().all()
    assert len(notifs) >= 1
    assert "Metformin" in notifs[0].title or "Metformin" in notifs[0].body


@pytest.mark.application_service
@pytest.mark.asyncio
async def test_workflow_guardian_moment(db_session: AsyncSession):
    """
    Workflow 3: Guardian Moment
    Health data changes
    -> baseline calculation
    -> insight created
    -> notification policy evaluation
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Actors & Family Circle
    coord = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_coord_wf3", display_name="Anjali", email="anjali.wf3@example.com", timezone="Europe/London")
    parent = AppProfile(id=uuid.uuid4(), iam_subject_id="iam_parent_wf3", display_name="Ramesh", email="ramesh.wf3@example.com", timezone="Asia/Kolkata")
    family = Family(id=uuid.uuid4(), name="Sharma Guardian Circle", primary_coordinator_profile_id=coord.id)
    db_session.add_all([coord, parent, family])
    await db_session.flush()

    subject = CareSubject(id=uuid.uuid4(), family_id=family.id, profile_id=parent.id, fhir_patient_id="synth-pat-wf3", timezone="Asia/Kolkata")
    db_session.add(subject)
    await db_session.commit()

    # -> Step A: Health Data Changes & Multi-Window Baseline Calculation
    baseline_svc = BaselineService()
    observations = [
        DataPoint(timestamp=now - timedelta(days=13 - i), value=142.0 + (i * 2.0))
        for i in range(14)
    ]
    baselines = baseline_svc.calculate_multi_window_baselines("blood_pressure_systolic", observations)
    assert baselines["14_day"].sample_count == 14
    assert baselines["14_day"].trend_direction == "increasing"

    # -> Step B: Insight Created via Strategy / Engine
    bp_strat = BloodPressureTrendStrategy()
    bp_obs = [
        {"code": "blood_pressure", "value": 142.0 + (i * 2.0), "date": (now - timedelta(days=13 - i)).isoformat()}
        for i in range(14)
    ]
    detection = await bp_strat.analyze(subject.id, family.id, bp_obs)
    assert detection is not None
    assert detection.detected is True


    insight = AIInsight(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        type="vitals_trend",
        title=detection.title,
        summary=detection.summary,
        observation=detection.observation,
        confidence=0.96,
        timeframe_start=now - timedelta(days=14),
        timeframe_end=now,
        status="active"
    )

    db_session.add(insight)
    await db_session.commit()

    db_insight = (await db_session.execute(
        select(AIInsight).where(AIInsight.id == insight.id)
    )).scalar_one_or_none()
    assert db_insight is not None
    assert db_insight.type == "vitals_trend"

    # -> Step C: Notification Policy Evaluation via NotificationService
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    event_service = EventService(db_session)
    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_service
    )

    dispatched = await notif_service.process_domain_event(
        event_type="guardian_moment_created",
        family_id=family.id,
        subject_id=subject.id,
        payload={"moment_title": detection.title, "severity": "warning", "summary": detection.summary}
    )
    assert len(dispatched) >= 1
    assert dispatched[0].recipient_profile_id == coord.id
    assert "Guardian" in dispatched[0].title or "Alert" in dispatched[0].title
