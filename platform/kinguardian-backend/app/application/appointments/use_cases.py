"""
Appointments Application Use Cases:
- GetUpcomingAppointmentsUseCase
- PrepareAppointmentUseCase
- InitiateAppointmentPreparationUseCase
- GenerateAppointmentDraftUseCase
- ReviewAppointmentDraftUseCase
- ShareAppointmentSummaryUseCase
"""

import uuid
from typing import List, Dict, Any, Optional
from app.domains.family.application.services import FamilyService
from app.domains.family.domain.entities import AppointmentCoordinationEntity
from app.application.appointments.workflow import (
    AppointmentPreparationWorkflow,
    AppointmentPreparationDraft
)


class GetUpcomingAppointmentsUseCase:
    """Retrieves scheduled clinical appointments and coordination statuses for a subject."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID
    ) -> List[AppointmentCoordinationEntity]:
        return await self.family_service.list_appointment_coordinations(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id
        )


class PrepareAppointmentUseCase:
    """Synthesizes clinical history and prepares pre-visit question checklists for the doctor."""
    def __init__(self, family_service: FamilyService):
        self.family_service = family_service

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_appointment_id: str,
        question_list: Optional[List[str]] = None,
        notes: Optional[str] = None
    ) -> AppointmentCoordinationEntity:
        return await self.family_service.add_appointment_coordination(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            fhir_appointment_id=fhir_appointment_id,
            preparation_status="prepared"
        )


class InitiateAppointmentPreparationUseCase:
    """Step 1 & 2: Selects appointment and validates authorization."""
    def __init__(self, workflow: AppointmentPreparationWorkflow):
        self.workflow = workflow

    async def execute(
        self,
        requester_id: uuid.UUID,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_appointment_id: str
    ) -> AppointmentPreparationDraft:
        return await self.workflow.select_appointment(
            requester_id=requester_id,
            family_id=family_id,
            subject_id=subject_id,
            fhir_appointment_id=fhir_appointment_id
        )


class GenerateAppointmentDraftUseCase:
    """Step 3 & 4: Collects context and runs AI preparation job to produce unshared draft."""
    def __init__(self, workflow: AppointmentPreparationWorkflow):
        self.workflow = workflow

    async def execute(
        self,
        requester_id: uuid.UUID,
        coordination_id: uuid.UUID,
        custom_focus_areas: Optional[List[str]] = None
    ) -> AppointmentPreparationDraft:
        await self.workflow.collect_recent_context(requester_id, coordination_id)
        return await self.workflow.run_ai_preparation_job(
            requester_id=requester_id,
            coordination_id=coordination_id,
            custom_focus_areas=custom_focus_areas
        )


class ReviewAppointmentDraftUseCase:
    """Step 5: Human review and approval of draft summary."""
    def __init__(self, workflow: AppointmentPreparationWorkflow):
        self.workflow = workflow

    async def execute(
        self,
        reviewer_id: uuid.UUID,
        coordination_id: uuid.UUID,
        approved_questions: Optional[List[str]] = None,
        custom_notes: Optional[str] = None
    ) -> AppointmentPreparationDraft:
        return await self.workflow.review_draft_summary(
            reviewer_id=reviewer_id,
            coordination_id=coordination_id,
            approved_questions=approved_questions,
            custom_notes=custom_notes
        )


class ShareAppointmentSummaryUseCase:
    """Step 6: Explicit user action to share the reviewed summary."""
    def __init__(self, workflow: AppointmentPreparationWorkflow):
        self.workflow = workflow

    async def execute(
        self,
        requester_id: uuid.UUID,
        coordination_id: uuid.UUID,
        recipients: List[str]
    ) -> AppointmentPreparationDraft:
        return await self.workflow.share_appointment_summary(
            requester_id=requester_id,
            coordination_id=coordination_id,
            recipients=recipients
        )
