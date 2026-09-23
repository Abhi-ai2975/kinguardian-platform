import pytest
from datetime import datetime, timedelta
import uuid
from app.core.timezone import format_dual_timezone
from app.domains.family.application.services import FamilyService
from app.domains.events.services import EventService


@pytest.mark.asyncio
async def test_timezone_formatting():
    dt = datetime(2026, 8, 23, 12, 0, 0)
    res = format_dual_timezone(dt, "Asia/Kolkata", "America/New_York")
    
    assert res["parent_local_time"].endswith("IST")
    assert res["coordinator_local_time"].endswith("EDT") or res["coordinator_local_time"].endswith("EST")
    assert "17:30:00" in res["parent_local_time"]
    assert "08:00:00" in res["coordinator_local_time"]


@pytest.mark.asyncio
async def test_user_creation(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    user = await service.get_or_create_profile(
        iam_subject_id="iam_subject_test_user",
        email="test_user@kinguardian.com",
        display_name="Test User",
        timezone="Asia/Kolkata"
    )
    assert user.email == "test_user@kinguardian.com"
    assert user.timezone == "Asia/Kolkata"
    assert user.iam_subject_id == "iam_subject_test_user"

    existing = await service.get_or_create_profile(iam_subject_id="iam_subject_test_user", email="test_user@kinguardian.com")
    assert existing.id == user.id


@pytest.mark.asyncio
async def test_create_care_circle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    creator = await service.get_or_create_profile(iam_subject_id="iam_creator", email="creator@kinguardian.com")
    
    circle = await service.create_care_circle(
        creator_id=creator.id,
        name="Parent Health Circle",
        creator_role="coordinator"
    )
    
    assert circle.name == "Parent Health Circle"
    assert circle.primary_coordinator_profile_id == creator.id
    assert len(circle.members) == 1
    assert circle.members[0].profile_id == creator.id
    assert circle.members[0].membership_role == "coordinator"


@pytest.mark.asyncio
async def test_family_relationship_creation(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    rel = await service.add_relationship(
        requester_id=coordinator.id,
        family_id=family.id,
        from_profile_id=coordinator.id,
        to_profile_id=parent.id,
        relationship_type="daughter"
    )
    
    assert rel.relationship_type == "daughter"
    assert rel.from_profile_id == coordinator.id
    assert rel.to_profile_id == parent.id
    
    relationships = await service.list_relationships(coordinator.id, family.id)
    assert len(relationships) == 1
    assert relationships[0].relationship_type == "daughter"


@pytest.mark.asyncio
async def test_care_subject_creation(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata"
    )
    
    assert sub.fhir_patient_id == "fhir-pat-ramesh123"
    assert sub.profile_id == parent.id
    assert sub.relationship_to_coordinator == "father"
    
    subjects = await service.list_care_subjects(coordinator.id, family.id)
    assert len(subjects) == 1
    assert subjects[0].fhir_patient_id == "fhir-pat-ramesh123"


@pytest.mark.asyncio
async def test_care_relationship_creation(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    rel = await service.add_care_relationship(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        profile_id=coordinator.id,
        relationship_type="primary coordinator",
        access_level="full"
    )
    
    assert rel.relationship_type == "primary coordinator"
    assert rel.access_level == "full"
    assert rel.profile_id == coordinator.id
    assert rel.subject_id == sub.id
    
    relationships = await service.list_care_relationships(coordinator.id, family.id)
    assert len(relationships) == 1
    assert relationships[0].relationship_type == "primary coordinator"


@pytest.mark.asyncio
async def test_care_task_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    due = datetime.now() + timedelta(days=1)
    
    # 1. Create task
    task = await service.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        assigned_to_profile_id=coordinator.id,
        title="Evening pill",
        description="Take 1 tablet of Metformin after dinner",
        category="medication",
        priority="high",
        due_at=due
    )
    
    assert task.title == "Evening pill"
    assert task.category == "medication"
    assert task.status == "pending"
    assert task.created_by_profile_id == coordinator.id
    
    # 2. Category validation check
    with pytest.raises(ValueError) as exc:
        await service.add_care_task(
            requester_id=coordinator.id,
            family_id=family.id,
            subject_id=sub.id,
            assigned_to_profile_id=coordinator.id,
            title="Bad category",
            description="",
            category="invalid_category_here",
            priority="low",
            due_at=due
        )
    assert "Invalid care task category" in str(exc.value)

    # 3. Complete task
    completed = await service.complete_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        task_id=task.id
    )
    
    assert completed.status == "completed"
    assert completed.completed_at is not None
    assert completed.completed_by_profile_id == coordinator.id
    
    # 4. List tasks
    tasks = await service.list_care_tasks(coordinator.id, family.id)
    assert len(tasks) == 1
    assert tasks[0].status == "completed"


@pytest.mark.asyncio
async def test_medication_adherence_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # Record event
    sched = datetime.now() - timedelta(hours=1)
    event = await service.record_adherence_event(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_medication_request_id="fhir-med-req-777",
        scheduled_at=sched,
        status="taken",
        source="caregiver"
    )
    
    assert event.status == "taken"
    assert event.confirmed_at is not None
    assert event.confirmed_by_profile_id == coordinator.id
    assert event.fhir_medication_request_id == "fhir-med-req-777"
    
    # List events
    events = await service.list_adherence_events(coordinator.id, family.id, sub.id)
    assert len(events) == 1
    assert events[0].fhir_medication_request_id == "fhir-med-req-777"


@pytest.mark.asyncio
async def test_wellbeing_checkin_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    voice = uuid.uuid4()
    
    # 1. Record checkin
    checkin = await service.add_wellbeing_checkin(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        feeling="not_well",
        notes="Complained about mild headache",
        voice_file_id=voice,
        severity="medium"
    )
    
    assert checkin.feeling == "not_well"
    assert checkin.notes == "Complained about mild headache"
    assert checkin.voice_file_id == voice
    assert checkin.severity == "medium"
    assert checkin.submitted_by_profile_id == coordinator.id
    
    # 2. Feeling value validation
    with pytest.raises(ValueError) as exc:
        await service.add_wellbeing_checkin(
            requester_id=coordinator.id,
            family_id=family.id,
            subject_id=sub.id,
            feeling="diagnosed_hypertension",
            notes="Should fail",
            severity="low"
        )
    assert "Invalid checkin feeling value" in str(exc.value)

    # 3. List checkins
    checkins = await service.list_wellbeing_checkins(coordinator.id, family.id, sub.id)
    assert len(checkins) == 1
    assert checkins[0].feeling == "not_well"


@pytest.mark.asyncio
async def test_monitoring_preferences_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Create monitoring preference
    pref = await service.add_monitoring_preference(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        metric="heart_rate",
        baseline_period_days=14,
        threshold_config={"min_bpm": 50, "max_bpm": 120},
        notification_level="critical",
        enabled=True
    )
    
    assert pref.metric == "heart_rate"
    assert pref.baseline_period_days == 14
    assert pref.threshold_config == {"min_bpm": 50, "max_bpm": 120}
    assert pref.notification_level == "critical"
    assert pref.enabled is True
    
    # 2. Metric validation
    with pytest.raises(ValueError) as exc:
        await service.add_monitoring_preference(
            requester_id=coordinator.id,
            family_id=family.id,
            subject_id=sub.id,
            metric="random_metric_name",
            baseline_period_days=7
        )
    assert "Invalid health monitoring preference metric" in str(exc.value)

    # 3. Update preference
    updated = await service.update_monitoring_preference(
        requester_id=coordinator.id,
        family_id=family.id,
        preference_id=pref.id,
        enabled=False,
        threshold_config={"min_bpm": 60, "max_bpm": 110}
    )
    
    assert updated.enabled is False
    assert updated.threshold_config == {"min_bpm": 60, "max_bpm": 110}
    
    # 4. List preferences
    prefs = await service.list_monitoring_preferences(coordinator.id, family.id, sub.id)
    assert len(prefs) == 1
    assert prefs[0].metric == "heart_rate"


@pytest.mark.asyncio
async def test_ai_insights_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    start = datetime.now() - timedelta(days=7)
    end = datetime.now()
    
    # 1. Create AI Insight
    insight = await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="vital_anomaly",
        severity="high",
        title="Spike in systolic blood pressure",
        summary="A 20% spike in BP observed over the past 3 days.",
        observation="Systolic values peaked at 155 mmHg.",
        recommendation="Verify medication compliance and check salt intake.",
        timeframe_start=start,
        timeframe_end=end,
        confidence=0.85,
        status="active",
        generated_by="blood_pressure_agent",
        agent_run_id="run-999-abc"
    )
    
    assert insight.type == "vital_anomaly"
    assert insight.severity == "high"
    assert insight.title == "Spike in systolic blood pressure"
    assert insight.confidence == 0.85
    assert insight.status == "active"
    assert insight.agent_run_id == "run-999-abc"
    
    # 2. Dismiss Insight
    dismissed = await service.dismiss_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        insight_id=insight.id
    )
    
    assert dismissed.status == "dismissed"
    
    # 3. List insights
    insights = await service.list_ai_insights(coordinator.id, family.id, sub.id)
    assert len(insights) == 1
    assert insights[0].status == "dismissed"


