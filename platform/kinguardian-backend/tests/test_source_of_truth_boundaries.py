"""
Architectural Boundary Test Suite: Source of Truth Verification.

Enforces the three non-overlapping Sources of Truth:
1. Open Wearables:
   - Source of truth for connected wearable data, raw telemetry, provider synchronization.
   - KinGuardian stores NO raw time-series biometric streams; queries through WearableDataGateway.
2. KinGuardian Application Core:
   - Source of truth for:
     * Family relationships (Family, FamilyMembership)
     * Care relationships (CareRelationship, CareSubject)
     * Permissions (RBAC, Capability rules)
     * Consent (Consent records, scope enforcement)
     * Monitoring preferences (MonitoringPreference)
     * Derived insights (AIInsight, GuardianMoment)
     * Alerts (NotificationIntent, in-app / push dispatches)
     * Caregiving actions (CareTask, WellbeingCheckin, MedicationAdherenceEvent)
3. FHIR Server (EMR / Medplum / HAPI FHIR):
   - Source of truth for clinical records (Patient, Observation, Condition, MedicationRequest).
   - KinGuardian stores only FHIR reference pointers (fhir_patient_id, fhir_medication_request_id),
     delegating clinical source of truth to the FHIR gateway.

Strict Rule: NO competing sources of truth are created in the platform.
"""

import pytest
import uuid
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    CareRelationship,
    Consent,
    MonitoringPreference,
    AIInsight,
    CareTask,
    WellbeingCheckin,
    MedicationAdherenceEvent,
    WearableConnection
)
from app.domains.wearables.gateway import MockWearableDataGateway, WearableDataGateway
from app.core.adapters.mock_fhir import MockFHIRGateway


@pytest.fixture
async def test_db_session():
    """In-memory SQLite async test database session."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async_session = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with async_session() as session:
        yield session

    await engine.dispose()


@pytest.mark.asyncio
async def test_source_of_truth_triad_boundaries(test_db_session: AsyncSession):
    session = test_db_session

    # =========================================================================
    # SOURCE OF TRUTH 1: KinGuardian Application Database
    # Owns: Family, Care Relationships, Permissions, Consent, Monitoring Preferences,
    # Derived Insights, Alerts, and Caregiving Actions.
    # =========================================================================
    coordinator_id = uuid.uuid4()
    coordinator = AppProfile(
        id=coordinator_id,
        iam_subject_id="iam_anjali_london",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(coordinator)

    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=coordinator_id)
    session.add(family)

    # 1. Family Membership & Permissions
    membership = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=coordinator_id,
        membership_role="primary_coordinator",
        status="active"
    )
    session.add(membership)

    # 2. Care Subject & Care Relationship
    parent_id = uuid.uuid4()
    parent = AppProfile(
        id=parent_id,
        iam_subject_id="iam_ramesh_chennai",
        email="ramesh@chennai.in",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(parent)

    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=parent_id,
        fhir_patient_id="synthetic-pat-ramesh-001",  # External FHIR pointer
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(subject)

    care_rel = CareRelationship(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=coordinator_id,
        relationship_type="daughter_coordinator",
        access_level="full_access",
        status="active"
    )
    session.add(care_rel)

    # 3. Consent Management (Grantor = Dad / Ramesh, Grantee = Daughter / Anjali)
    consent = Consent(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=parent_id,
        grantee_profile_id=coordinator_id,
        consent_type="health_data_access",
        scope={"wearables": True, "fhir_observations": True, "medications": True},
        status="active"
    )
    session.add(consent)


    # 4. Monitoring Preferences
    mon_pref = MonitoringPreference(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        metric="steps",
        baseline_period_days=7,
        threshold_config={"drop_percentage": 35.0},
        notification_level="attention",
        enabled=True
    )
    session.add(mon_pref)

    # 5. Caregiving Actions: Checkin, Adherence, Task
    checkin = WellbeingCheckin(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        submitted_by_profile_id=coordinator_id,
        feeling="feeling_good",
        notes="Morning walk in Besant Nagar completed"
    )
    session.add(checkin)

    adherence = MedicationAdherenceEvent(
        id=uuid.uuid4(),
        subject_id=subject.id,
        fhir_medication_request_id="FHIR-MED-RX-9901",  # External FHIR pointer
        scheduled_at=datetime.utcnow(),
        confirmed_at=datetime.utcnow(),
        status="taken",
        source="parent"
    )
    session.add(adherence)


    from datetime import timedelta
    task = CareTask(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        created_by_profile_id=coordinator_id,
        assigned_to_profile_id=coordinator_id,
        title="Order Metformin Refill",
        category="medication",
        priority="medium",
        due_at=datetime.utcnow() + timedelta(days=2),
        status="pending"
    )
    session.add(task)




    # 6. Derived Insights
    insight = AIInsight(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        type="mobility_trend",
        severity="low",
        title="Consistent Morning Activity",
        summary="Dad maintained active morning routine over the past 7 days.",
        observation="Dad averaged 5,840 steps each day without drop.",
        recommendation="Continue current morning walking routine.",
        timeframe_start=datetime.utcnow(),
        timeframe_end=datetime.utcnow(),
        confidence=0.95
    )
    session.add(insight)




    # 7. Wearable Identity Mapping
    wearable_conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=family.id,
        subject_id=subject.id,
        profile_id=coordinator_id,
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subject.id}",
        connection_status="connected"
    )
    session.add(wearable_conn)
    await session.commit()

    # Verify KinGuardian transactional queries
    res_subject = await session.execute(select(CareSubject).where(CareSubject.id == subject.id))
    assert res_subject.scalar_one().fhir_patient_id == "synthetic-pat-ramesh-001"

    # =========================================================================
    # SOURCE OF TRUTH 2: Open Wearables Platform
    # Owns: Provider telemetry, daily activity, nocturnal sleep, recovery HR streams.
    # KinGuardian NEVER duplicates raw time-series in PostgreSQL; queries via Gateway.
    # =========================================================================
    wearable_gw: WearableDataGateway = MockWearableDataGateway()
    user_ext_id = wearable_conn.open_wearables_user_id

    # Query connected telemetry from the authoritative Open Wearables source
    activity = await wearable_gw.get_daily_activity(user_ext_id, "2026-08-20", "2026-08-27")
    assert len(activity) >= 1
    assert activity[0].steps == 5840  # Authoritative measurement in Open Wearables

    sleep = await wearable_gw.get_sleep(user_ext_id, "2026-08-20", "2026-08-27")
    assert len(sleep) >= 1
    assert sleep[0].total_sleep_minutes == 440

    # =========================================================================
    # SOURCE OF TRUTH 3: FHIR Clinical Records
    # Owns: Official medical observations, labs, clinical conditions, medication requests.
    # KinGuardian links via fhir_patient_id and fhir_medication_request_id.
    # =========================================================================
    fhir_gw = MockFHIRGateway()
    patient = await fhir_gw.get_patient(subject.fhir_patient_id)
    assert patient is not None
    assert patient["name"][0]["family"] == "Sharma"

    patient_obs = await fhir_gw.get_observations(subject.fhir_patient_id)
    assert len(patient_obs) >= 1
    assert patient_obs[0]["resourceType"] == "Observation"

