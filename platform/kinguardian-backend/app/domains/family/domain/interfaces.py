import abc
import uuid
from typing import List, Optional
from datetime import datetime
from app.domains.family.domain.entities import (
    AppProfileEntity,
    FamilyEntity,
    FamilyMembershipEntity,
    FamilyRelationshipEntity,
    CareSubjectEntity,
    CareRelationshipEntity,
    CareTaskEntity,
    MedicationAdherenceEventEntity,
    WellbeingCheckinEntity,
    MonitoringPreferenceEntity,
    AIInsightSourceEntity,
    AIInsightEntity,
    NotificationEntity,
    NotificationDeliveryEntity,
    FamilyMessageEntity,
    FamilyConversationEntity,
    AppointmentCoordinationEntity,
    HealthDocumentEntity,
    DocumentExtractionEntity,
    AIConversationEntity,
    AIActionEntity,
    ConsentEntity
)


class IAppProfileRepository(abc.ABC):
    @abc.abstractmethod
    async def get_by_id(self, profile_id: uuid.UUID) -> Optional[AppProfileEntity]:
        pass

    @abc.abstractmethod
    async def get_by_email(self, email: str) -> Optional[AppProfileEntity]:
        pass

    @abc.abstractmethod
    async def get_by_iam_subject_id(self, iam_subject_id: str) -> Optional[AppProfileEntity]:
        pass

    @abc.abstractmethod
    async def create(
        self,
        iam_subject_id: str,
        email: str,
        display_name: Optional[str] = None,
        timezone: str = "UTC"
    ) -> AppProfileEntity:
        pass


