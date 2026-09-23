from dataclasses import dataclass, field
from datetime import datetime, date
import uuid
from typing import List, Optional


@dataclass
class AppProfileEntity:
    id: uuid.UUID
    iam_subject_id: str
    timezone: str
    status: str
    created_at: datetime
    updated_at: datetime
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    email: Optional[str] = None
    date_of_birth: Optional[date] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    preferred_language: Optional[str] = None
    avatar_file_id: Optional[uuid.UUID] = None


@dataclass
class FamilyMembershipEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    profile_id: uuid.UUID
    membership_role: str
    status: str
    joined_at: datetime
    created_at: datetime
    updated_at: datetime
    profile: Optional[AppProfileEntity] = None


@dataclass
class FamilyRelationshipEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    from_profile_id: uuid.UUID
    to_profile_id: uuid.UUID
    relationship_type: str
    created_at: datetime


@dataclass
class MedicationAdherenceEventEntity:
    id: uuid.UUID
    subject_id: uuid.UUID
    fhir_medication_request_id: str
    scheduled_at: datetime
    status: str
    source: str
    created_at: datetime
    updated_at: datetime
    confirmed_at: Optional[datetime] = None
    confirmed_by_profile_id: Optional[uuid.UUID] = None


@dataclass
class WellbeingCheckinEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    submitted_by_profile_id: uuid.UUID
    feeling: str
    severity: str
    submitted_at: datetime
    created_at: datetime
    notes: Optional[str] = None
    voice_file_id: Optional[uuid.UUID] = None


@dataclass
class MonitoringPreferenceEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    metric: str
    baseline_period_days: int
    threshold_config: dict
    notification_level: str
    enabled: bool
    created_at: datetime
    updated_at: datetime


@dataclass
class AIInsightSourceEntity:
    id: uuid.UUID
    insight_id: uuid.UUID
    source_type: str
    source_id: str
    metadata: dict
    created_at: datetime
    source_version: Optional[str] = None


@dataclass
class AIInsightEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    type: str
    severity: str
    title: str
    summary: str
    observation: str
    timeframe_start: datetime
    timeframe_end: datetime
    status: str
    generated_by: str
    created_at: datetime
    updated_at: datetime
    recommendation: Optional[str] = None
    confidence: Optional[float] = None
    agent_run_id: Optional[str] = None
    trigger_type: Optional[str] = None
    baseline_comparison: Optional[str] = None
    actionability: Optional[str] = None
    sources: Optional[List[AIInsightSourceEntity]] = None


@dataclass
class NotificationEntity:
    id: uuid.UUID
    recipient_profile_id: uuid.UUID
    family_id: uuid.UUID
    type: str
    priority: str
    title: str
    body: str
    action_payload: dict
    created_at: datetime
    subject_id: Optional[uuid.UUID] = None
    action_type: Optional[str] = None
    source_event_id: Optional[uuid.UUID] = None
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None


@dataclass
class NotificationDeliveryEntity:
    id: uuid.UUID
    notification_id: uuid.UUID
    channel: str
    provider: str
    status: str
    attempt_count: int
    created_at: datetime
    updated_at: datetime
    provider_message_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


@dataclass
class FamilyMessageEntity:
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_profile_id: uuid.UUID
    message_type: str
    body: str
    created_at: datetime
    file_id: Optional[uuid.UUID] = None
    reply_to_message_id: Optional[uuid.UUID] = None


@dataclass
class FamilyConversationEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    created_at: datetime
    updated_at: datetime
    subject_id: Optional[uuid.UUID] = None
    messages: Optional[List[FamilyMessageEntity]] = None


@dataclass
class AppointmentCoordinationEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    fhir_appointment_id: str
    preparation_status: str
    summary_status: str
    reminder_status: str
    created_at: datetime
    updated_at: datetime
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None


@dataclass
class HealthDocumentEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    filenest_file_id: str
    document_type: str
    status: str
    source_profile_id: uuid.UUID
    ai_processing_status: str
    extraction_status: str
    created_at: datetime
    updated_at: datetime


@dataclass
class DocumentExtractionEntity:
    id: uuid.UUID
    document_id: uuid.UUID
    extraction_type: str
    raw_output: dict
    normalized_output: dict
    review_status: str
    created_at: datetime
    updated_at: datetime
    confidence: Optional[float] = None
    reviewed_by_profile_id: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None


@dataclass
class AIConversationEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    profile_id: uuid.UUID
    agent_session_id: str
    conversation_type: str
    context_scope: dict
    created_at: datetime
    updated_at: datetime
    subject_id: Optional[uuid.UUID] = None


@dataclass
class AIActionEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    profile_id: uuid.UUID
    agent_session_id: str
    action_type: str
    status: str
    input: dict
    output: dict
    requires_approval: bool
    created_at: datetime
    updated_at: datetime
    subject_id: Optional[uuid.UUID] = None
    approved_by_profile_id: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None


@dataclass
class CareSubjectEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    fhir_patient_id: str
    status: str
    created_at: datetime
    updated_at: datetime
    profile_id: Optional[uuid.UUID] = None
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: Optional[str] = None
    adherence_events: Optional[List[MedicationAdherenceEventEntity]] = None


@dataclass
class CareRelationshipEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    profile_id: uuid.UUID
    relationship_type: str
    status: str
    starts_at: datetime
    created_at: datetime
    updated_at: datetime
    access_level: Optional[str] = None
    ends_at: Optional[datetime] = None


@dataclass
class CareTaskEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    created_by_profile_id: uuid.UUID
    assigned_to_profile_id: uuid.UUID
    title: str
    category: str
    priority: str
    status: str
    due_at: datetime
    created_at: datetime
    updated_at: datetime
    description: Optional[str] = None
    completed_at: Optional[datetime] = None
    completed_by_profile_id: Optional[uuid.UUID] = None
    source_event_id: Optional[uuid.UUID] = None


@dataclass
class FamilyEntity:
    id: uuid.UUID
    name: str
    created_at: datetime
    updated_at: datetime
    members: List[FamilyMembershipEntity]
    relationships: List[FamilyRelationshipEntity]
    care_subjects: List[CareSubjectEntity]
    care_relationships: List[CareRelationshipEntity]
    care_tasks: List[CareTaskEntity]
    primary_coordinator_profile_id: Optional[uuid.UUID] = None
    checkins: Optional[List[WellbeingCheckinEntity]] = None
    monitoring_preferences: Optional[List[MonitoringPreferenceEntity]] = None
    ai_insights: Optional[List[AIInsightEntity]] = None


@dataclass
class ConsentEntity:
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    grantor_profile_id: uuid.UUID
    grantee_profile_id: uuid.UUID
    consent_type: str
    scope: dict
    status: str
    granted_at: datetime
    version: int
    created_at: datetime
    updated_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
