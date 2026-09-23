import pytest
import uuid
from datetime import datetime, timedelta

from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.notifications.services import NotificationService
from app.domains.insights.strategies import (
    ActivityTrendStrategy,
    SleepTrendStrategy,
    BloodPressureTrendStrategy,
    WeightTrendStrategy,
    GlucoseTrendStrategy
)
from app.domains.insights.engine import InsightEngine


@pytest.mark.asyncio
async def test_all_five_trend_strategies_individually():
    """
    Verifies Strategy Pattern for all 5 metrics:
    1. ActivityTrendStrategy
    2. SleepTrendStrategy
    3. BloodPressureTrendStrategy
    4. WeightTrendStrategy
    5. GlucoseTrendStrategy
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # 1. Activity Trend Strategy (Low Activity < 3000 steps)
    act_strat = ActivityTrendStrategy()
    act_obs = [
        {"code": "steps", "value": 2200, "date": "2026-08-20"},
        {"code": "steps", "value": 2400, "date": "2026-08-21"},
        {"code": "steps", "value": 2100, "date": "2026-08-22"},
    ]
    act_res = await act_strat.analyze(subject_id, family_id, act_obs)
    assert act_res is not None
    assert act_res.detected is True
    assert act_res.metric_name == "activity"
    assert "activity has been below" in act_res.title or "Decreased Daily Physical Activity" in act_res.title
    assert act_res.severity == "warning"


    # 2. Sleep Trend Strategy (Short Sleep < 5.5 hours)
    sleep_strat = SleepTrendStrategy()
    sleep_obs = [
        {"code": "sleep_duration", "value": 4.8, "date": "2026-08-20"},
        {"code": "sleep_duration", "value": 5.0, "date": "2026-08-21"},
        {"code": "sleep_duration", "value": 4.5, "date": "2026-08-22"},
    ]
    sleep_res = await sleep_strat.analyze(subject_id, family_id, sleep_obs)
    assert sleep_res is not None
    assert sleep_res.detected is True
    assert sleep_res.metric_name == "sleep"
    assert "Persistent Short Sleep Duration" in sleep_res.title

    # 3. Blood Pressure Trend Strategy (Hypertensive systolic >= 140)
    bp_strat = BloodPressureTrendStrategy()
    bp_obs = [
        {"code": "blood_pressure", "value": "145/92", "date": "2026-08-20"},
        {"code": "blood_pressure", "value": "148/90", "date": "2026-08-21"},
        {"code": "blood_pressure", "value": "150/94", "date": "2026-08-22"},
    ]
    bp_res = await bp_strat.analyze(subject_id, family_id, bp_obs)
    assert bp_res is not None
    assert bp_res.detected is True
    assert bp_res.metric_name == "blood_pressure"
    assert "Elevated Systolic Blood Pressure Trend" in bp_res.title

    # 4. Weight Trend Strategy (Rapid Weight Increase >= 2.5 kg)
    weight_strat = WeightTrendStrategy()
    weight_obs = [
        {"code": "weight", "value": 70.0, "date": "2026-08-18"},
        {"code": "weight", "value": 71.2, "date": "2026-08-20"},
        {"code": "weight", "value": 73.0, "date": "2026-08-23"},
    ]
    weight_res = await weight_strat.analyze(subject_id, family_id, weight_obs)
    assert weight_res is not None
    assert weight_res.detected is True
    assert weight_res.metric_name == "weight"
    assert "Rapid Weight Increase Detected" in weight_res.title
    assert "+3.0 kg" in weight_res.summary

    # 5. Glucose Trend Strategy (Elevated glucose >= 160 mg/dL)
    glucose_strat = GlucoseTrendStrategy()
    glucose_obs = [
        {"code": "glucose", "value": 172, "date": "2026-08-20"},
        {"code": "glucose", "value": 168, "date": "2026-08-21"},
        {"code": "glucose", "value": 165, "date": "2026-08-22"},
    ]
    glucose_res = await glucose_strat.analyze(subject_id, family_id, glucose_obs)
    assert glucose_res is not None
    assert glucose_res.detected is True
    assert glucose_res.metric_name == "glucose"
    assert "Elevated Blood Glucose Trend" in glucose_res.title


@pytest.mark.asyncio
async def test_insight_engine_decoupled_flow_and_persistence(db_session):
    """
    Verifies the decoupled pipeline flow:
    Health data change
            ↓
    Trend analysis (InsightEngine with 5 strategies)
            ↓
    Insight generated
            ↓
    Insight persisted (ai_insights & ai_insight_sources)
            ↓
    Domain event emitted
            ↓
    Notification policy evaluates
            ↓
    Notification created
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_insight",
        email="coord_insight@kinguardian.com",
        display_name="Dr. Maya Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_insight",
        email="parent_insight@kinguardian.com",
        display_name="Thomas Senior",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coordinator.id, "Thomas Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-insight-100",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 1. Instantiate InsightEngine
    engine = InsightEngine(
        family_repo=family_repo,
        event_logger=event_logger
    )

    # Multi-metric observations: Blood pressure spikes + Short sleep
    observations = [
        {"code": "blood_pressure", "value": "146/94", "date": "2026-08-20"},
        {"code": "blood_pressure", "value": "144/92", "date": "2026-08-21"},
        {"code": "blood_pressure", "value": "148/95", "date": "2026-08-22"},
        {"code": "sleep_duration", "value": 4.5, "date": "2026-08-20"},
        {"code": "sleep_duration", "value": 4.8, "date": "2026-08-21"},
        {"code": "sleep_duration", "value": 5.0, "date": "2026-08-22"},
    ]

    # 2. Run InsightEngine: Analyzes trends and persists insights
    insights = await engine.analyze_and_generate_insights(
        subject_id=subject.id,
        family_id=family.id,
        observations=observations
    )

    # Assert 2 insights were generated and persisted
    assert len(insights) == 2
    titles = [i.title for i in insights]
    assert any("Blood Pressure" in t for t in titles)
    assert any("Sleep" in t for t in titles)

    # Verify insights in database
    persisted_insights = await family_repo.list_ai_insights(family.id, subject.id)
    assert len(persisted_insights) >= 2

    # Verify insight sources persisted
    for ins in insights:
        sources = await family_repo.list_ai_insight_sources(ins.id)
        assert len(sources) >= 1

    # 3. Verify Decoupled Notification Policy Pipeline:
    # Downstream NotificationService processes the emitted guardian_moment_created event
    notif_service = NotificationService(
        family_repo=family_repo,
        profile_repo=user_repo,
        event_logger=event_logger
    )

    for ins in insights:
        dispatched_notifs = await notif_service.process_domain_event(
            event_type="guardian_moment_created",
            family_id=family.id,
            subject_id=subject.id,
            payload={
                "insight_id": str(ins.id),
                "title": ins.title,
                "summary": ins.summary,
                "severity": ins.severity
            }
        )
        assert len(dispatched_notifs) == 1
        notif = dispatched_notifs[0]
        assert notif.recipient_profile_id == coordinator.id
        assert notif.title == f"Guardian Moment: {ins.title}"