@pytest.mark.asyncio
async def test_ai_insight_sources_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    start = datetime.now() - timedelta(days=7)
    end = datetime.now()
    
    # 1. Create AI Insight
    insight = await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="vital_anomaly",
        severity="medium",
        title="Spike in HR",
        summary="A 20% spike in HR observed.",
        observation="Values peaked at 120 bpm.",
        timeframe_start=start,
        timeframe_end=end,
        confidence=0.9
    )
    
    # 2. Add source explainability link
    source = await service.add_ai_insight_source(
        requester_id=coordinator.id,
        family_id=family.id,
        insight_id=insight.id,
        source_type="Wearable observation",
        source_id="wearable-obs-444",
        source_version="v1.0.2",
        metadata={"device": "AppleWatch", "metric": "heart_rate"}
    )
    
    assert source.insight_id == insight.id
    assert source.source_type == "Wearable observation"
    assert source.source_id == "wearable-obs-444"
    assert source.source_version == "v1.0.2"
    assert source.metadata == {"device": "AppleWatch", "metric": "heart_rate"}
    
    # 3. Query sources
    sources = await service.list_ai_insight_sources(coordinator.id, family.id, insight.id)
    assert len(sources) == 1
    assert sources[0].source_id == "wearable-obs-444"


@pytest.mark.asyncio
async def test_guardian_moments_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    start = datetime.now() - timedelta(days=5)
    end = datetime.now()
    
    # Create AI Insight subtype: guardian_moment
    insight = await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="guardian_moment",
        severity="medium",
        title="Activity Trend Drop",
        summary="Dad's activity has been below his 30-day baseline for 5 consecutive days.",
        observation="Steps recorded: average 2100/day vs baseline 5500/day.",
        recommendation="Encourage a short walk or check in on his physical wellbeing.",
        timeframe_start=start,
        timeframe_end=end,
        confidence=0.95,
        trigger_type="activity_drop",
        baseline_comparison="2100 steps vs 5500 steps baseline",
        actionability="high"
    )
    
    assert insight.type == "guardian_moment"
    assert insight.trigger_type == "activity_drop"
    assert insight.baseline_comparison == "2100 steps vs 5500 steps baseline"
    assert insight.actionability == "high"
    assert insight.summary == "Dad's activity has been below his 30-day baseline for 5 consecutive days."


