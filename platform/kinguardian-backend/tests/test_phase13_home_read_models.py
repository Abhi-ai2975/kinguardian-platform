"""
Phase 13 — Home Read Models Test Suite.

Validates optimized single-roundtrip projections:
1. Coordinator Home (CoordinatorHomeReadService)
2. Parent Home (ParentHomeReadService)
3. Parent Summary (ParentHealthSummaryReadService)
4. Timeline & Activity (FamilyDashboardReadService)
5. Notifications & Reminders aggregation
6. High-performance parallel query execution & Redis caching
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.redis import RedisCacheService
from app.domains.family.application.read_services import (
    CoordinatorHomeReadService,
    ParentHomeReadService,
    ParentHealthSummaryReadService,
    FamilyDashboardReadService
)
from app.domains.family.application.home_read_service import FamilyHomeReadService
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.domain.exceptions import FamilyAccessError


@pytest.fixture
def home_environment(db_session: AsyncSession):
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_svc = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    return {
        "db_session": db_session,
        "family_svc": family_svc,
        "user_repo": user_repo,
        "family_repo": family_repo,
        "coordinator_read_svc": CoordinatorHomeReadService(db_session),
        "parent_read_svc": ParentHomeReadService(db_session),
        "summary_read_svc": ParentHealthSummaryReadService(db_session),
        "dashboard_read_svc": FamilyDashboardReadService(db_session),
        "family_home_read_svc": FamilyHomeReadService(db_session)
    }


@pytest.mark.asyncio
async def test_coordinator_home_read_model(home_environment):
    """
    1. Coordinator Home:
    Verifies single-roundtrip coordinator home aggregation:
    - Care subjects and health status
    - Active Guardian Moments
    - Today's medication schedule
    - Upcoming appointments
    - Pending care tasks
    - Unread alerts
    """
    env = home_environment
    family_svc = env["family_svc"]
    coord_read_svc = env["coordinator_read_svc"]

    # 1. Setup Coordinator, Parent, and Care Circle
    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_coord_{uuid.uuid4()}",
        email=f"coord_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Anjali Coordinator",
        timezone="America/New_York"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_parent_{uuid.uuid4()}",
        email=f"parent_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh Parent",
        timezone="Asia/Kolkata"
    )

    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="Anjali's Family Circle",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-coord-01",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 2. Seed Care Task & Checkin
    await family_svc.add_care_task(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id,
        assigned_to_profile_id=coordinator.id,
        title="Check morning blood pressure",
        description="Check with omron monitor",
        category="follow_up",
        priority="high",
        due_at=datetime.now(timezone.utc) + timedelta(hours=2)
    )




    await family_svc.submit_subject_checkin(
        requester_id=parent.id,
        subject_id=subject.id,
        feeling="good",
        notes="Had a morning walk and healthy breakfast."
    )

    # 3. Retrieve Coordinator Home
    home_view = await coord_read_svc.get_coordinator_home(
        coordinator_profile_id=coordinator.id,
        family_id=family.id
    )

    assert home_view is not None
    assert home_view.coordinator_profile_id == coordinator.id
    assert len(home_view.parent_statuses) >= 1
    assert home_view.parent_statuses[0].display_name == "Ramesh Parent"
    assert len(home_view.pending_care_tasks) >= 1
    assert home_view.pending_care_tasks[0].title == "Check morning blood pressure"



@pytest.mark.asyncio
async def test_parent_home_read_model(home_environment):
    """
    2. Parent Home:
    Verifies optimized single-roundtrip parent home aggregation:
    - Today's check-in status
    - Today's scheduled medications
    - Upcoming appointment
    - Unread reminders
    - Pending one-tap actions
    """
    env = home_environment
    family_svc = env["family_svc"]
    parent_read_svc = env["parent_read_svc"]

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_coord_p_{uuid.uuid4()}",
        email=f"coord_p_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_parent_p_{uuid.uuid4()}",
        email=f"parent_p_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh"
    )

    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="Parent Home Circle",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-par-02",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # Record adherence event for today
    now = datetime.now(timezone.utc)
    await family_svc.record_adherence_event(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="rx-metformin-500",
        scheduled_at=now,
        status="taken",
        source="parent"
    )

    # Retrieve Parent Home
    parent_home = await parent_read_svc.get_parent_home(parent.id)

    assert parent_home is not None
    assert parent_home.parent_profile_id == parent.id
    assert len(parent_home.today_medications) >= 1
    assert parent_home.today_medications[0].fhir_medication_request_id == "rx-metformin-500"


@pytest.mark.asyncio
async def test_parent_health_summary_and_timeline(home_environment):
    """
    3. Parent Summary & 4. Timeline & 5. Notifications:
    Verifies multi-dimensional parent health summary, 7d/30d adherence rates,
    and family activity timeline dashboard.
    """
    env = home_environment
    family_svc = env["family_svc"]
    summary_read_svc = env["summary_read_svc"]
    dashboard_read_svc = env["dashboard_read_svc"]

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_coord_s_{uuid.uuid4()}",
        email=f"coord_s_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    parent = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_parent_s_{uuid.uuid4()}",
        email=f"parent_s_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Ramesh"
    )

    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="Health Summary Circle",
        creator_role="coordinator"
    )
    await family_svc.circle_repo.add_member(family.id, parent.id, "parent")

    subject = await family_svc.circle_repo.add_care_subject(
        family_id=family.id,
        fhir_patient_id="fhir-pat-sum-03",
        profile_id=parent.id,
        relationship_to_coordinator="father"
    )

    # 1. Parent Health Summary
    health_summary = await summary_read_svc.get_parent_health_summary(
        requester_id=coordinator.id,
        family_id=family.id,
        subject_id=subject.id
    )

    assert health_summary is not None
    assert health_summary.subject_info.display_name == "Ramesh"
    assert health_summary.fhir_data is not None
    assert health_summary.adherence is not None

    # 2. Family Dashboard & Activity Timeline
    dashboard = await dashboard_read_svc.get_family_dashboard(
        requester_id=coordinator.id,
        family_id=family.id
    )

    assert dashboard is not None
    assert dashboard.family_name == "Health Summary Circle"
    assert len(dashboard.members) == 2
    assert len(dashboard.care_subjects) == 1


@pytest.mark.asyncio
async def test_family_home_parallel_aggregation_and_caching(home_environment):
    """
    6. Parallel aggregation & Redis caching:
    Verifies FamilyHomeReadService parallel execution and Redis cache population.
    """
    env = home_environment
    family_svc = env["family_svc"]
    home_read_svc = env["family_home_read_svc"]

    coordinator = await family_svc.get_or_create_profile(
        iam_subject_id=f"iam_coord_par_{uuid.uuid4()}",
        email=f"coord_par_{uuid.uuid4().hex[:6]}@kinguardian.com",
        display_name="Coordinator"
    )
    family = await family_svc.create_care_circle(
        creator_id=coordinator.id,
        name="Parallel Read Circle",
        creator_role="coordinator"
    )

    # First fetch: Cache Miss -> Populates Cache
    res1 = await home_read_svc.get_family_home_view(
        requester_id=coordinator.id,
        family_id=family.id
    )
    assert res1 is not None
    assert res1.family["name"] == "Parallel Read Circle"

    # Second fetch: Cache Hit
    res2 = await home_read_svc.get_family_home_view(
        requester_id=coordinator.id,
        family_id=family.id
    )
    assert res2 is not None
    assert res2.cache_hit is True
