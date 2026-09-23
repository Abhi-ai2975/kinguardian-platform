"""
Wearable Sync Status Test Suite.

Verifies:
1. The 6 canonical states:
   - Connected
   - Syncing
   - Up to date
   - Delayed
   - Error
   - Disconnected
2. Coordinator View:
   Dad's Garmin
   ✓ Up to date
   Last sync: 8 minutes ago
3. Parent View:
   My watch
   ✓ Connected
4. Relative timestamp formatting utility.
5. GET /subjects/{subject_id}/wearables/sync-status endpoint.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest
from httpx import AsyncClient, ASGITransport
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from app.main import app
from app.core.database import Base, get_db
from app.core.security import get_current_user
from app.domains.family.infrastructure.models import (
    AppProfile,
    Family,
    FamilyMembership,
    CareSubject,
    WearableConnection
)
from app.domains.wearables.schemas import (
    SyncStatusState,
    DeviceSyncStatusItem,
    CareSubjectSyncStatusResponse
)
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


def test_sync_status_state_enum_values():
    """Verifies all 6 required canonical sync status states are present."""
    assert SyncStatusState.CONNECTED.value == "connected"
    assert SyncStatusState.SYNCING.value == "syncing"
    assert SyncStatusState.UP_TO_DATE.value == "up_to_date"
    assert SyncStatusState.DELAYED.value == "delayed"
    assert SyncStatusState.ERROR.value == "error"
    assert SyncStatusState.DISCONNECTED.value == "disconnected"


def test_format_relative_sync_time_helper():
    """Verifies human-friendly relative sync time formatting."""
    now = datetime(2026, 8, 27, 19, 30, 0, tzinfo=timezone.utc)

    # 8 minutes ago
    t_8m = now - timedelta(minutes=8)
    assert WearableService.format_relative_sync_time(t_8m, now) == "Last sync: 8 minutes ago"

    # Just now (< 1 min)
    t_30s = now - timedelta(seconds=30)
    assert WearableService.format_relative_sync_time(t_30s, now) == "Last sync: just now"

    # 2 hours ago
    t_2h = now - timedelta(hours=2)
    assert WearableService.format_relative_sync_time(t_2h, now) == "Last sync: 2 hours ago"

    # 3 days ago
    t_3d = now - timedelta(days=3)
    assert WearableService.format_relative_sync_time(t_3d, now) == "Last sync: 3 days ago"

    # None
    assert WearableService.format_relative_sync_time(None, now) is None


@pytest.mark.asyncio
async def test_coordinator_and_parent_sync_status_views(test_db_session: AsyncSession):
    """
    Verifies the user scenarios:
    Coordinator View:
      Dad's Garmin
      ✓ Up to date
      Last sync: 8 minutes ago

    Parent View:
      My watch
      ✓ Connected
    """
    session = test_db_session
    fam_id = uuid.uuid4()
    dad_profile_id = uuid.uuid4()
    anjali_profile_id = uuid.uuid4()
    subj_id = uuid.uuid4()

    dad_profile = AppProfile(id=dad_profile_id, iam_subject_id=f"iam_{uuid.uuid4().hex[:8]}", email=f"dad_{uuid.uuid4().hex[:6]}@test.com", display_name="Sundaram")
    anjali_profile = AppProfile(id=anjali_profile_id, iam_subject_id=f"iam_{uuid.uuid4().hex[:8]}", email=f"anjali_{uuid.uuid4().hex[:6]}@test.com", display_name="Anjali")
    family = Family(id=fam_id, name="Sundaram Family", primary_coordinator_profile_id=anjali_profile_id)
    subject = CareSubject(id=subj_id, family_id=fam_id, profile_id=dad_profile_id, fhir_patient_id=f"fhir_dad_{uuid.uuid4().hex[:6]}", relationship_to_coordinator="Dad")

    mem_dad = FamilyMembership(id=uuid.uuid4(), family_id=fam_id, profile_id=dad_profile_id, membership_role="subject", status="active")
    mem_anjali = FamilyMembership(id=uuid.uuid4(), family_id=fam_id, profile_id=anjali_profile_id, membership_role="primary_coordinator", status="active")

    # 8 minutes ago sync
    now = datetime.now(timezone.utc)
    sync_8m_ago = now - timedelta(minutes=8)

    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=fam_id,
        subject_id=subj_id,
        profile_id=dad_profile_id,
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subj_id}",
        connection_status="connected",
        last_sync_at=sync_8m_ago
    )

    session.add_all([dad_profile, anjali_profile, family, subject, mem_dad, mem_anjali, conn])
    await session.commit()

    service = WearableService(session=session)

    # 1. Coordinator View (Anjali in London)
    coord_resp = await service.get_care_subject_sync_status(subj_id, view_mode="coordinator")
    assert coord_resp.subject_id == subj_id
    assert coord_resp.view_mode == "coordinator"
    assert len(coord_resp.devices) == 1
    garmin_coord = coord_resp.devices[0]
    assert garmin_coord.device_title == "Dad's Garmin"
    assert garmin_coord.status == SyncStatusState.UP_TO_DATE
    assert garmin_coord.status_label == "✓ Up to date"
    assert garmin_coord.last_sync_relative is not None
    assert "8 minutes ago" in garmin_coord.last_sync_relative

    # 2. Parent View (Dad in Chennai)
    parent_resp = await service.get_care_subject_sync_status(subj_id, view_mode="parent")
    assert parent_resp.subject_id == subj_id
    assert parent_resp.view_mode == "parent"
    assert len(parent_resp.devices) == 1
    garmin_parent = parent_resp.devices[0]
    assert garmin_parent.device_title == "My watch"
    assert garmin_parent.status == SyncStatusState.UP_TO_DATE
    assert garmin_parent.status_label == "✓ Connected"


@pytest.mark.asyncio
async def test_get_sync_status_rest_endpoint(test_db_session: AsyncSession):
    """
    Verifies GET /subjects/{subject_id}/wearables/sync-status REST endpoint.
    """
    session = test_db_session
    fam_id = uuid.uuid4()
    anjali_profile_id = uuid.uuid4()
    subj_id = uuid.uuid4()

    anjali_profile = AppProfile(id=anjali_profile_id, iam_subject_id=f"iam_{uuid.uuid4().hex[:8]}", email=f"anjali_{uuid.uuid4().hex[:6]}@test.com", display_name="Anjali")
    family = Family(id=fam_id, name="Family", primary_coordinator_profile_id=anjali_profile_id)
    subject = CareSubject(id=subj_id, family_id=fam_id, profile_id=uuid.uuid4(), fhir_patient_id=f"fhir_dad_{uuid.uuid4().hex[:6]}", relationship_to_coordinator="Dad")
    mem_anjali = FamilyMembership(id=uuid.uuid4(), family_id=fam_id, profile_id=anjali_profile_id, membership_role="primary_coordinator", status="active")



    conn = WearableConnection(
        id=uuid.uuid4(),
        family_id=fam_id,
        subject_id=subj_id,
        profile_id=subject.profile_id,
        provider="garmin",
        open_wearables_user_id=f"kinguardian_subject_{subj_id}",
        connection_status="connected",
        last_sync_at=datetime.now(timezone.utc) - timedelta(minutes=8)
    )

    session.add_all([anjali_profile, family, subject, mem_anjali, conn])
    await session.commit()

    app.dependency_overrides[get_db] = lambda: session
    app.dependency_overrides[get_current_user] = lambda: anjali_profile

    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.get(
                f"/api/v1/subjects/{subj_id}/wearables/sync-status?view_mode=coordinator"
            )
            assert resp.status_code == 200
            data = resp.json()
            assert data["subject_id"] == str(subj_id)
            assert data["view_mode"] == "coordinator"
            assert len(data["devices"]) == 1
            assert data["devices"][0]["device_title"] == "Dad's Garmin"
            assert data["devices"][0]["status_label"] == "✓ Up to date"
            assert "8 minutes ago" in data["devices"][0]["last_sync_relative"]
    finally:
        app.dependency_overrides.clear()
