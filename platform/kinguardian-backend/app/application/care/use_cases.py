"""
Care Application Use Cases:
- GetParentHealthSummaryUseCase
- SubmitParentCheckInUseCase
- CreateCareTaskUseCase
- AssignCareTaskUseCase
- CompleteCareTaskUseCase
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta

from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import WellbeingCheckinEntity, CareTaskEntity


class GetParentHealthSummaryUseCase:
    """Aggregates multi-dimensional health summary for a care subject."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> Dict[str, Any]:
        subject = await self.family_service.get_care_subject(requester_id, subject_id)

        latest_checkin = await self.family_service.get_latest_subject_checkin(requester_id, subject_id)


        adherence_events = await self.family_service.list_adherence_events(requester_id, family_id, subject_id)

        return {
            "subject_id": str(subject_id),
            "family_id": str(family_id),
            "fhir_patient_id": subject.fhir_patient_id,
            "relationship": subject.relationship_to_coordinator,
            "latest_checkin": {
                "feeling": latest_checkin.feeling,
                "notes": latest_checkin.notes,
                "created_at": latest_checkin.created_at.isoformat() if latest_checkin.created_at else None
            } if latest_checkin else None,
            "adherence_count": len(adherence_events),
            "status": "active"
        }


class SubmitParentCheckInUseCase:
    """Processes parent-submitted mood, wellness, voice check-ins and logs domain events."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        subject_id: uuid.UUID,
        feeling: str,
        notes: Optional[str] = None,
        voice_file_id: Optional[uuid.UUID] = None,
        severity: str = "low"
    ) -> WellbeingCheckinEntity:
        return await self.family_service.submit_subject_checkin(
            requester_id=requester_id,
            subject_id=subject_id,
            feeling=feeling,
            notes=notes,
            voice_file_id=voice_file_id,
            severity=severity
        )


class CreateCareTaskUseCase:
    """Creates a new actionable care task within a family circle."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        assigned_to_profile_id: Optional[uuid.UUID],
        title: str,
        description: Optional[str] = None,
        category: str = "other",
        priority: str = "normal",
        due_at: Optional[datetime] = None
    ) -> CareTaskEntity:
        now = datetime.now(timezone.utc)
        return await self.family_service.add_care_task(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            assigned_to_profile_id=assigned_to_profile_id or requester_id,
            title=title,
            description=description,
            category=category,
            priority=priority,
            due_at=due_at or (now + timedelta(days=1))
        )




class AssignCareTaskUseCase:
    """Assigns an existing care task to a specific caregiver or coordinator profile."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        task_id: uuid.UUID,
        assigned_to_profile_id: uuid.UUID
    ) -> CareTaskEntity:
        return await self.family_service.assign_care_task(

            requester_id=requester_id,
            task_id=task_id,
            assigned_to_profile_id=assigned_to_profile_id
        )



class CompleteCareTaskUseCase:
    """Marks a care task as completed and emits task completion domain events."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        task_id: uuid.UUID
    ) -> CareTaskEntity:
        return await self.family_service.complete_care_task(
            requester_id=requester_id,
            family_id=family_id,
            task_id=task_id
        )