class IFamilyRepository(abc.ABC):
    @abc.abstractmethod
    async def get_by_id(self, family_id: uuid.UUID) -> Optional[FamilyEntity]:
        pass

    @abc.abstractmethod
    async def create(self, name: str, primary_coordinator_profile_id: Optional[uuid.UUID] = None) -> FamilyEntity:
        pass

    @abc.abstractmethod
    async def update(
        self,
        family_id: uuid.UUID,
        name: Optional[str] = None,
        primary_coordinator_profile_id: Optional[uuid.UUID] = None
    ) -> Optional[FamilyEntity]:
        pass


    @abc.abstractmethod
    async def add_member(self, family_id: uuid.UUID, profile_id: uuid.UUID, membership_role: str) -> FamilyMembershipEntity:
        pass

    @abc.abstractmethod
    async def remove_member(self, family_id: uuid.UUID, profile_id: uuid.UUID) -> bool:
        pass

    @abc.abstractmethod
    async def remove_member_by_id(self, family_id: uuid.UUID, member_id: uuid.UUID) -> bool:
        pass

    @abc.abstractmethod
    async def get_member(self, family_id: uuid.UUID, profile_id: uuid.UUID) -> Optional[FamilyMembershipEntity]:
        pass

    @abc.abstractmethod
    async def get_member_by_id(self, family_id: uuid.UUID, member_id: uuid.UUID) -> Optional[FamilyMembershipEntity]:
        pass

    @abc.abstractmethod
    async def list_members(self, family_id: uuid.UUID) -> List[FamilyMembershipEntity]:
        pass

    @abc.abstractmethod
    async def update_member(
        self,
        family_id: uuid.UUID,
        member_id: uuid.UUID,
        membership_role: Optional[str] = None,
        status: Optional[str] = None
    ) -> Optional[FamilyMembershipEntity]:
        pass


    @abc.abstractmethod
    async def list_for_user(self, profile_id: uuid.UUID) -> List[FamilyEntity]:
        pass

    @abc.abstractmethod
    async def add_relationship(
        self,
        family_id: uuid.UUID,
        from_profile_id: uuid.UUID,
        to_profile_id: uuid.UUID,
        relationship_type: str
    ) -> FamilyRelationshipEntity:
        pass

    @abc.abstractmethod
    async def list_relationships(self, family_id: uuid.UUID) -> List[FamilyRelationshipEntity]:
        pass

    @abc.abstractmethod
    async def add_care_subject(
        self,
        family_id: uuid.UUID,
        fhir_patient_id: str,
        profile_id: Optional[uuid.UUID] = None,
        relationship_to_coordinator: Optional[str] = None,
        city: Optional[str] = None,
        country_code: Optional[str] = None,
        timezone: Optional[str] = None
    ) -> CareSubjectEntity:
        pass

    @abc.abstractmethod
    async def list_care_subjects(self, family_id: uuid.UUID) -> List[CareSubjectEntity]:
        pass

    @abc.abstractmethod
    async def get_care_subject(self, subject_id: uuid.UUID) -> Optional[CareSubjectEntity]:
        pass


    @abc.abstractmethod
    async def add_care_relationship(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        profile_id: uuid.UUID,
        relationship_type: str,
        access_level: Optional[str] = None,
        starts_at: Optional[datetime] = None,
        ends_at: Optional[datetime] = None
    ) -> CareRelationshipEntity:
        pass

    @abc.abstractmethod
    async def list_care_relationships(self, family_id: uuid.UUID) -> List[CareRelationshipEntity]:
        pass

    @abc.abstractmethod
    async def get_care_relationship(self, family_id: uuid.UUID, relationship_id: uuid.UUID) -> Optional[CareRelationshipEntity]:
        pass

    @abc.abstractmethod
    async def update_care_relationship(
        self,
        family_id: uuid.UUID,
        relationship_id: uuid.UUID,
        relationship_type: Optional[str] = None,
        access_level: Optional[str] = None,
        status: Optional[str] = None,
        ends_at: Optional[datetime] = None
    ) -> Optional[CareRelationshipEntity]:
        pass

    @abc.abstractmethod
    async def remove_care_relationship(self, family_id: uuid.UUID, relationship_id: uuid.UUID) -> bool:
        pass


    @abc.abstractmethod
    async def add_care_task(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        created_by_profile_id: uuid.UUID,
        assigned_to_profile_id: uuid.UUID,
        title: str,
        description: Optional[str],
        category: str,
        priority: str,
        due_at: datetime,
        source_event_id: Optional[uuid.UUID] = None
    ) -> CareTaskEntity:
        pass

    @abc.abstractmethod
    async def get_care_task(self, task_id: uuid.UUID) -> Optional[CareTaskEntity]:
        pass

    @abc.abstractmethod
    async def update_care_task(
        self,
        task_id: uuid.UUID,
        title: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        priority: Optional[str] = None,
        due_at: Optional[datetime] = None,
        status: Optional[str] = None,
        assigned_to_profile_id: Optional[uuid.UUID] = None,
        completed_at: Optional[datetime] = None,
        completed_by_profile_id: Optional[uuid.UUID] = None
    ) -> Optional[CareTaskEntity]:
        pass


    @abc.abstractmethod
    async def list_care_tasks(self, family_id: uuid.UUID, subject_id: Optional[uuid.UUID] = None) -> List[CareTaskEntity]:
        pass


    @abc.abstractmethod
    async def add_adherence_event(
        self,
        subject_id: uuid.UUID,
        fhir_medication_request_id: str,
        scheduled_at: datetime,
        status: str,
        confirmed_at: Optional[datetime] = None,
        confirmed_by_profile_id: Optional[uuid.UUID] = None,
        source: str = "caregiver"
    ) -> MedicationAdherenceEventEntity:
        pass

    @abc.abstractmethod
    async def list_adherence_events(self, subject_id: uuid.UUID, since: Optional[datetime] = None) -> List[MedicationAdherenceEventEntity]:
        pass


    @abc.abstractmethod
    async def add_checkin(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        submitted_by_profile_id: uuid.UUID,
        feeling: str,
        notes: Optional[str],
        voice_file_id: Optional[uuid.UUID],
        severity: str,
        submitted_at: Optional[datetime] = None
    ) -> WellbeingCheckinEntity:
        pass

    @abc.abstractmethod
    async def list_checkins(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[WellbeingCheckinEntity]:
        pass

    @abc.abstractmethod
    async def list_checkins_for_subject(self, subject_id: uuid.UUID) -> List[WellbeingCheckinEntity]:
        pass

    @abc.abstractmethod
    async def get_latest_checkin(self, subject_id: uuid.UUID) -> Optional[WellbeingCheckinEntity]:
        pass


    @abc.abstractmethod
    async def add_monitoring_preference(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        metric: str,
        baseline_period_days: int,
        threshold_config: dict,
        notification_level: str,
        enabled: bool
    ) -> MonitoringPreferenceEntity:
        pass

    @abc.abstractmethod
    async def update_monitoring_preference(
        self,
        preference_id: uuid.UUID,
        enabled: bool,
        threshold_config: Optional[dict] = None
    ) -> Optional[MonitoringPreferenceEntity]:
        pass

    @abc.abstractmethod
    async def list_monitoring_preferences(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[MonitoringPreferenceEntity]:
        pass

    @abc.abstractmethod
    async def add_ai_insight(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        type: str,
        severity: str,
        title: str,
        summary: str,
        observation: str,
        recommendation: Optional[str] = None,
        timeframe_start: Optional[datetime] = None,
        timeframe_end: Optional[datetime] = None,
        confidence: Optional[float] = None,
        status: str = "active",
        generated_by: str = "agent",
        agent_run_id: Optional[str] = None,
        trigger_type: Optional[str] = None,
        baseline_comparison: Optional[str] = None,
        actionability: Optional[str] = None
    ) -> AIInsightEntity:
        pass


    @abc.abstractmethod
    async def get_ai_insight(self, insight_id: uuid.UUID) -> Optional[AIInsightEntity]:
        pass

    @abc.abstractmethod
    async def update_ai_insight_status(self, insight_id: uuid.UUID, status: str) -> Optional[AIInsightEntity]:
        pass

    @abc.abstractmethod
    async def list_ai_insights(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[AIInsightEntity]:
        pass

    @abc.abstractmethod
    async def list_ai_insights_for_subject(self, subject_id: uuid.UUID) -> List[AIInsightEntity]:
        pass


    @abc.abstractmethod
    async def add_ai_insight_source(
        self,
        insight_id: uuid.UUID,
        source_type: str,
        source_id: str,
        source_version: Optional[str],
        metadata: dict
    ) -> AIInsightSourceEntity:
        pass

    @abc.abstractmethod
    async def list_ai_insight_sources(self, insight_id: uuid.UUID) -> List[AIInsightSourceEntity]:
        pass

    @abc.abstractmethod
    async def add_notification(
        self,
        recipient_profile_id: uuid.UUID,
        family_id: uuid.UUID,
        type: str,
        priority: str,
        title: str,
        body: str,
        subject_id: Optional[uuid.UUID] = None,
        action_type: Optional[str] = None,
        action_payload: Optional[dict] = None,
        source_event_id: Optional[uuid.UUID] = None
    ) -> NotificationEntity:
        pass

    @abc.abstractmethod
    async def get_notification(self, notification_id: uuid.UUID) -> Optional[NotificationEntity]:

        pass

    @abc.abstractmethod
    async def update_notification_read(self, notification_id: uuid.UUID, read_at: Optional[datetime]) -> Optional[NotificationEntity]:
        pass


    @abc.abstractmethod
    async def update_notification_dismissed(self, notification_id: uuid.UUID, dismissed_at: Optional[datetime]) -> Optional[NotificationEntity]:
        pass

    @abc.abstractmethod
    async def list_notifications(
        self,
        recipient_profile_id: uuid.UUID,
        unread_only: bool = False,
        limit: int = 50
    ) -> List[NotificationEntity]:
        pass


    @abc.abstractmethod
    async def add_notification_delivery(
        self,
        notification_id: uuid.UUID,
        channel: str,
        provider: str,
        status: str = "pending",
        attempt_count: int = 1,
        provider_message_id: Optional[str] = None
    ) -> NotificationDeliveryEntity:
        pass

    @abc.abstractmethod
    async def update_notification_delivery(
        self,
        delivery_id: uuid.UUID,
        status: str,
        attempt_count: Optional[int] = None,
        provider_message_id: Optional[str] = None,
        sent_at: Optional[datetime] = None,
        delivered_at: Optional[datetime] = None,
        failed_at: Optional[datetime] = None,
        failure_reason: Optional[str] = None
    ) -> Optional[NotificationDeliveryEntity]:
        pass

    @abc.abstractmethod
    async def list_notification_deliveries(self, notification_id: uuid.UUID) -> List[NotificationDeliveryEntity]:
        pass

    @abc.abstractmethod
    async def create_conversation(self, family_id: uuid.UUID, subject_id: Optional[uuid.UUID] = None) -> FamilyConversationEntity:
        pass

    @abc.abstractmethod
    async def get_conversation(self, conversation_id: uuid.UUID) -> Optional[FamilyConversationEntity]:
        pass

    @abc.abstractmethod
    async def list_conversations(self, family_id: uuid.UUID) -> List[FamilyConversationEntity]:
        pass

    @abc.abstractmethod
    async def add_message(
        self,
        conversation_id: uuid.UUID,
        sender_profile_id: uuid.UUID,
        message_type: str,
        body: str,
        file_id: Optional[uuid.UUID] = None,
        reply_to_message_id: Optional[uuid.UUID] = None
    ) -> FamilyMessageEntity:
        pass

    @abc.abstractmethod
    async def list_messages(self, conversation_id: uuid.UUID) -> List[FamilyMessageEntity]:
        pass

    @abc.abstractmethod
    async def add_appointment_coordination(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        fhir_appointment_id: str,
        assigned_caregiver_profile_id: Optional[uuid.UUID] = None,
        preparation_status: str = "pending",
        summary_status: str = "pending",
        reminder_status: str = "pending"
    ) -> AppointmentCoordinationEntity:
        pass

    @abc.abstractmethod
    async def update_appointment_coordination(
        self,
        coordination_id: uuid.UUID,
        assigned_caregiver_profile_id: Optional[uuid.UUID] = None,
        preparation_status: Optional[str] = None,
        summary_status: Optional[str] = None,
        reminder_status: Optional[str] = None
    ) -> Optional[AppointmentCoordinationEntity]:
        pass

    @abc.abstractmethod
    async def get_appointment_coordination(self, coordination_id: uuid.UUID) -> Optional[AppointmentCoordinationEntity]:
        pass

    @abc.abstractmethod
    async def get_appointment_coordination_by_fhir_id(self, fhir_appointment_id: str) -> Optional[AppointmentCoordinationEntity]:
        pass

    @abc.abstractmethod
    async def list_appointment_coordinations(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[AppointmentCoordinationEntity]:
        pass


    @abc.abstractmethod
    async def add_health_document(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        filenest_file_id: str,
        document_type: str,
        source_profile_id: uuid.UUID,
        status: str = "active",
        ai_processing_status: str = "pending",
        extraction_status: str = "pending"
    ) -> HealthDocumentEntity:
        pass

    @abc.abstractmethod
    async def update_health_document(
        self,
        document_id: uuid.UUID,
        status: Optional[str] = None,
        ai_processing_status: Optional[str] = None,
        extraction_status: Optional[str] = None
    ) -> Optional[HealthDocumentEntity]:
        pass

    @abc.abstractmethod
    async def get_health_document(self, document_id: uuid.UUID) -> Optional[HealthDocumentEntity]:
        pass

    @abc.abstractmethod
    async def get_health_document_by_filenest_id(self, filenest_file_id: str) -> Optional[HealthDocumentEntity]:
        pass

    @abc.abstractmethod
    async def list_health_documents(self, family_id: uuid.UUID, subject_id: uuid.UUID) -> List[HealthDocumentEntity]:
        pass

    @abc.abstractmethod
    async def list_health_documents_for_subject(self, subject_id: uuid.UUID) -> List[HealthDocumentEntity]:
        pass


    @abc.abstractmethod
    async def add_document_extraction(
        self,
        document_id: uuid.UUID,
        extraction_type: str,
        raw_output: dict,
        normalized_output: dict,
        confidence: Optional[float] = None,
        review_status: str = "pending_review"
    ) -> DocumentExtractionEntity:
        pass

    @abc.abstractmethod
    async def review_document_extraction(
        self,
        extraction_id: uuid.UUID,
        review_status: str,
        reviewed_by_profile_id: uuid.UUID,
        reviewed_at: datetime,
        normalized_output: Optional[dict] = None
    ) -> Optional[DocumentExtractionEntity]:
        pass

    @abc.abstractmethod
    async def list_document_extractions(self, document_id: uuid.UUID) -> List[DocumentExtractionEntity]:
        pass

    @abc.abstractmethod
    async def create_ai_conversation(
        self,
        family_id: uuid.UUID,
        profile_id: uuid.UUID,
        agent_session_id: str,
        conversation_type: str,
        context_scope: dict,
        subject_id: Optional[uuid.UUID] = None
    ) -> AIConversationEntity:
        pass

    @abc.abstractmethod
    async def get_ai_conversation(self, conversation_id: uuid.UUID) -> Optional[AIConversationEntity]:
        pass

    @abc.abstractmethod
    async def update_ai_conversation_context(self, conversation_id: uuid.UUID, context_scope: dict) -> Optional[AIConversationEntity]:
        pass

    @abc.abstractmethod
    async def list_ai_conversations(self, family_id: uuid.UUID, profile_id: uuid.UUID) -> List[AIConversationEntity]:
        pass


    @abc.abstractmethod
    async def create_ai_action(
        self,
        family_id: uuid.UUID,
        profile_id: uuid.UUID,
        agent_session_id: str,
        action_type: str,
        input_data: dict,
        output_data: dict,
        requires_approval: bool = False,
        status: str = "executed",
        subject_id: Optional[uuid.UUID] = None
    ) -> AIActionEntity:
        pass

    @abc.abstractmethod
    async def approve_or_reject_ai_action(
        self,
        action_id: uuid.UUID,
        status: str,
        approved_by_profile_id: uuid.UUID,
        approved_at: datetime
    ) -> Optional[AIActionEntity]:
        pass

    @abc.abstractmethod
    async def get_ai_action(self, action_id: uuid.UUID) -> Optional[AIActionEntity]:
        pass

    @abc.abstractmethod
    async def list_ai_actions(self, family_id: uuid.UUID, subject_id: Optional[uuid.UUID] = None) -> List[AIActionEntity]:
        pass



class IConsentRepository(abc.ABC):
    @abc.abstractmethod
    async def get_by_id(self, consent_id: uuid.UUID) -> Optional[ConsentEntity]:
        pass

    @abc.abstractmethod
    async def get_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID
    ) -> Optional[ConsentEntity]:
        pass

    @abc.abstractmethod
    async def create_or_update_consent(
        self,
        family_id: uuid.UUID,
        subject_id: uuid.UUID,
        grantor_profile_id: uuid.UUID,
        grantee_profile_id: uuid.UUID,
        scope: dict,
        status: str = "active",
        consent_type: str = "clinical_data_access",
        expires_at: Optional[datetime] = None
    ) -> ConsentEntity:
        pass

    @abc.abstractmethod
    async def list_by_family(self, family_id: uuid.UUID) -> List[ConsentEntity]:
        pass

    @abc.abstractmethod
    async def list_by_parent(self, grantor_profile_id: uuid.UUID) -> List[ConsentEntity]:
        pass

    @abc.abstractmethod
    async def list_by_grantee(self, grantee_profile_id: uuid.UUID) -> List[ConsentEntity]:
        pass

    @abc.abstractmethod
    async def revoke_consent(self, consent_id: uuid.UUID, revoked_by_profile_id: uuid.UUID) -> Optional[ConsentEntity]:
        pass



class IEventLogger(abc.ABC):
    @abc.abstractmethod
    async def log_event(
        self,
        care_circle_id: Optional[uuid.UUID],
        event_type: str,
        payload: dict,
        parent_tz: str = "Asia/Kolkata",
        coordinator_tz: str = "America/New_York"
    ) -> None:
        pass