@pytest.mark.asyncio
async def test_notifications_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    # 1. Create notification
    notif = await service.add_notification(
        requester_id=coordinator.id,
        recipient_profile_id=parent.id,
        family_id=family.id,
        type="sms",
        priority="high",
        title="Medication Reminder",
        body="It is time to take your evening Metformin.",
        action_type="open_adherence_log",
        action_payload={"fhir_medication_request_id": "med-123"}
    )
    
    assert notif.recipient_profile_id == parent.id
    assert notif.type == "sms"
    assert notif.priority == "high"
    assert notif.title == "Medication Reminder"
    assert notif.body == "It is time to take your evening Metformin."
    assert notif.action_payload == {"fhir_medication_request_id": "med-123"}
    assert notif.read_at is None
    assert notif.dismissed_at is None
    
    # 2. Mark notification as read
    read = await service.mark_notification_read(
        requester_id=coordinator.id,
        family_id=family.id,
        notification_id=notif.id
    )
    assert read.read_at is not None
    
    # 3. Mark notification as dismissed
    dismissed = await service.mark_notification_dismissed(
        requester_id=coordinator.id,
        family_id=family.id,
        notification_id=notif.id
    )
    assert dismissed.dismissed_at is not None
    
    # 4. List notifications
    notifications = await service.list_notifications(coordinator.id, family.id, parent.id)
    assert len(notifications) == 1
    assert notifications[0].read_at is not None
    assert notifications[0].dismissed_at is not None


@pytest.mark.asyncio
async def test_notification_deliveries_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    # 1. Create notification
    notif = await service.add_notification(
        requester_id=coordinator.id,
        recipient_profile_id=parent.id,
        family_id=family.id,
        type="sms",
        priority="high",
        title="Medication Reminder",
        body="It is time to take your evening Metformin."
    )
    
    # 2. Add notification delivery attempt
    delivery = await service.add_notification_delivery(
        requester_id=coordinator.id,
        family_id=family.id,
        notification_id=notif.id,
        channel="sms",
        provider="twilio",
        status="pending",
        attempt_count=1
    )
    
    assert delivery.notification_id == notif.id
    assert delivery.channel == "sms"
    assert delivery.provider == "twilio"
    assert delivery.status == "pending"
    assert delivery.attempt_count == 1
    
    # 3. Update delivery attempt to success
    now = datetime.now()
    updated = await service.update_notification_delivery(
        requester_id=coordinator.id,
        family_id=family.id,
        delivery_id=delivery.id,
        status="delivered",
        provider_message_id="msg-twilio-abc-123",
        sent_at=now,
        delivered_at=now
    )
    
    assert updated.status == "delivered"
    assert updated.provider_message_id == "msg-twilio-abc-123"
    assert updated.sent_at == now
    assert updated.delivered_at == now
    
    # 4. List delivery attempts
    deliveries = await service.list_notification_deliveries(coordinator.id, family.id, notif.id)
    assert len(deliveries) == 1
    assert deliveries[0].status == "delivered"


