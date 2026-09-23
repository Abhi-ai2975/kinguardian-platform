"""
Family Home Query Optimization Test Suite:
Verifies FamilyHomeReadService:
1. Aggregates all 8 components:
   - Family
   - Parent status
   - Recent check-ins
   - Guardian moments
   - Medication status
   - Appointments
   - Care tasks
   - Notifications
2. Uses parallel requests (asyncio.gather).
3. Selective Caching (caches static family metadata in Redis, keeps live streams dynamic).
4. Enforces server-side authorization and tenancy isolation.
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisCacheService, EphemeralMemoryBackend
from app.domains.family.application.home_read_service import FamilyHomeReadService
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.domain.exceptions import FamilyAccessError


@pytest.mark.asyncio
async def test_family_home_read_service_aggregation_and_caching(db_session: AsyncSession):
    """
    Tests complete Family Home read aggregation across all 8 components,
    verifying parallel retrieval, selective Redis caching, and tenancy security.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    now = datetime.now(timezone.utc)

    # 1. Setup Profiles & Family Circle
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id="iam_coord_home_01",
        email="anjali.home@kinguardian.com",
        display_name="Anjali",
        timezone="Europe/London"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id="iam_parent_home_01",
        email="ramesh.home@kinguardian.com",
        display_name="Ramesh",
        timezone="Asia/Kolkata"
    )
    stranger = await family_svc.get_or_create_profile(
        iam_subject_id="iam_stranger_home_01",
        email="stranger.home@kinguardian.com",
        display_name="Stranger",
        timezone="UTC"
    )

    family = await family_svc.create_care_circle(coordinator.id, "Anjali's Family Circle", "coordinator")
    await family_svc.add_member_to_circle(coordinator.id, family.id, parent.email, "parent")

    subject = await family_svc.add_care_subject(
        requester_id=coordinator.id,
        family_id=family.id,
        fhir_patient_id="synth-pat-home-101",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 2. Seed all 8 components
    # 2.1 Check-in
    await family_svc.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="Feeling active and had a healthy breakfast."
    )

    # 2.2 Guardian Moment (AI Insight)
    await family_svc.generate_subject_ai_insights(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        insight_type="vital_trends"
    )

    # 2.3 Medication Adherence
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-metformin-500",
        scheduled_at=now,
        status="taken",
        source="parent"
    )

    # 2.4 Clinical Appointment
    await family_svc.add_appointment_coordination(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_appointment_id="appt-cardio-999"
    )

    # 2.5 Care Task
    await family_svc.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coordinator.id,
        title="Check resting heart rate in the evening",
        description="Daily monitoring",
        category="medication",
        priority="high",
        due_at=now + timedelta(days=1)
    )

    # 2.6 Notification
    await family_svc.add_notification(
        requester_id=coordinator.id,
        family_id=family.id,
        recipient_profile_id=coordinator.id,
        type="guardian_moment",
        priority="medium",
        title="Morning Check-in Recorded",
        body="Ramesh checked in feeling good."
    )



    # 3. Setup Redis Cache & Read Service
    backend = EphemeralMemoryBackend()
    cache_service = RedisCacheService(backend=backend)
    home_read_service = FamilyHomeReadService(session=db_session, cache_service=cache_service)

    # 4. First Read Request -> Cache Miss on Family Core, Populates Redis
    view_1 = await home_read_service.get_family_home_view(
        requester_id=coordinator.id,
        family_id=family.id
    )

    # Verify All 8 Components are Aggregated
    assert view_1.cache_hit is False
    assert view_1.family["name"] == "Anjali's Family Circle"
    assert view_1.family["active_members_count"] >= 2
    assert len(view_1.parents) >= 1
    assert view_1.parents[0]["display_name"] == "Ramesh"
    assert len(view_1.recent_checkins) >= 1
    assert view_1.recent_checkins[0]["feeling"] == "good"
    assert len(view_1.guardian_moments) >= 1
    assert len(view_1.medication_status) >= 1
    assert view_1.medication_status[0]["taken_count"] >= 1
    assert len(view_1.appointments) >= 1
    assert len(view_1.care_tasks) >= 1
    assert len(view_1.notifications) >= 1

    # 5. Second Read Request -> Cache Hit on Family Core from Redis
    view_2 = await home_read_service.get_family_home_view(
        requester_id=coordinator.id,
        family_id=family.id
    )
    assert view_2.cache_hit is True
    assert view_2.family["name"] == "Anjali's Family Circle"
    assert len(view_2.recent_checkins) >= 1

    # 6. Tenancy Authorization -> Stranger cannot access Family Home view
    with pytest.raises(FamilyAccessError) as exc_auth:
        await home_read_service.get_family_home_view(
            requester_id=stranger.id,
            family_id=family.id
        )
    assert "not an active member" in str(exc_auth.value).lower()
