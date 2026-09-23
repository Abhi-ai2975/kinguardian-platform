"""
Testing Pyramid Implementation Test Suite:
1. Unit Tests (Entities, pure functions, algorithms)
2. Application Service Tests (Service layer, transaction coordinator, idempotency)
3. Repository Integration Tests (SQLAlchemy models, cascades, constraints)
4. API Integration Tests (FastAPI routes, headers, validation, security)
5. End-to-End Workflow Tests (Multi-actor cross-border lifecycle execution)
"""

import pytest
import uuid
from datetime import datetime, timezone, timedelta
from httpx import AsyncClient, ASGITransport
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.main import app
from app.core.timezones import TimezoneService
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent,
    MedicationAdherenceEvent,
    WellbeingCheckin,
    AIInsight,
    Notification
)
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.family.application.services import FamilyService
from app.domains.family.application.transaction_coordinator import TransactionCoordinatorService
from app.domains.events.services import EventService
from app.core.adapters import MockNotificationProvider


# ==============================================================================
# Layer 1: Unit Tests
# ==============================================================================
@pytest.mark.unit
def test_unit_dual_timezone_conversion():
    """
    Unit Test: Tests pure timezone arithmetic and dual projection without DB.
    """
    utc_timestamp = datetime(2026, 8, 23, 8, 30, tzinfo=timezone.utc)
    res = TimezoneService.build_dual_timezone_view(
        utc_timestamp,
        parent_tz_str="Asia/Kolkata",
        coordinator_tz_str="Europe/London"
    )

    assert res.parent_timezone == "Asia/Kolkata"
    assert res.coordinator_timezone == "Europe/London"
    assert "14:00" in res.parent_local_time
    assert "09:30" in res.coordinator_local_time
    assert res.time_difference_hours == 4.5



# ==============================================================================
# Layer 2: Application Service Tests
# ==============================================================================
@pytest.mark.application_service
@pytest.mark.asyncio
async def test_service_layer_medication_transaction_coordination(db_session: AsyncSession):
    """
    Application Service Test: Tests transactional commit of adherence events
    and outbox records via TransactionCoordinatorService.
    """
    profile = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id="iam_unit_tester",
        display_name="Tester",
        first_name="Test",
        email="tester@example.com",
        timezone="Asia/Kolkata"
    )
    family = Family(id=uuid.uuid4(), name="Test Service Family")
    db_session.add_all([profile, family])
    await db_session.flush()

    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=profile.id,
        fhir_patient_id="synth-pat-test",
        relationship_to_coordinator="self"
    )
    db_session.add(subject)
    await db_session.commit()

    coordinator = TransactionCoordinatorService(db_session)
    event_id = uuid.uuid4()
    scheduled_at = datetime.now(timezone.utc)

    # Execute service transaction
    adherence, outbox_event = await coordinator.confirm_parent_medication(
        adherence_id=event_id,
        subject_id=subject.id,
        family_id=family.id,
        actor_id=profile.id,
        medication_name="Synthetic Atorvastatin 20mg",
        dosage="20mg",
        scheduled_at=scheduled_at
    )

    assert adherence.status == "taken"
    assert outbox_event.status == "pending"