@pytest.mark.asyncio
async def test_family_conversations_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Create a conversation
    conv = await service.create_family_conversation(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id
    )
    
    assert conv.family_id == family.id
    assert conv.subject_id == sub.id
    
    # 2. Add text message
    msg = await service.add_family_message(
        requester_id=coordinator.id,
        family_id=family.id,
        conversation_id=conv.id,
        message_type="text",
        body="Hi dad, did you take your afternoon pills?"
    )
    
    assert msg.conversation_id == conv.id
    assert msg.sender_profile_id == coordinator.id
    assert msg.message_type == "text"
    assert msg.body == "Hi dad, did you take your afternoon pills?"
    
    # 3. Add voice reply message (valid type)
    reply_voice = await service.add_family_message(
        requester_id=coordinator.id,
        family_id=family.id,
        conversation_id=conv.id,
        message_type="voice",
        body="[voice memo]",
        file_id=uuid.uuid4(),
        reply_to_message_id=msg.id
    )
    
    assert reply_voice.message_type == "voice"
    assert reply_voice.reply_to_message_id == msg.id
    
    # 4. Message type validation check (invalid type)
    with pytest.raises(ValueError) as exc:
        await service.add_family_message(
            requester_id=coordinator.id,
            family_id=family.id,
            conversation_id=conv.id,
            message_type="social_network_post",
            body="Not allowed"
        )
    assert "Invalid message type" in str(exc.value)

    # 5. List conversations
    conversations = await service.list_family_conversations(coordinator.id, family.id)
    assert len(conversations) == 1
    
    # 6. List messages
    messages = await service.list_family_messages(coordinator.id, family.id, conv.id)
    assert len(messages) == 2


@pytest.mark.asyncio
async def test_appointment_coordination_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Create coordination metadata
    coord = await service.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_appointment_id="fhir-appt-444",
        assigned_caregiver_profile_id=coordinator.id,
        preparation_status="pending",
        summary_status="not_needed",
        reminder_status="sent"
    )
    
    assert coord.family_id == family.id
    assert coord.subject_id == sub.id
    assert coord.fhir_appointment_id == "fhir-appt-444"
    assert coord.assigned_caregiver_profile_id == coordinator.id
    assert coord.preparation_status == "pending"
    assert coord.summary_status == "not_needed"
    assert coord.reminder_status == "sent"
    
    # 2. Update coordination metadata
    updated = await service.update_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        coordination_id=coord.id,
        preparation_status="ready",
        summary_status="completed"
    )
    
    assert updated is not None
    assert updated.preparation_status == "ready"
    assert updated.summary_status == "completed"
    assert updated.reminder_status == "sent"
    
    # 3. List appointment coordinations
    coords = await service.list_appointment_coordinations(coordinator.id, family.id, sub.id)
    assert len(coords) == 1
    assert coords[0].id == coord.id


@pytest.mark.asyncio
async def test_health_documents_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Create health document metadata (pointing to FileNest)
    doc = await service.add_health_document(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        filenest_file_id="filenest_obj_999_prescription_pdf",
        document_type="prescription",
        status="active",
        ai_processing_status="pending",
        extraction_status="pending"
    )
    
    assert doc.family_id == family.id
    assert doc.subject_id == sub.id
    assert doc.filenest_file_id == "filenest_obj_999_prescription_pdf"
    assert doc.document_type == "prescription"
    assert doc.source_profile_id == coordinator.id
    assert doc.status == "active"
    assert doc.ai_processing_status == "pending"
    assert doc.extraction_status == "pending"
    
    # 2. Update health document processing status
    updated = await service.update_health_document(
        requester_id=coordinator.id,
        family_id=family.id,
        document_id=doc.id,
        ai_processing_status="completed",
        extraction_status="extracted"
    )
    
    assert updated is not None
    assert updated.ai_processing_status == "completed"
    assert updated.extraction_status == "extracted"
    
    # 3. List health documents
    docs = await service.list_health_documents(coordinator.id, family.id, sub.id)
    assert len(docs) == 1
    assert docs[0].id == doc.id
    assert docs[0].filenest_file_id == "filenest_obj_999_prescription_pdf"


