"""
Cache Invalidation Abstraction Test Suite:
Verifies that when medication is confirmed, the cache abstraction explicitly invalidates:
1. parent.home
2. coordinator.home
3. subject.medications
4. notifications
"""

import pytest
import uuid
from datetime import datetime, timezone

from app.core.redis import RedisCacheService, EphemeralMemoryBackend
from app.core.cache.keys import CacheKeys
from app.core.cache.invalidator import DomainCacheInvalidator
from app.domains.family.application.services import FamilyService
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.application.medication.use_cases import ConfirmMedicationUseCase
from sqlalchemy.ext.asyncio import AsyncSession


def test_cache_invalidation_rules_medication_confirmed():
    """
    Unit test verifying DomainCacheInvalidator clears the exact required projections.
    """
    backend = EphemeralMemoryBackend()
    cache = RedisCacheService(backend=backend)
    invalidator = DomainCacheInvalidator(cache_service=cache)

    family_id = uuid.uuid4()
    parent_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # 1. Pre-populate cache with projections
    key_parent_home = CacheKeys.parent_home(parent_id=parent_id, subject_id=subject_id)
    key_coord_home = CacheKeys.coordinator_home(family_id=family_id)
    key_subject_meds = CacheKeys.subject_medications(subject_id=subject_id)
    key_notifications = CacheKeys.notifications(family_id=family_id, recipient_id=parent_id)

    cache.set(key_parent_home, {"status": "good", "adherence": "pending"})
    cache.set(key_coord_home, {"family_name": "Sharma Circle", "unread": 2})
    cache.set(key_subject_meds, [{"name": "Amlodipine 5mg", "status": "due"}])
    cache.set(key_notifications, [{"title": "Medication Due", "priority": "high"}])

    # Assert cache is primed
    assert cache.get(key_parent_home) is not None
    assert cache.get(key_coord_home) is not None
    assert cache.get(key_subject_meds) is not None
    assert cache.get(key_notifications) is not None

    # 2. Trigger Medication Confirmed Invalidation
    invalidated_keys = invalidator.invalidate_on_medication_confirmed(
        family_id=family_id,
        subject_id=subject_id,
        parent_id=parent_id,
        recipient_id=parent_id
    )

    # 3. Assert all 4 required projections are invalidated
    assert cache.get(key_parent_home) is None
    assert cache.get(key_coord_home) is None
    assert cache.get(key_subject_meds) is None
    assert cache.get(key_notifications) is None
    assert len(invalidated_keys) == 4


@pytest.mark.asyncio
async def test_confirm_medication_use_case_triggers_cache_invalidation(db_session: AsyncSession):
    """
    Integration test verifying ConfirmMedicationUseCase executes domain workflow
    and invalidates parent.home, coordinator.home, subject.medications, notifications.
    """
    user_repo = SQLAlchemyAppProfileRepository(db_session)
    family_repo = SQLAlchemyFamilyRepository(db_session)
    consent_repo = SQLAlchemyConsentRepository(db_session)
    event_logger = EventService(db_session)
    family_service = FamilyService(user_repo, family_repo, consent_repo, event_logger)

    backend = EphemeralMemoryBackend()
    cache = RedisCacheService(backend=backend)
    invalidator = DomainCacheInvalidator(cache_service=cache)
    use_case = ConfirmMedicationUseCase(family_service=family_service, cache_invalidator=invalidator)

    # 1. Setup Family & Subject
    parent = await family_service.get_or_create_profile(
        iam_subject_id="iam_parent_cache_01",
        email="parent.cache@kinguardian.com",
        display_name="Deepak",
        timezone="Asia/Kolkata"
    )
    family = await family_service.create_care_circle(
        creator_id=parent.id,
        name="Deepak Care Circle",
        creator_role="parent"
    )
    subject = await family_service.add_care_subject(
        requester_id=parent.id,
        family_id=family.id,
        fhir_patient_id="fhir-pat-deepak-01",
        profile_id=parent.id,
        relationship_to_coordinator="self"
    )

    # 2. Pre-populate cache keys
    k_parent_home = CacheKeys.parent_home(parent_id=parent.id, subject_id=subject.id)
    k_coord_home = CacheKeys.coordinator_home(family_id=family.id)
    k_subject_meds = CacheKeys.subject_medications(subject_id=subject.id)
    k_notifs = CacheKeys.notifications(family_id=family.id, recipient_id=parent.id)

    cache.set(k_parent_home, {"subject_status": "due"})
    cache.set(k_coord_home, {"summary": "due"})
    cache.set(k_subject_meds, [{"name": "Metformin", "status": "due"}])
    cache.set(k_notifs, [{"type": "medication_reminder"}])

    # 3. Execute ConfirmMedicationUseCase
    scheduled_time = datetime.now(timezone.utc)
    event = await use_case.execute(
        requester_id=parent.id,
        family_id=family.id,
        subject_id=subject.id,
        fhir_medication_request_id="med-req-metformin-500",
        scheduled_at=scheduled_time,
        source="parent"
    )
    assert event.status == "taken"

    # 4. Assert cache keys were invalidated
    assert cache.get(k_parent_home) is None
    assert cache.get(k_coord_home) is None
    assert cache.get(k_subject_meds) is None
    assert cache.get(k_notifs) is None