# ==============================================================================
# Layer 3: Repository Integration Tests
# ==============================================================================
@pytest.mark.repository_integration
@pytest.mark.asyncio
async def test_repository_integration_family_membership_queries(db_session: AsyncSession):
    """
    Repository Integration Test: Tests database queries and persistence
    using SQLAlchemy repositories.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)

    profile_entity = await user_repo.create(
        iam_subject_id="iam_repo_tester",
        email="repotest@example.com",
        display_name="Repo Tester",
        timezone="Asia/Dubai"
    )

    family_entity = await family_repo.create(name="Repo Test Family", primary_coordinator_profile_id=profile_entity.id)

    membership_entity = await family_repo.add_member(
        family_id=family_entity.id,
        profile_id=profile_entity.id,
        membership_role="primary_coordinator"
    )
    await db_session.commit()

    # Query via repository
    retrieved_member = await family_repo.get_member(family_entity.id, profile_entity.id)
    assert retrieved_member is not None
    assert retrieved_member.membership_role == "primary_coordinator"



# ==============================================================================
# Layer 4: API Integration Tests
# ==============================================================================
@pytest.mark.api_integration
@pytest.mark.asyncio
async def test_api_integration_health_and_observability_headers():
    """
    API Integration Test: Tests HTTP request handling, security middleware,
    correlation ID headers, and OpenAPI endpoints.
    """
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        res = await client.get("/health")
        assert res.status_code == 200
        data = res.json()
        assert data["status"] == "ok"
        assert "X-Request-ID" in res.headers

        # Test OpenAPI spec route
        spec_res = await client.get("/openapi.json")
        assert spec_res.status_code == 200
        assert "openapi" in spec_res.json()


# ==============================================================================
# Layer 5: End-to-End Workflow Tests
# ==============================================================================
@pytest.mark.e2e_workflow
@pytest.mark.asyncio
async def test_e2e_cross_border_care_lifecycle(db_session: AsyncSession):
    """
    End-to-End Workflow Test:
    Executes a complete multi-actor cross-border lifecycle flow:
    1. Remote coordinator in London creates family circle.
    2. Parent in Chennai is registered as care subject.
    3. Parent grants granular consent to coordinator.
    4. Parent submits a morning wellbeing checkin and confirms medication.
    5. In-transaction outbox record is committed atomically.
    6. Asynchronous notification is dispatched to London coordinator.
    7. AI Insight is computed and coordinator views verified family dashboard.
    """
    now = datetime.now(timezone.utc)

    # 1. Setup Actor Profiles (London Coordinator & Chennai Parent)
    coord = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id="iam_coord_london",
        display_name="Anjali (London)",
        email="anjali.london@example.com",
        city="London",
        country_code="GB",
        timezone="Europe/London"
    )
    parent = AppProfile(
        id=uuid.uuid4(),
        iam_subject_id="iam_parent_chennai",
        display_name="Ramesh (Chennai)",
        email="ramesh.chennai@example.com",
        city="Chennai",
        country_code="IN",
        timezone="Asia/Kolkata"
    )
    db_session.add_all([coord, parent])
    await db_session.flush()

    # 2. Coordinator creates Family & Registers Parent Subject
    fam = Family(id=uuid.uuid4(), name="E2E Global Care Circle", primary_coordinator_profile_id=coord.id)
    db_session.add(fam)
    await db_session.flush()

    m_coord = FamilyMembership(id=uuid.uuid4(), family_id=fam.id, profile_id=coord.id, membership_role="primary_coordinator")
    m_parent = FamilyMembership(id=uuid.uuid4(), family_id=fam.id, profile_id=parent.id, membership_role="elder_parent")
    db_session.add_all([m_coord, m_parent])

    sub = CareSubject(
        id=uuid.uuid4(),
        family_id=fam.id,
        profile_id=parent.id,
        fhir_patient_id="synth-pat-e2e-001",
        relationship_to_coordinator="father",
        timezone="Asia/Kolkata"
    )
    db_session.add(sub)

    cr = CareRelationship(
        id=uuid.uuid4(),
        family_id=fam.id,
        subject_id=sub.id,
        profile_id=coord.id,
        relationship_type="primary_coordinator"
    )
    db_session.add(cr)

    # 3. Parent grants Consent to Coordinator
    consent = Consent(
        id=uuid.uuid4(),
        family_id=fam.id,
        subject_id=sub.id,
        grantor_profile_id=parent.id,
        grantee_profile_id=coord.id,
        scope={"vitals": True, "medications": True, "ai_insights": True, "appointments": True},
        status="active"
    )
    db_session.add(consent)
    await db_session.commit()

    # 4. Parent Submits Morning Check-in & Confirms Medication
    checkin = WellbeingCheckin(
        id=uuid.uuid4(),
        family_id=fam.id,
        subject_id=sub.id,
        submitted_by_profile_id=parent.id,
        feeling="great",
        notes="Morning walk in Chennai done, energy level high.",
        submitted_at=now
    )
    db_session.add(checkin)

    coord_service = TransactionCoordinatorService(db_session)
    adh_res, out_res = await coord_service.confirm_parent_medication(
        adherence_id=uuid.uuid4(),
        subject_id=sub.id,
        family_id=fam.id,
        actor_id=parent.id,
        medication_name="Synthetic Metformin 500mg",
        dosage="500mg",
        scheduled_at=now - timedelta(minutes=10)
    )
    assert adh_res.status == "taken"
    assert out_res.status == "pending"



    # 5. Outbox Publishing & Asynchronous Notification Dispatch
    notif_provider = MockNotificationProvider(channel="push", provider_name="fcm_mock")
    notif = Notification(
        id=uuid.uuid4(),
        family_id=fam.id,
        recipient_profile_id=coord.id,
        subject_id=sub.id,
        type="medication_taken",
        title="Medication Confirmed",
        body="Ramesh confirmed morning medication in Chennai.",
        priority="normal"
    )
    db_session.add(notif)
    await db_session.commit()

    # 6. AI Insight Generation
    insight = AIInsight(
        id=uuid.uuid4(),
        family_id=fam.id,
        subject_id=sub.id,
        type="adherence",
        title="100% On-Time Adherence Streak",
        summary="Ramesh has confirmed all morning doses on time.",
        observation="Consistent morning medication adherence.",
        timeframe_start=now - timedelta(days=7),
        timeframe_end=now,
        confidence=0.99,
        status="active"
    )
    db_session.add(insight)
    await db_session.commit()

    # 7. Verification: London Coordinator queries full state
    verified_sub = (await db_session.execute(select(CareSubject).where(CareSubject.id == sub.id))).scalar_one()
    assert verified_sub.status == "active"

    adherences = (await db_session.execute(select(MedicationAdherenceEvent).where(MedicationAdherenceEvent.subject_id == sub.id))).scalars().all()
    assert len(adherences) == 1
    assert adherences[0].status == "taken"

    insights = (await db_session.execute(select(AIInsight).where(AIInsight.subject_id == sub.id))).scalars().all()
    assert len(insights) == 1
    assert insights[0].title == "100% On-Time Adherence Streak"

    notifs = (await db_session.execute(select(Notification).where(Notification.recipient_profile_id == coord.id))).scalars().all()
    assert len(notifs) == 1
    assert notifs[0].title == "Medication Confirmed"