@pytest.mark.asyncio
async def test_document_extractions_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    doc = await service.add_health_document(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        filenest_file_id="filenest_obj_123_lab_report",
        document_type="lab_report"
    )
    
    # 1. Create AI extraction record (pending review by default)
    raw = {
        "text": "HbA1c: 6.8%, Fasting Blood Glucose: 118 mg/dL",
        "model": "med-ocr-v2"
    }
    norm = {
        "hba1c": {"value": 6.8, "unit": "%"},
        "fasting_blood_glucose": {"value": 118, "unit": "mg/dL"}
    }
    extraction = await service.add_document_extraction(
        requester_id=coordinator.id,
        family_id=family.id,
        document_id=doc.id,
        extraction_type="lab_report",
        raw_output=raw,
        normalized_output=norm,
        confidence=0.94,
        review_status="pending_review"
    )
    
    assert extraction.document_id == doc.id
    assert extraction.extraction_type == "lab_report"
    assert extraction.raw_output == raw
    assert extraction.normalized_output == norm
    assert extraction.confidence == 0.94
    assert extraction.review_status == "pending_review"
    assert extraction.reviewed_by_profile_id is None
    assert extraction.reviewed_at is None
    
    # 2. Review status validation (invalid status check)
    with pytest.raises(ValueError) as exc:
        await service.add_document_extraction(
            requester_id=coordinator.id,
            family_id=family.id,
            document_id=doc.id,
            extraction_type="lab_report",
            raw_output={},
            normalized_output={},
            review_status="auto_accepted_into_emr"  # Not allowed
        )
    assert "Invalid review status" in str(exc.value)

    # 3. Explicit review by coordinator
    reviewed_norm = {
        "hba1c": {"value": 6.8, "unit": "%"},
        "fasting_blood_glucose": {"value": 118, "unit": "mg/dL"},
        "verified_note": "Values verified against original lab letterhead"
    }
    reviewed = await service.review_document_extraction(
        requester_id=coordinator.id,
        family_id=family.id,
        extraction_id=extraction.id,
        review_status="approved",
        normalized_output=reviewed_norm
    )
    
    assert reviewed.review_status == "approved"
    assert reviewed.reviewed_by_profile_id == coordinator.id
    assert reviewed.reviewed_at is not None
    assert reviewed.normalized_output == reviewed_norm
    
    # 4. List extractions for the document
    extractions = await service.list_document_extractions(coordinator.id, family.id, doc.id)
    assert len(extractions) == 1
    assert extractions[0].id == extraction.id
    assert extractions[0].review_status == "approved"


@pytest.mark.asyncio
async def test_ai_conversations_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Create AI Conversation link (runtime lives in bezs-agent)
    scope = {
        "topics": ["hypertension", "metformin_side_effects"],
        "fhir_context_included": True
    }
    conv = await service.create_ai_conversation(
        requester_id=coordinator.id,
        family_id=family.id,
        agent_session_id="bezs_agent_sess_8899_xyz",
        conversation_type="consultation",
        context_scope=scope,
        subject_id=sub.id
    )
    
    assert conv.family_id == family.id
    assert conv.profile_id == coordinator.id
    assert conv.subject_id == sub.id
    assert conv.agent_session_id == "bezs_agent_sess_8899_xyz"
    assert conv.conversation_type == "consultation"
    assert conv.context_scope == scope
    
    # 2. Get AI Conversation link by ID
    fetched = await service.get_ai_conversation(
        requester_id=coordinator.id,
        family_id=family.id,
        conversation_id=conv.id
    )
    assert fetched is not None
    assert fetched.agent_session_id == "bezs_agent_sess_8899_xyz"
    
    # 3. List AI Conversations for user
    convs = await service.list_ai_conversations(coordinator.id, family.id)
    assert len(convs) == 1
    assert convs[0].id == conv.id


@pytest.mark.asyncio
async def test_ai_actions_lifecycle(db_session):
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Create AI action requiring approval (high impact: e.g. schedule task / send reminder)
    inp = {
        "task_title": "Schedule Nephrologist Follow-up",
        "category": "appointment",
        "due_in_days": 3
    }
    out = {
        "suggested_task_id": "draft-task-001"
    }
    action = await service.create_ai_action(
        requester_id=coordinator.id,
        family_id=family.id,
        agent_session_id="bezs_agent_sess_8899_xyz",
        action_type="create_care_task",
        input_data=inp,
        output_data=out,
        requires_approval=True,
        subject_id=sub.id
    )
    
    assert action.family_id == family.id
    assert action.profile_id == coordinator.id
    assert action.subject_id == sub.id
    assert action.action_type == "create_care_task"
    assert action.requires_approval is True
    assert action.status == "pending_approval"
    assert action.input == inp
    assert action.output == out
    assert action.approved_by_profile_id is None
    assert action.approved_at is None
    
    # 2. Review / approve the action
    reviewed = await service.review_ai_action(
        requester_id=coordinator.id,
        family_id=family.id,
        action_id=action.id,
        status="approved"
    )
    
    assert reviewed.status == "approved"
    assert reviewed.approved_by_profile_id == coordinator.id
    assert reviewed.approved_at is not None
    
    # 3. Create non-approval action (low impact: e.g. summarize_document)
    doc_action = await service.create_ai_action(
        requester_id=coordinator.id,
        family_id=family.id,
        agent_session_id="bezs_agent_sess_8899_xyz",
        action_type="summarize_document",
        input_data={"document_id": "doc-999"},
        output_data={"summary": "CBC is within normal limits."},
        requires_approval=False,
        status="executed",
        subject_id=sub.id
    )
    assert doc_action.requires_approval is False
    assert doc_action.status == "executed"
    
    # 4. List actions for circle & subject
    actions = await service.list_ai_actions(coordinator.id, family.id, sub.id)
    assert len(actions) == 2
    action_types = [a.action_type for a in actions]
    assert "create_care_task" in action_types
    assert "summarize_document" in action_types


