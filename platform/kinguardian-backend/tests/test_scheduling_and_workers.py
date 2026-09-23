import pytest
import uuid
from datetime import datetime, timedelta
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import AppProfile, HealthDocument
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.domains.events.outbox import OutboxService
from app.domains.events.domain_events import DomainEvent
from app.domains.scheduling.scheduler import JobScheduler, global_job_scheduler
from app.domains.scheduling.jobs import (
    MedicationReminderJob,
    AppointmentReminderJob,
    CheckinReminderJob,
    GuardianTrendEvaluationJob,
    NotificationRetryJob,
    DocumentProcessingRetryJob,
    OutboxPublishingJob
)


@pytest.mark.asyncio
async def test_job_scheduler_all_seven_jobs_registered_and_executed(db_session):
    """
    Verifies that all 7 required scheduled jobs are registered and execute cleanly:
    1. medication reminder
    2. appointment reminder
    3. check-in reminder
    4. guardian trend evaluation
    5. notification retry
    6. document processing retry
    7. outbox publishing
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    # 1. Setup Data
    coord = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_sched",
        email="coord_sched@kinguardian.com",
        display_name="Maya Scheduler",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_sched",
        email="parent_sched@kinguardian.com",
        display_name="Arthur Scheduler",
        timezone="Asia/Kolkata"
    )
    family = await family_svc.create_care_circle(coord.id, "Scheduler Circle", "coordinator")
    await family_svc.add_member_to_circle(coord.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coord.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-sched-1",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # Seed data for jobs
    # A. Adherence Event (for MedicationReminderJob and GuardianTrendEvaluationJob)
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="rx-sched-101",
        scheduled_at=datetime.now(),
        status="taken",
        source="parent"
    )

    # B. Appointment Coordination (for AppointmentReminderJob)
    await family_svc.add_appointment_coordination(
        requester_id=coord.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id="fhir-appt-sched-201"
    )

    # C. Outbox Event (for OutboxPublishingJob)
    outbox_svc = OutboxService(db_session)
    await outbox_svc.stage_event(
        event_type="test_scheduled_event",
        aggregate_type="test",
        aggregate_id=uuid.uuid4(),
        payload={"message": "staged event"}
    )

    # D. Health Document in pending status (for DocumentProcessingRetryJob)
    doc = HealthDocument(
        family_id=family.id,
        subject_id=subject.id,
        source_profile_id=coord.id,
        filenest_file_id="fn-doc1",
        document_type="lab_report",
        ai_processing_status="pending",
        extraction_status="pending"
    )
    db_session.add(doc)
    await db_session.flush()


    scheduler = JobScheduler()

    # 1. Verify all 7 jobs are present
    jobs = scheduler.list_jobs()
    assert len(jobs) == 7
    job_ids = [j.job_id for j in jobs]
    expected_ids = [
        "medication_reminder",
        "appointment_reminder",
        "checkin_reminder",
        "guardian_trend_evaluation",
        "notification_retry",
        "document_processing_retry",
        "outbox_publishing"
    ]
    for expected in expected_ids:
        assert expected in job_ids

    # 2. Execute each job and verify JobResult
    res_med = await scheduler.run_job("medication_reminder", db_session)
    assert res_med.success is True
    assert res_med.duration_ms >= 0

    res_appt = await scheduler.run_job("appointment_reminder", db_session)
    assert res_appt.success is True

    res_checkin = await scheduler.run_job("checkin_reminder", db_session)
    assert res_checkin.success is True

    res_guardian = await scheduler.run_job("guardian_trend_evaluation", db_session)
    assert res_guardian.success is True

    res_notif_retry = await scheduler.run_job("notification_retry", db_session)
    assert res_notif_retry.success is True

    res_doc_retry = await scheduler.run_job("document_processing_retry", db_session)
    assert res_doc_retry.success is True
    assert res_doc_retry.records_processed >= 1

    res_outbox = await scheduler.run_job("outbox_publishing", db_session)
    assert res_outbox.success is True
    assert res_outbox.records_processed >= 1

    # 3. Test run_all()
    all_results = await scheduler.run_all(db_session)
    assert len(all_results) == 7
    assert all(r.success is True for r in all_results)


@pytest.mark.asyncio
async def test_scheduling_rest_endpoints(db_session):
    """
    Verifies REST API endpoints for listing jobs and triggering on-demand job runs.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    user = await family_svc.get_or_create_profile(
        iam_subject_id="iam_user_sched_rest",
        email="user_sched_rest@kinguardian.com",
        display_name="Lisa Sched REST",
        timezone="America/Los_Angeles"
    )

    app_profile = await db_session.get(AppProfile, user.id)
    app.dependency_overrides[get_current_user] = lambda: app_profile

    transport = ASGITransport(app=app)
    try:
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            # 1. GET /api/v1/scheduling/jobs
            res_list = await client.get("/api/v1/scheduling/jobs")
            assert res_list.status_code == 200
            jobs_data = res_list.json()
            assert len(jobs_data) == 7
            job_ids = [j["job_id"] for j in jobs_data]
            assert "medication_reminder" in job_ids
            assert "guardian_trend_evaluation" in job_ids
            assert "outbox_publishing" in job_ids

            # 2. POST /api/v1/scheduling/jobs/{job_id}/run
            res_run = await client.post("/api/v1/scheduling/jobs/outbox_publishing/run")
            assert res_run.status_code == 200
            run_data = res_run.json()
            assert run_data["job_id"] == "outbox_publishing"
            assert run_data["success"] is True

            # 3. POST /api/v1/scheduling/jobs/run-all
            res_all = await client.post("/api/v1/scheduling/jobs/run-all")
            assert res_all.status_code == 200
            all_data = res_all.json()
            assert len(all_data) == 7
            assert all(j["success"] is True for j in all_data)
    finally:
        app.dependency_overrides.clear()
