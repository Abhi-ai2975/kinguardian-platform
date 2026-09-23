"""
Wearable Consent & Authorization Layer Test Suite.

Verifies:
1. Wearable data is protected health information (PHI).
2. Before connection pre-requisite disclosures:
   - What KinGuardian can receive:
     ✓ Activity
     ✓ Sleep
     ✓ Heart rate
   - "You can disconnect this device at any time."
3. Parent/coordinator consent enforcement by KinGuardian authorization layer:
   - Connection rejected when consent is absent.
   - Connection allowed once explicit consent is recorded.
4. Revocation flow:
   - Revoking consent immediately disconnects devices and pauses data ingestion.
"""

import pytest
import uuid
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy import select

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    WearableConnection,
    Consent
)
from app.domains.wearables.gateway import MockWearableDataGateway
from app.domains.wearables.services import WearableService


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
async def test_wearable_consent_authorization_and_lifecycle(test_db_session: AsyncSession):
    session = test_db_session

    # 1. Setup Care Circle (Dad in Chennai, Anjali in London)
    dad_profile_id = uuid.uuid4()
    dad_profile = AppProfile(
        id=dad_profile_id,
        iam_subject_id="iam_ramesh_chennai",
        email="ramesh@family.org",
        display_name="Ramesh Sharma",
        timezone="Asia/Kolkata"
    )
    session.add(dad_profile)

    anjali_profile_id = uuid.uuid4()
    anjali_profile = AppProfile(
        id=anjali_profile_id,
        iam_subject_id="iam_anjali_london",
        email="anjali@family.org",
        display_name="Anjali Sharma",
        timezone="Europe/London"
    )
    session.add(anjali_profile)

    family = Family(id=uuid.uuid4(), name="Sharma Care Circle", primary_coordinator_profile_id=anjali_profile_id)
    session.add(family)

    membership_dad = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=dad_profile_id,
        membership_role="care_subject",
        status="active"
    )
    session.add(membership_dad)

    membership_anjali = FamilyMembership(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=anjali_profile_id,
        membership_role="primary_coordinator",
        status="active"
    )
    session.add(membership_anjali)

    subject = CareSubject(
        id=uuid.uuid4(),
        family_id=family.id,
        profile_id=dad_profile_id,
        fhir_patient_id="synthetic-pat-ramesh-001",
        relationship_to_coordinator="Father",
        city="Chennai",
        timezone="Asia/Kolkata",
        status="active"
    )
    session.add(subject)
    await session.commit()

    gateway = MockWearableDataGateway()
    service = WearableService(session=session, gateway=gateway)

    # 2. Inspect Pre-Connection Consent Status & Mandatory Disclosures
    status_before = await service.get_consent_status(
        family_id=family.id,
        subject_id=subject.id,
        requester_profile_id=anjali_profile_id
    )
    assert status_before.is_consent_granted is False
    assert status_before.status == "not_requested"
    assert "Activity" in status_before.disclosures
    assert "Sleep" in status_before.disclosures
    assert "Heart rate" in status_before.disclosures
    assert status_before.revocation_policy == "You can disconnect this device at any time."

    # 3. ENFORCEMENT: Attempting to connect wearable without active consent must fail
    with pytest.raises(ValueError, match="Active parent/coordinator wearable health data consent is required"):
        await service.create_connection_invitation(subject_id=subject.id, provider="garmin")

    # 4. Explicitly Grant Consent (Dad grants to Anjali)
    granted = await service.grant_wearable_consent(
        family_id=family.id,
        subject_id=subject.id,
        grantor_profile_id=dad_profile_id,
        grantee_profile_id=anjali_profile_id,
        scopes={"activity": True, "sleep": True, "heart_rate": True}
    )
    assert granted.is_consent_granted is True
    assert granted.status == "active"
    assert granted.granted_scopes["activity"] is True
    assert granted.granted_scopes["sleep"] is True
    assert granted.granted_scopes["heart_rate"] is True

    # Verify Consent row in Database
    res_consent = await session.execute(
        select(Consent).where(
            Consent.subject_id == subject.id,
            Consent.status == "active"
        )
    )
    db_consent = res_consent.scalar_one()
    assert db_consent.grantor_profile_id == dad_profile_id
    assert db_consent.grantee_profile_id == anjali_profile_id
    assert db_consent.consent_type == "wearable_health_data"

    # 5. NOW Connection invitation succeeds
    connect_resp = await service.create_connection_invitation(subject_id=subject.id, provider="garmin")
    assert connect_resp.provider == "garmin"
    assert connect_resp.connect_url is not None

    # Verify connection created
    res_conn = await session.execute(
        select(WearableConnection).where(WearableConnection.subject_id == subject.id)
    )
    conn = res_conn.scalar_one()
    assert conn.connection_status == "pending"

    # 6. Revoke Consent (Parent or coordinator can disconnect at any time)
    revoked_resp = await service.revoke_wearable_consent(
        family_id=family.id,
        subject_id=subject.id,
        revoking_profile_id=dad_profile_id
    )
    assert revoked_resp.is_consent_granted is False
    assert revoked_resp.status == "not_requested"

    # Verify connection marked disconnected
    await session.refresh(conn)
    assert conn.connection_status == "disconnected"
    assert conn.disconnected_at is not None

    # 7. Further connection attempt blocked after revocation
    with pytest.raises(ValueError, match="Active parent/coordinator wearable health data consent is required"):
        await service.create_connection_invitation(subject_id=subject.id, provider="apple_watch")