@pytest.mark.asyncio
async def test_coordinator_home_read_service(db_session):
    from datetime import timezone
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    from app.domains.family.application.read_services import CoordinatorHomeReadService
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    # Setup coordinator & parent
    coordinator = await service.get_or_create_profile("iam_anjali", "anjali@kinguardian.com", "Anjali", timezone="America/New_York")
    parent = await service.get_or_create_profile("iam_ramesh", "ramesh@kinguardian.com", "Ramesh", timezone="Asia/Kolkata")
    
    family = await service.create_care_circle(coordinator.id, "Anjali's Care Circle", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-ramesh123",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 1. Wellbeing check-in
    await service.add_wellbeing_checkin(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        feeling="good",
        notes="Walked 20 minutes in garden"
    )
    
    # 2. Medication adherence today
    now_utc = datetime.now(timezone.utc)
    await service.record_adherence_event(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_medication_request_id="med-req-metformin",
        scheduled_at=now_utc,
        status="taken"
    )
    
    # 3. Guardian Moment AI insight
    await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="guardian_moment",
        severity="medium",
        title="Activity Drop",
        summary="Dad's steps below 30-day average.",
        observation="2,100 steps vs 5,500 baseline",
        timeframe_start=now_utc,
        timeframe_end=now_utc
    )
    
    # 4. Urgent insight for Attention Items
    await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="vital_alert",
        severity="high",
        title="Blood Pressure Spike",
        summary="Systolic BP recorded at 155 mmHg.",
        observation="155/95 mmHg at 08:30 AM",
        timeframe_start=now_utc,
        timeframe_end=now_utc
    )
    
    # 5. Pending Care Task
    await service.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        assigned_to_profile_id=coordinator.id,
        title="Refill Metformin Prescription",
        description="Call pharmacy before Friday",
        category="medication",
        priority="high",
        due_at=now_utc
    )
    
    # 6. Appointment coordination
    await service.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_appointment_id="fhir-appt-cardio-99",
        assigned_caregiver_profile_id=coordinator.id,
        preparation_status="pending"
    )
    
    # 7. AI Action awaiting approval
    await service.create_ai_action(
        requester_id=coordinator.id,
        family_id=family.id,
        agent_session_id="agent-sess-001",
        action_type="prepare_appointment_summary",
        input_data={"fhir_appointment_id": "fhir-appt-cardio-99"},
        output_data={},
        requires_approval=True,
        subject_id=sub.id
    )

    # 8. Query Coordinator Home aggregated read model
    home_read_service = CoordinatorHomeReadService(db_session)
    home_data = await home_read_service.get_coordinator_home(coordinator.id)
    
    assert home_data.coordinator_profile_id == coordinator.id
    assert len(home_data.parent_statuses) == 1
    assert home_data.parent_statuses[0].subject_id == sub.id
    assert home_data.parent_statuses[0].display_name == "Ramesh"
    assert home_data.parent_statuses[0].latest_checkin_feeling == "good"
    assert home_data.parent_statuses[0].today_adherence_summary == "1/1 doses taken"
    
    # Attention items: should contain urgent BP insight and pending AI action approval
    assert len(home_data.attention_items) >= 2
    item_types = [item.item_type for item in home_data.attention_items]
    assert "urgent_insight" in item_types
    assert "pending_action_approval" in item_types
    
    # Guardian moments
    assert len(home_data.guardian_moments) == 1
    assert home_data.guardian_moments[0].title == "Activity Drop"
    
    # Today's medications
    assert len(home_data.today_medications) == 1
    assert home_data.today_medications[0].fhir_medication_request_id == "med-req-metformin"
    assert home_data.today_medications[0].status == "taken"
    
    # Upcoming appointments
    assert len(home_data.upcoming_appointments) == 1
    assert home_data.upcoming_appointments[0].fhir_appointment_id == "fhir-appt-cardio-99"
    
    # Pending care tasks
    assert len(home_data.pending_care_tasks) == 1
    assert home_data.pending_care_tasks[0].title == "Refill Metformin Prescription"
    
    # Recent updates audit logs
    assert len(home_data.recent_updates) > 0


