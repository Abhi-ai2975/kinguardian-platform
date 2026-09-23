"""
Medication Application Use Cases:
- ConfirmMedicationUseCase
- SendMedicationReminderUseCase
"""

import uuid
from typing import Optional
from datetime import datetime, timezone
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import MedicationAdherenceEventEntity
from app.core.cache.invalidator import domain_cache_invalidator, DomainCacheInvalidator


class ConfirmMedicationUseCase:
    """Confirms that a scheduled medication was taken by the parent / caregiver."""
    def __init__(self, family_service: FamilyService, cache_invalidator: Optional[DomainCacheInvalidator] = None):
        self.family_service = family_service
        self.cache_invalidator = cache_invalidator or domain_cache_invalidator

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_medication_request_id: str,
        scheduled_at: datetime,
        source: str = "parent"
    ) -> MedicationAdherenceEventEntity:
        event = await self.family_service.record_adherence_event(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            fhir_medication_request_id=fhir_medication_request_id,
            scheduled_at=scheduled_at,
            status="taken",
            source=source
        )

        # Invalidate affected cache projections:
        # - parent.home
        # - coordinator.home
        # - subject.medications
        # - notifications
        self.cache_invalidator.invalidate_on_medication_confirmed(
            family_id=family_id,
            subject_id=subject_id,
            parent_id=requester_id
        )

        return event



class SendMedicationReminderUseCase:
    """Dispatches a medication intake reminder to the parent or caregiver."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        recipient_profile_id: uuid.UUID,
        subject_id: uuid.UUID,
        medication_name: str,
        scheduled_time_str: str
    ):
        return await self.family_service.add_notification(
            requester_id=requester_id,
            family_id=family_id,
            recipient_profile_id=recipient_profile_id,
            type="medication_reminder",
            priority="high",
            title=f"Medication Reminder: {medication_name}",
            body=f"Please take {medication_name} scheduled for {scheduled_time_str}.",
            subject_id=subject_id
        )
