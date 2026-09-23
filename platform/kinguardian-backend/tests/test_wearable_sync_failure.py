"""
Wearable Sync Failure & Ingress Safety Test Suite.

Verifies:
1. If syncing fails / device is delayed:
   - Parent sees: “Your health device needs to reconnect.”
   - Coordinator sees: “Dad's Garmin hasn't synced for 12 hours.”
   - Action: “Reconnect”
2. Critical Safety Invariant:
   - Do NOT interpret missing wearable data as a health event (is_health_event=False).
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.core.database import Base
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    WearableConnection
)
from app.domains.wearables.schemas import SyncStatusState
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
async def test_sync_failure_12_hours_outage_scenario(test_db_session: AsyncSession):
    """
    Verifies user requested scenario:
    If syncing fails / hasn't synced for 12 hours:
    Parent sees:
      “Your health device needs to reconnect.”
      Action: Reconnect

    Coordinator sees:
      “Dad's Garmin hasn't synced for 12 hours.”
      Action: Reconnect

    Do not interpret missing wearable data as a health event (is_health_event=False).
    """
    session = test_db_session
    fam_id = uuid.uuid4()
    dad_profile_id = uuid.uuid4()
    anjali_profile_id = uuid.uuid4()
    subj_id = uuid.uuid4()

    dad_profile = AppProfile(
        id=dad_profile_id,
        iam_subject_id=f"iam_{uuid.uuid4().hex[:8]}",
        email="dad@test.com",
        display_name="Sundaram"
    )
    anjali_profile = AppProfile(
        id=anjali_profile_id,
        iam_subject_id=f"iam_{uuid.uuid4().hex[:8]}",
        email="anjali@test.com",
        display_name="Anjali"
    )
    family = Family(id=fam_id, name="Family", primary_coordinator_profile_id=anjali_profile_id)
    subject = CareSubject(
        id=subj_id,
        family_id=fam_id,
        profile_id=dad_profile_id,
        fhir_patient_id="fhir_patient_dad_001",
        relationship_to_coordinator="Dad"
    )

    mem_dad = FamilyMembership(
        id=uuid.uuid4(),
        family_id=fam_id,
        profile_id=dad_profile_id,
        membership_role="subject",
        status="active"
    )
    mem_anjali = FamilyMembership(
        id=uuid.uuid4(),
        family_id=fam_id,
        profile_id=anjali_profile_id,
        membership_role="primary_coordinator",
        status="active"
    )

    # 12-hour sync outage (delayed sync)
    now = datetime.now(timezone.utc)
    sync_12h_ago = now - timedelta(hours=12, minutes=5)

    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=fam_id,
        subject_id=subj_id,
        profile_id=dad_profile_id,
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subj_id}",
        connection_status="connected",
        last_sync_at=sync_12h_ago
    )

    session.add_all([dad_profile, anjali_profile, family, subject, mem_dad, mem_anjali, conn])
    await session.commit()

    service = WearableService(session=session)

    # 1. Coordinator View (Anjali in London)
    coord_status = await service.get_care_subject_sync_status(subj_id, view_mode="coordinator")
    assert coord_status.overall_status in (SyncStatusState.DELAYED, SyncStatusState.ERROR)
    assert coord_status.sync_message == "Dad's Garmin hasn't synced for 12 hours."
    assert coord_status.action_label == "Reconnect"
    assert coord_status.action_type == "reconnect"
    assert coord_status.is_health_event is False

    garmin_dev = coord_status.devices[0]
    assert garmin_dev.device_title == "Dad's Garmin"
    assert garmin_dev.sync_message == "Dad's Garmin hasn't synced for 12 hours."
    assert garmin_dev.action_label == "Reconnect"
    assert garmin_dev.is_health_event is False

    # 2. Parent View (Dad in Chennai)
    parent_status = await service.get_care_subject_sync_status(subj_id, view_mode="parent")
    assert parent_status.sync_message == "Your health device needs to reconnect."
    assert parent_status.action_label == "Reconnect"
    assert parent_status.action_type == "reconnect"
    assert parent_status.is_health_event is False

    garmin_parent = parent_status.devices[0]
    assert garmin_parent.device_title == "My watch"
    assert garmin_parent.sync_message == "Your health device needs to reconnect."
    assert garmin_parent.action_label == "Reconnect"
    assert garmin_parent.is_health_event is False


@pytest.mark.asyncio
async def test_sync_failure_error_status_behavior(test_db_session: AsyncSession):
    """
    Verifies sync failure with explicit error status.
    """
    session = test_db_session
    fam_id = uuid.uuid4()
    subj_id = uuid.uuid4()

    dad_profile = AppProfile(id=uuid.uuid4(), iam_subject_id=f"iam_{uuid.uuid4().hex[:8]}", email="dad@test.com", display_name="Sundaram")
    family = Family(id=fam_id, name="Family")
    subject = CareSubject(id=subj_id, family_id=fam_id, profile_id=dad_profile.id, fhir_patient_id="fhir_patient_dad_002", relationship_to_coordinator="Dad")

    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=fam_id,
        subject_id=subj_id,
        profile_id=dad_profile.id,
        provider="apple_health",
        open_wearables_user_id=f"kinguardian_subject_{subj_id}",
        connection_status="error"
    )

    session.add_all([dad_profile, family, subject, conn])
    await session.commit()

    service = WearableService(session=session)

    # Coordinator
    coord = await service.get_care_subject_sync_status(subj_id, view_mode="coordinator")
    assert coord.overall_status == SyncStatusState.ERROR
    assert coord.action_label == "Reconnect"
    assert coord.is_health_event is False

    # Parent
    parent = await service.get_care_subject_sync_status(subj_id, view_mode="parent")
    assert parent.overall_status == SyncStatusState.ERROR
    assert parent.sync_message == "Your health device needs to reconnect."
    assert parent.action_label == "Reconnect"
    assert parent.is_health_event is False