@pytest.mark.asyncio
async def test_parent_home_read_service(db_session):
    from datetime import timezone
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    from app.domains.family.application.read_services import ParentHomeReadService
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    # 1. Setup coordinator and parent
    coordinator = await service.get_or_create_profile("iam_anjali_parent_test", "anjali_pt@kinguardian.com", "Anjali", timezone="America/New_York")
    parent = await service.get_or_create_profile("iam_ramesh_parent_test", "ramesh_pt@kinguardian.com", "Ramesh", timezone="Asia/Kolkata")
    
    family = await service.create_care_circle(coordinator.id, "Ramesh Family", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-parent-home-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )
    
    # 2. Add today's checkin
    now_utc = datetime.now(timezone.utc)
    await service.add_wellbeing_checkin(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        feeling="good",
        notes="Feeling energized"
    )
    
    # 3. Add today's medication
    await service.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_medication_request_id="med-atorvastatin",
        scheduled_at=now_utc,
        status="scheduled"
    )
    
    # 4. Add upcoming appointment
    await service.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_appointment_id="fhir-appt-dr-sharma-1",
        assigned_caregiver_profile_id=coordinator.id,
        preparation_status="ready"
    )
    
    # 5. Add reminder notification for parent
    await service.add_notification(
        requester_id=coordinator.id,
        recipient_profile_id=parent.id,
        family_id=family.id,
        type="push",
        priority="high",
        title="Evening Walk Reminder",
        body="Don't forget your 15-minute evening walk!",
        subject_id=sub.id
    )
    
    # 6. Add family conversation and message
    conv = await service.create_family_conversation(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id
    )
    await service.add_family_message(
        requester_id=coordinator.id,
        family_id=family.id,
        conversation_id=conv.id,
        message_type="text",
        body="Hi Dad, hope your walk went well today!"
    )

    
    # 7. Query Parent Home Read Model
    parent_home_service = ParentHomeReadService(db_session)
    parent_home = await parent_home_service.get_parent_home(parent.id)
    
    assert parent_home.parent_profile_id == parent.id
    # Check-in status
    assert parent_home.checkin_status.submitted is True
    assert parent_home.checkin_status.feeling == "good"
    
    # Today's medications
    assert len(parent_home.today_medications) == 1
    assert parent_home.today_medications[0].fhir_medication_request_id == "med-atorvastatin"
    assert parent_home.today_medications[0].status == "scheduled"
    
    # Upcoming appointment
    assert parent_home.upcoming_appointment is not None
    assert parent_home.upcoming_appointment.fhir_appointment_id == "fhir-appt-dr-sharma-1"
    assert parent_home.upcoming_appointment.assigned_caregiver_name == "Anjali"
    
    # Reminders
    assert len(parent_home.reminders) == 1
    assert parent_home.reminders[0].title == "Evening Walk Reminder"
    
    # Family messages
    assert len(parent_home.family_messages) == 1
    assert parent_home.family_messages[0].body == "Hi Dad, hope your walk went well today!"
    assert parent_home.family_messages[0].sender_name == "Anjali"
    
    # Pending actions
    assert len(parent_home.pending_actions) == 1
    assert parent_home.pending_actions[0].action_type == "take_medication"


@pytest.mark.asyncio
async def test_family_dashboard_read_service(db_session):
    from datetime import timezone
    from app.domains.family.infrastructure.repositories import SQLAlchemyAppProfileRepository, SQLAlchemyFamilyRepository, SQLAlchemyConsentRepository
    from app.domains.family.application.read_services import FamilyDashboardReadService
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    # 1. Setup profiles
    coordinator = await service.get_or_create_profile("iam_anjali_dash", "anjali_dash@kinguardian.com", "Anjali Sharma", timezone="America/New_York")
    parent = await service.get_or_create_profile("iam_ramesh_dash", "ramesh_dash@kinguardian.com", "Ramesh Sharma", timezone="Asia/Kolkata")
    caregiver = await service.get_or_create_profile("iam_nurse_dash", "nurse_dash@kinguardian.com", "Nurse Maya", timezone="Asia/Kolkata")
    
    family = await service.create_care_circle(coordinator.id, "Sharma Family Care", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    await service.add_member_to_circle(coordinator.id, family.id, caregiver.email, "caregiver")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-dash-101",
        profile_id=parent.id,
        relationship_to_coordinator="father",
        city="Mumbai",
        timezone="Asia/Kolkata"
    )
    
    # 2. Checkin & Adherence
    now_utc = datetime.now(timezone.utc)
    await service.add_wellbeing_checkin(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        feeling="good",
        notes="BP normal"
    )
    
    await service.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_medication_request_id="med-amlodipine",
        scheduled_at=now_utc,
        status="taken"
    )
    
    # 3. Guardian Moment
    await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="guardian_moment",
        severity="low",
        title="Sleep Improvement",
        summary="7.5 hours avg sleep this week.",
        observation="Up by 45 mins/night",
        timeframe_start=now_utc,
        timeframe_end=now_utc
    )
    
    # 4. Care Task
    await service.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        assigned_to_profile_id=caregiver.id,
        title="Weekly Vitals Check",
        description="Check BP and vitals",
        category="check_in",
        priority="medium",
        due_at=now_utc
    )

    
    # 5. Consent
    await service.set_consent(
        grantor_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        grantee_email=coordinator.email,
        scope={"vitals": True, "medications": True}
    )


    
    # 6. Query Family Dashboard
    dash_service = FamilyDashboardReadService(db_session)
    dashboard = await dash_service.get_family_dashboard(requester_id=coordinator.id, family_id=family.id)
    
    assert dashboard.family_id == family.id
    assert dashboard.family_name == "Sharma Family Care"
    assert dashboard.primary_coordinator_id == coordinator.id
    assert dashboard.primary_coordinator_name == "Anjali Sharma"
    
    # Members
    assert len(dashboard.members) == 3
    
    # Care subjects summary
    assert len(dashboard.care_subjects) == 1
    assert dashboard.care_subjects[0].subject_id == sub.id
    assert dashboard.care_subjects[0].display_name == "Ramesh Sharma"
    assert dashboard.care_subjects[0].health_status == "stable"
    assert dashboard.care_subjects[0].adherence_rate_7d == 100.0
    
    # Guardian moments
    assert len(dashboard.guardian_moments) == 1
    assert dashboard.guardian_moments[0].title == "Sleep Improvement"
    
    # Upcoming schedule
    assert len(dashboard.upcoming_schedule) == 1
    assert dashboard.upcoming_schedule[0].title == "Weekly Vitals Check"
    assert dashboard.upcoming_schedule[0].assigned_to_name == "Nurse Maya"
    
    # Consents
    assert dashboard.active_consents_count == 1
    
    # Recent activity
    assert len(dashboard.recent_activity) > 0


@pytest.mark.asyncio
async def test_parent_health_summary_read_service(db_session):
    from datetime import timezone
    from app.domains.family.infrastructure.repositories import (
        SQLAlchemyAppProfileRepository,
        SQLAlchemyFamilyRepository,
        SQLAlchemyConsentRepository
    )
    from app.domains.family.application.read_services import ParentHealthSummaryReadService
    
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    circle_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    
    service = FamilyService(user_repo, circle_repo, consent_repo, event_logger)
    
    # 1. Setup profiles
    coordinator = await service.get_or_create_profile("iam_anjali_sum", "anjali_sum@kinguardian.com", "Anjali Sharma", timezone="America/New_York")
    parent = await service.get_or_create_profile("iam_ramesh_sum", "ramesh_sum@kinguardian.com", "Ramesh Sharma", timezone="Asia/Kolkata")
    caregiver = await service.get_or_create_profile("iam_caregiver_sum", "cg_sum@kinguardian.com", "Caregiver Suresh", timezone="Asia/Kolkata")
    
    family = await service.create_care_circle(coordinator.id, "Sharma Health Summary Circle", "coordinator")
    await service.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")
    await service.add_member_to_circle(coordinator.id, family.id, caregiver.email, "caregiver")
    
    sub = await service.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-sum-999",
        profile_id=parent.id,
        relationship_to_coordinator="father",
        city="Bengaluru",
        timezone="Asia/Kolkata"
    )
    
    # Care relationship
    await service.add_care_relationship(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        profile_id=caregiver.id,
        relationship_type="professional_nurse",
        access_level="full"
    )

    
    # 2. Checkins
    now_utc = datetime.now(timezone.utc)
    await service.add_wellbeing_checkin(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        feeling="okay",
        notes="Slight dizziness in the morning"
    )
    
    # 3. Adherence
    await service.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_medication_request_id="med-metformin-500",
        scheduled_at=now_utc,
        status="taken"
    )
    
    # 4. AI Insight / Guardian Moment
    await service.add_ai_insight(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        type="guardian_moment",
        severity="medium",
        title="Dizziness Trend Alert",
        summary="Dizziness reported twice this week after morning dosage.",
        observation="Correlates with BP medication timing",
        timeframe_start=now_utc,
        timeframe_end=now_utc
    )
    
    # 5. Appointment coordination
    await service.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        fhir_appointment_id="fhir-appt-cardiologist-01",
        assigned_caregiver_profile_id=caregiver.id,
        preparation_status="ready"
    )
    
    # 6. Health Document
    await service.add_health_document(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id,
        filenest_file_id="fn_doc_echo_report_2026",
        document_type="lab_report"
    )

    
    # 7. Query Parent Health Summary Compose Service
    summary_service = ParentHealthSummaryReadService(db_session)
    summary = await summary_service.get_parent_health_summary(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=sub.id
    )
    
    # Validate Composed DTO
    assert summary.family_id == family.id
    assert summary.subject_info.subject_id == sub.id
    assert summary.subject_info.display_name == "Ramesh Sharma"
    assert summary.subject_info.city == "Bengaluru"
    
    # FHIR Data Projection
    assert summary.fhir_data["fhir_patient_id"] == "fhir-pat-sum-999"
    assert summary.fhir_data["vitals_status"] == "normal"
    
    # Care relationships
    assert len(summary.care_relationships) == 1
    assert summary.care_relationships[0].display_name == "Caregiver Suresh"
    assert summary.care_relationships[0].relationship_type == "professional_nurse"
    
    # Adherence summary
    assert summary.adherence.total_logged == 1
    assert summary.adherence.taken_count == 1
    assert summary.adherence.adherence_rate_7d == 100.0
    assert len(summary.adherence.today_events) == 1
    
    # Checkins
    assert len(summary.checkins) == 1
    assert summary.checkins[0].feeling == "okay"
    
    # AI insights
    assert len(summary.ai_insights) == 1
    assert summary.ai_insights[0].title == "Dizziness Trend Alert"
    
    # Appointments
    assert len(summary.appointments) == 1
    assert summary.appointments[0].fhir_appointment_id == "fhir-appt-cardiologist-01"
    
    # Documents
    assert len(summary.recent_documents) == 1
    assert summary.recent_documents[0].filenest_file_id == "fn_doc_echo_report_2026"







