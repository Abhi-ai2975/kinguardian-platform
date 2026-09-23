from datetime import datetime, date
import uuid
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, Field, computed_field, model_validator


# Profile schemas
class ProfileBase(BaseModel):
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: str = "UTC"
    preferred_language: Optional[str] = None
    avatar_file_id: Optional[uuid.UUID] = None
    status: str = "active"



class ProfileResponse(ProfileBase):
    id: uuid.UUID
    iam_subject_id: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# CareCircleMember (FamilyMembership) schemas
class FamilyMemberAdd(BaseModel):
    email: EmailStr
    role: str = Field(default="family_member", description="coordinator | parent | caregiver | family_member")


class FamilyMemberUpdate(BaseModel):
    role: Optional[str] = Field(default=None, description="Updated role: coordinator | parent | caregiver | family_member")
    status: Optional[str] = Field(default=None, description="Updated status: active | suspended | left")


class CareCircleMemberResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    profile_id: uuid.UUID
    membership_role: str = Field(..., description="coordinator | parent | caregiver | family_member")
    status: str
    joined_at: datetime
    created_at: datetime
    updated_at: datetime
    profile: Optional[ProfileResponse] = None

    @computed_field
    def user_id(self) -> uuid.UUID:
        return self.profile_id

    @computed_field
    def role(self) -> str:
        return self.membership_role

    @computed_field
    def care_circle_id(self) -> uuid.UUID:
        return self.family_id

    class Config:
        from_attributes = True
        read_with_orm_mode = True


FamilyMemberResponse = CareCircleMemberResponse
CareCircleMemberAdd = FamilyMemberAdd
CareCircleMemberUpdate = FamilyMemberUpdate



# FamilyRelationship schemas
class FamilyRelationshipCreate(BaseModel):
    from_profile_id: uuid.UUID
    to_profile_id: uuid.UUID
    relationship_type: str


class FamilyRelationshipResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    from_profile_id: uuid.UUID
    to_profile_id: uuid.UUID
    relationship_type: str
    created_at: datetime

    class Config:
        from_attributes = True


# CareSubject schemas
class CareSubjectCreate(BaseModel):
    fhir_patient_id: str
    profile_id: Optional[uuid.UUID] = None
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: Optional[str] = None


class CareSubjectResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    profile_id: Optional[uuid.UUID] = None
    fhir_patient_id: str
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: Optional[str] = None
    status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# CareRelationship schemas
class CareRelationshipCreate(BaseModel):
    subject_id: uuid.UUID
    profile_id: uuid.UUID
    relationship_type: str
    access_level: Optional[str] = None
    starts_at: Optional[datetime] = None
    ends_at: Optional[datetime] = None


class CareRelationshipUpdate(BaseModel):
    relationship_type: Optional[str] = None
    access_level: Optional[str] = None
    status: Optional[str] = None
    ends_at: Optional[datetime] = None


class CareRelationshipResponse(BaseModel):

    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    profile_id: uuid.UUID
    relationship_type: str
    access_level: Optional[str] = None
    status: str
    starts_at: datetime
    ends_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# CareTask schemas
class CareTaskCreate(BaseModel):
    family_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    assigned_to_profile_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    category: str = Field(..., description="medication | appointment | lab | document | call | check_in | follow_up | caregiver | other")
    priority: str = "medium"
    due_at: datetime



class CareTaskUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    due_at: Optional[datetime] = None
    status: Optional[str] = None
    assigned_to_profile_id: Optional[uuid.UUID] = None


class CareTaskAssign(BaseModel):
    assigned_to_profile_id: uuid.UUID


class CareTaskResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    created_by_profile_id: uuid.UUID
    assigned_to_profile_id: Optional[uuid.UUID] = None
    title: str
    description: Optional[str] = None
    category: str
    priority: str
    status: str
    due_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    completed_by_profile_id: Optional[uuid.UUID] = None
    source_event_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



# MedicationAdherenceEvent schemas
class AdherenceEventCreate(BaseModel):
    subject_id: uuid.UUID
    fhir_medication_request_id: str
    scheduled_at: datetime
    status: str = "scheduled"
    source: str = "caregiver"


class AdherenceEventResponse(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    fhir_medication_request_id: str
    scheduled_at: datetime
    confirmed_at: Optional[datetime] = None
    status: str
    confirmed_by_profile_id: Optional[uuid.UUID] = None
    source: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# WellbeingCheckin schemas
class WellbeingCheckinCreate(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    feeling: str = Field(..., description="good | okay | not_well")
    notes: Optional[str] = None
    voice_file_id: Optional[uuid.UUID] = None
    severity: str = "low"



class WellbeingCheckinResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    submitted_by_profile_id: uuid.UUID
    feeling: str
    notes: Optional[str] = None
    voice_file_id: Optional[uuid.UUID] = None
    severity: str
    submitted_at: datetime
    created_at: datetime

    class Config:
        from_attributes = True


# MonitoringPreference schemas
class MonitoringPreferenceCreate(BaseModel):
    subject_id: uuid.UUID
    metric: str = Field(..., description="activity | sleep | blood_pressure | weight | heart_rate | glucose")
    baseline_period_days: int = 7
    threshold_config: dict = Field(default_factory=dict)
    notification_level: str = "normal"
    enabled: bool = True


class MonitoringPreferenceUpdate(BaseModel):
    enabled: bool
    threshold_config: Optional[dict] = None


class MonitoringPreferenceResponse(BaseModel):
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

    class Config:
        from_attributes = True


# AIInsightSource schemas
class AIInsightSourceCreate(BaseModel):
    source_type: str = Field(..., description="FHIR Observation | Medication adherence event | Appointment | Wellbeing check-in | Lab report | Wearable observation")
    source_id: str
    source_version: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class AIInsightSourceResponse(BaseModel):
    id: uuid.UUID
    insight_id: uuid.UUID
    source_type: str
    source_id: str
    source_version: Optional[str] = None
    metadata: dict = Field(default_factory=dict)
    created_at: datetime

    @model_validator(mode="before")
    @classmethod
    def resolve_metadata(cls, data: Any) -> Any:
        if hasattr(data, "metadata_json"):
            meta = data.metadata_json
            if isinstance(meta, dict):
                return {
                    "id": getattr(data, "id", None),
                    "insight_id": getattr(data, "insight_id", None),
                    "source_type": getattr(data, "source_type", None),
                    "source_id": getattr(data, "source_id", None),
                    "source_version": getattr(data, "source_version", None),
                    "metadata": meta,
                    "created_at": getattr(data, "created_at", None)
                }
        return data

    class Config:
        from_attributes = True



# AIInsight schemas
class AIInsightCreate(BaseModel):
    subject_id: uuid.UUID
    type: str
    severity: str
    title: str
    summary: str
    observation: str
    recommendation: Optional[str] = None
    timeframe_start: datetime
    timeframe_end: datetime
    confidence: Optional[float] = None
    status: str = "active"
    generated_by: str = "agent"
    agent_run_id: Optional[str] = None
    trigger_type: Optional[str] = None
    baseline_comparison: Optional[str] = None
    actionability: Optional[str] = None


class AIInsightResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    type: str
    severity: str
    title: str
    summary: str
    observation: str
    recommendation: Optional[str] = None
    timeframe_start: datetime
    timeframe_end: datetime
    confidence: Optional[float] = None
    status: str
    generated_by: str
    agent_run_id: Optional[str] = None
    trigger_type: Optional[str] = None
    baseline_comparison: Optional[str] = None
    actionability: Optional[str] = None
    created_at: datetime
    updated_at: datetime
    sources: List[AIInsightSourceResponse] = []

    class Config:
        from_attributes = True


class AIInsightDismissRequest(BaseModel):
    reason: Optional[str] = None


class AIInsightActRequest(BaseModel):
    action_type: Optional[str] = "create_care_task"
    custom_notes: Optional[str] = None
    assigned_to_profile_id: Optional[uuid.UUID] = None


class AIInsightActResponse(BaseModel):
    status: str
    insight_id: uuid.UUID
    action_type: str
    task_id: Optional[uuid.UUID] = None
    message: str



# Notification schemas
class NotificationCreate(BaseModel):
    recipient_profile_id: uuid.UUID
    type: str = Field(..., description="in_app | push | sms | whatsapp | email | voice")
    priority: str = "normal"
    title: str
    body: str
    subject_id: Optional[uuid.UUID] = None
    action_type: Optional[str] = None
    action_payload: Optional[dict] = None
    source_event_id: Optional[uuid.UUID] = None


class NotificationResponse(BaseModel):
    id: uuid.UUID
    recipient_profile_id: uuid.UUID
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    type: str
    priority: str
    title: str
    body: str
    action_type: Optional[str] = None
    action_payload: dict
    source_event_id: Optional[uuid.UUID] = None
    read_at: Optional[datetime] = None
    dismissed_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


# NotificationDelivery schemas
class NotificationDeliveryCreate(BaseModel):
    notification_id: uuid.UUID
    channel: str = Field(..., description="e.g. sms | push | email")
    provider: str = Field(..., description="e.g. twilio | firebase | sendgrid")
    provider_message_id: Optional[str] = None
    status: str = "pending"
    attempt_count: int = 1


class NotificationDeliveryUpdate(BaseModel):
    status: str
    attempt_count: Optional[int] = None
    provider_message_id: Optional[str] = None
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None


class NotificationDeliveryResponse(BaseModel):
    id: uuid.UUID
    notification_id: uuid.UUID
    channel: str
    provider: str
    provider_message_id: Optional[str] = None
    status: str
    attempt_count: int
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    failed_at: Optional[datetime] = None
    failure_reason: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# FamilyConversation & FamilyMessage schemas
class FamilyConversationCreate(BaseModel):
    subject_id: Optional[uuid.UUID] = None


class FamilyMessageCreate(BaseModel):
    message_type: str = Field(..., description="text | voice | image | document | system | ai")
    body: str
    file_id: Optional[uuid.UUID] = None
    reply_to_message_id: Optional[uuid.UUID] = None


class FamilyMessageResponse(BaseModel):
    id: uuid.UUID
    conversation_id: uuid.UUID
    sender_profile_id: uuid.UUID
    message_type: str
    body: str
    file_id: Optional[uuid.UUID] = None
    reply_to_message_id: Optional[uuid.UUID] = None
    created_at: datetime

    class Config:
        from_attributes = True


class FamilyConversationResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    messages: List[FamilyMessageResponse] = []

    class Config:
        from_attributes = True


# AppointmentCoordination schemas
class AppointmentCoordinationCreate(BaseModel):
    subject_id: uuid.UUID
    fhir_appointment_id: str
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None
    preparation_status: str = "pending"
    summary_status: str = "pending"
    reminder_status: str = "pending"


class AppointmentCoordinationUpdate(BaseModel):
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None
    preparation_status: Optional[str] = None
    summary_status: Optional[str] = None
    reminder_status: Optional[str] = None


class AppointmentCoordinationResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    fhir_appointment_id: str
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None
    preparation_status: str
    summary_status: str
    reminder_status: str
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# HealthDocument schemas
class HealthDocumentCreate(BaseModel):
    subject_id: uuid.UUID
    filenest_file_id: str
    document_type: str = "prescription"
    status: str = "active"
    ai_processing_status: str = "pending"
    extraction_status: str = "pending"


class HealthDocumentUpdate(BaseModel):
    status: Optional[str] = None
    ai_processing_status: Optional[str] = None
    extraction_status: Optional[str] = None


class HealthDocumentUploadInitRequest(BaseModel):
    subject_id: Optional[uuid.UUID] = None
    document_type: str = Field(default="prescription", description="prescription | lab_report | clinical_summary | insurance | other")
    filename: str
    mime_type: Optional[str] = "application/pdf"
    file_size_bytes: Optional[int] = None



class HealthDocumentUploadInitResponse(BaseModel):
    document_id: uuid.UUID
    subject_id: uuid.UUID
    family_id: uuid.UUID
    filenest_file_id: str
    document_type: str
    status: str
    upload_url: str
    upload_method: str = "POST"
    expires_at: Optional[datetime] = None
    created_at: datetime


class FileNestWebhookPayload(BaseModel):
    event: str = Field(default="filenest.file.uploaded", description="filenest.file.uploaded | filenest.processing.completed")
    file_id: str
    status: str = "ready"
    mime_type: Optional[str] = None
    extracted_text: Optional[str] = None
    classification: Optional[str] = None
    metadata: dict = Field(default_factory=dict)


class HealthDocumentResponse(BaseModel):
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

    class Config:
        from_attributes = True



# DocumentExtraction schemas
class DocumentExtractionCreate(BaseModel):
    extraction_type: str = Field(..., description="prescription | lab_report | vitals | summary")
    raw_output: dict = Field(default_factory=dict)
    normalized_output: dict = Field(default_factory=dict)
    confidence: Optional[float] = None
    review_status: str = "pending_review"


class DocumentExtractionReview(BaseModel):
    review_status: str = Field(..., description="approved | rejected | edited")
    normalized_output: Optional[dict] = None


class DocumentExtractionResponse(BaseModel):
    id: uuid.UUID
    document_id: uuid.UUID
    extraction_type: str
    raw_output: dict
    normalized_output: dict
    confidence: Optional[float] = None
    review_status: str
    reviewed_by_profile_id: Optional[uuid.UUID] = None
    reviewed_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# AIConversation schemas
class AIConversationStartRequest(BaseModel):
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    conversation_type: str = "consultation"
    context_scope: dict = Field(default_factory=dict)


class AIConversationCreate(BaseModel):
    agent_session_id: str
    conversation_type: str = "consultation"
    context_scope: dict = Field(default_factory=dict)
    subject_id: Optional[uuid.UUID] = None


class AIMessageRequest(BaseModel):
    content: str
    context_override: Optional[dict] = None


class AIMessageResponse(BaseModel):
    id: str
    conversation_id: uuid.UUID
    sender_role: str = "assistant"
    content: str
    suggested_actions: List[dict] = []
    created_at: datetime


class AIInsightGenerateRequest(BaseModel):
    family_id: uuid.UUID
    subject_id: uuid.UUID
    insight_type: Optional[str] = "medication_adherence_trend"
    timeframe_days: int = 7


class AIAppointmentPrepareRequest(BaseModel):
    custom_focus_areas: Optional[List[str]] = None
    notes: Optional[str] = None


class AIConversationResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID
    agent_session_id: str
    conversation_type: str
    context_scope: dict
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True



# AIAction schemas
class AIActionCreate(BaseModel):
    agent_session_id: str
    action_type: str = Field(..., description="create_care_task | send_reminder | prepare_appointment_summary | summarize_document | generate_guardian_moment | share_health_summary")
    input_data: dict = Field(default_factory=dict, alias="input")
    output_data: dict = Field(default_factory=dict, alias="output")
    requires_approval: bool = False
    status: str = "executed"
    subject_id: Optional[uuid.UUID] = None

    class Config:
        populate_by_name = True


class AIActionProposeRequest(BaseModel):
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    action_type: str = Field(..., description="change_medication | alter_diagnosis | cancel_appointment | create_care_task | send_reminder | ...")
    input_data: dict = Field(default_factory=dict, alias="input")
    agent_session_id: Optional[str] = None

    class Config:
        populate_by_name = True


class AIActionRejectRequest(BaseModel):
    reason: Optional[str] = None


class AIActionReview(BaseModel):
    status: str = Field(..., description="approved | rejected")



class AIActionResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    profile_id: uuid.UUID
    agent_session_id: str
    action_type: str
    status: str
    input: dict
    output: dict
    requires_approval: bool
    approved_by_profile_id: Optional[uuid.UUID] = None
    approved_at: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# Family (CareCircle) schemas
class FamilyCreate(BaseModel):
    name: str = Field(..., description="Family group name")
    role: str = Field(default="coordinator", description="Caller's role in this family: coordinator | parent")


class FamilyUpdate(BaseModel):
    name: Optional[str] = Field(default=None, description="Updated family group name")
    primary_coordinator_profile_id: Optional[uuid.UUID] = Field(default=None, description="New primary coordinator profile ID")


class FamilyResponse(BaseModel):
    id: uuid.UUID
    name: str
    primary_coordinator_profile_id: Optional[uuid.UUID] = None
    created_at: datetime
    updated_at: datetime
    members: List[CareCircleMemberResponse] = []
    relationships: List[FamilyRelationshipResponse] = []
    care_subjects: List[CareSubjectResponse] = []
    care_relationships: List[CareRelationshipResponse] = []
    care_tasks: List[CareTaskResponse] = []
    checkins: List[WellbeingCheckinResponse] = []
    monitoring_preferences: List[MonitoringPreferenceResponse] = []
    ai_insights: List[AIInsightResponse] = []

    class Config:
        from_attributes = True


# Aliases
CareCircleCreate = FamilyCreate
CareCircleResponse = FamilyResponse



# Consent schemas
class ConsentCreate(BaseModel):
    family_id: Optional[uuid.UUID] = None
    subject_id: uuid.UUID
    grantee_id: Optional[uuid.UUID] = None
    grantee_email: Optional[EmailStr] = None
    consent_type: str = "clinical_data_access"
    scope: dict = Field(default_factory=dict, description="Explicit scopes: e.g. {'vitals': true, 'medications': true, 'appointments': true, 'documents': true, 'labs': true, 'health_summary': true}")
    status: str = "active"
    expires_at: Optional[datetime] = None



class ConsentResponse(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    grantor_profile_id: uuid.UUID
    grantee_profile_id: uuid.UUID
    consent_type: str
    scope: dict
    status: str
    granted_at: datetime
    expires_at: Optional[datetime] = None
    revoked_at: Optional[datetime] = None
    version: int
    created_at: datetime
    updated_at: datetime

    @property
    def parent_id(self) -> uuid.UUID:
        return self.grantor_profile_id

    @property
    def grantee_id(self) -> uuid.UUID:
        return self.grantee_profile_id

    class Config:
        from_attributes = True


# ==========================================
# Coordinator Home Read Models
# ==========================================

class ParentStatusSummary(BaseModel):
    subject_id: uuid.UUID
    family_id: uuid.UUID
    display_name: str
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    latest_checkin_feeling: Optional[str] = None
    latest_checkin_submitted_at: Optional[datetime] = None
    today_adherence_summary: str = "No scheduled doses"
    active_insights_count: int = 0


class AttentionItem(BaseModel):
    id: uuid.UUID
    item_type: str = Field(..., description="urgent_insight | pending_extraction_review | pending_action_approval | high_priority_notification | overdue_care_task")
    title: str
    summary: str
    severity: str = "normal"
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    action_type: Optional[str] = None
    created_at: datetime


class GuardianMomentSummary(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    title: str
    summary: str
    severity: str
    trigger_type: Optional[str] = None
    baseline_comparison: Optional[str] = None
    actionability: Optional[str] = None
    created_at: datetime


class TodayMedicationSummary(BaseModel):
    id: uuid.UUID
    subject_id: uuid.UUID
    fhir_medication_request_id: str
    scheduled_at: datetime
    confirmed_at: Optional[datetime] = None
    status: str
    source: str


class UpcomingAppointmentSummary(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    fhir_appointment_id: str
    assigned_caregiver_profile_id: Optional[uuid.UUID] = None
    preparation_status: str
    summary_status: str
    reminder_status: str
    created_at: datetime


class PendingCareTaskSummary(BaseModel):
    id: uuid.UUID
    family_id: uuid.UUID
    subject_id: uuid.UUID
    title: str
    category: str
    priority: str
    due_at: datetime
    assigned_to_profile_id: uuid.UUID


class RecentUpdateSummary(BaseModel):
    id: uuid.UUID
    event_type: str
    title: str
    family_id: Optional[uuid.UUID] = None
    subject_id: Optional[uuid.UUID] = None
    timestamp: datetime


class CoordinatorHomeResponse(BaseModel):
    coordinator_profile_id: uuid.UUID
    parent_statuses: List[ParentStatusSummary] = []
    attention_items: List[AttentionItem] = []
    guardian_moments: List[GuardianMomentSummary] = []
    today_medications: List[TodayMedicationSummary] = []
    upcoming_appointments: List[UpcomingAppointmentSummary] = []
    pending_care_tasks: List[PendingCareTaskSummary] = []
    recent_updates: List[RecentUpdateSummary] = []


# ==========================================
# Parent Home Read Models
# ==========================================

class ParentCheckinStatus(BaseModel):
    submitted: bool
    feeling: Optional[str] = None
    notes: Optional[str] = None
    submitted_at: Optional[datetime] = None


class ParentTodayMedication(BaseModel):
    id: uuid.UUID
    fhir_medication_request_id: str
    scheduled_at: datetime
    status: str
    confirmed_at: Optional[datetime] = None


class ParentUpcomingAppointment(BaseModel):
    id: uuid.UUID
    fhir_appointment_id: str
    preparation_status: str
    summary_status: str
    reminder_status: str
    assigned_caregiver_name: Optional[str] = None
    created_at: datetime


class ParentReminder(BaseModel):
    id: uuid.UUID
    title: str
    body: str
    priority: str
    created_at: datetime


class ParentFamilyMessage(BaseModel):
    id: uuid.UUID
    sender_name: str
    message_type: str
    body: str
    created_at: datetime


class ParentPendingAction(BaseModel):
    action_type: str = Field(..., description="take_medication | submit_checkin | review_appointment")
    title: str
    payload: Dict[str, Any] = Field(default_factory=dict)


class ParentHomeResponse(BaseModel):
    parent_profile_id: uuid.UUID
    checkin_status: ParentCheckinStatus
    today_medications: List[ParentTodayMedication] = []
    upcoming_appointment: Optional[ParentUpcomingAppointment] = None
    reminders: List[ParentReminder] = []
    family_messages: List[ParentFamilyMessage] = []
    pending_actions: List[ParentPendingAction] = []


# ==========================================
# Family Dashboard Read Models
# ==========================================

class FamilyDashboardSubjectSummary(BaseModel):
    subject_id: uuid.UUID
    display_name: str
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    timezone: str = "Asia/Kolkata"
    health_status: str = "stable"
    latest_checkin_feeling: Optional[str] = None
    latest_checkin_submitted_at: Optional[datetime] = None
    adherence_rate_7d: Optional[float] = None
    active_alerts_count: int = 0


class FamilyDashboardScheduleItem(BaseModel):
    id: uuid.UUID
    item_type: str = Field(..., description="task | appointment")
    title: str
    category: Optional[str] = None
    status: str
    due_at: Optional[datetime] = None
    assigned_to_name: Optional[str] = None


class FamilyDashboardMemberSummary(BaseModel):
    profile_id: uuid.UUID
    display_name: str
    role: str
    joined_at: datetime


class FamilyDashboardResponse(BaseModel):
    family_id: uuid.UUID
    family_name: str
    primary_coordinator_id: Optional[uuid.UUID] = None
    primary_coordinator_name: Optional[str] = None
    members: List[FamilyDashboardMemberSummary] = []
    care_subjects: List[FamilyDashboardSubjectSummary] = []
    guardian_moments: List[GuardianMomentSummary] = []
    upcoming_schedule: List[FamilyDashboardScheduleItem] = []
    recent_activity: List[RecentUpdateSummary] = []
    active_consents_count: int = 0


# ==========================================
# Parent Health Summary Composed Read Models
# ==========================================

class SubjectProfileInfo(BaseModel):
    subject_id: uuid.UUID
    fhir_patient_id: str
    display_name: str
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    timezone: str = "Asia/Kolkata"


class SubjectCaregiverSummary(BaseModel):
    profile_id: uuid.UUID
    display_name: str
    relationship_type: str
    access_level: Optional[str] = None


class SubjectAdherenceSummary(BaseModel):
    total_logged: int = 0
    taken_count: int = 0
    missed_count: int = 0
    adherence_rate_7d: Optional[float] = None
    adherence_rate_30d: Optional[float] = None
    today_events: List[TodayMedicationSummary] = []


class SubjectDocumentSummary(BaseModel):
    id: uuid.UUID
    filenest_file_id: str
    document_type: str
    status: str
    ai_processing_status: str
    extraction_status: str
    created_at: datetime


class ParentHealthSummaryResponse(BaseModel):
    subject_info: SubjectProfileInfo
    family_id: uuid.UUID
    fhir_data: Dict[str, Any] = Field(default_factory=dict, description="Projected FHIR vitals/conditions/EMR summaries")
    care_relationships: List[SubjectCaregiverSummary] = []
    adherence: SubjectAdherenceSummary
    checkins: List[WellbeingCheckinResponse] = []
    ai_insights: List[AIInsightResponse] = []
    appointments: List[AppointmentCoordinationResponse] = []
    recent_documents: List[SubjectDocumentSummary] = []


# ==========================================
# Explicit Create, Patch, Response, and Query Schemas
# ==========================================

# 1. Profile Schemas
class ProfileCreate(BaseModel):
    iam_subject_id: str
    email: Optional[EmailStr] = None
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: str = "UTC"
    preferred_language: Optional[str] = "en"


class ProfilePatch(BaseModel):
    display_name: Optional[str] = None
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    phone: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: Optional[str] = None
    preferred_language: Optional[str] = None
    avatar_file_id: Optional[uuid.UUID] = None


# 2. Care Subject Schemas
class CareSubjectPatch(BaseModel):
    relationship_to_coordinator: Optional[str] = None
    city: Optional[str] = None
    country_code: Optional[str] = None
    timezone: Optional[str] = None
    status: Optional[str] = None


class CareSubjectQuery(BaseModel):
    status: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 3. Care Task Schemas
CareTaskPatch = CareTaskUpdate


class CareTaskQuery(BaseModel):
    status: Optional[str] = None
    category: Optional[str] = None
    priority: Optional[str] = None
    assigned_to_profile_id: Optional[uuid.UUID] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 4. Wellbeing Checkin Schemas
class WellbeingCheckinPatch(BaseModel):
    feeling: Optional[str] = None
    notes: Optional[str] = None
    severity: Optional[str] = None


class WellbeingCheckinQuery(BaseModel):
    feeling: Optional[str] = None
    severity: Optional[str] = None
    since: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 5. Consent Schemas
class ConsentPatch(BaseModel):
    scope: Optional[Dict[str, Any]] = None
    expires_at: Optional[datetime] = None
    status: Optional[str] = None


class ConsentQuery(BaseModel):
    status: Optional[str] = None
    grantee_profile_id: Optional[uuid.UUID] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 6. Health Document Schemas
class HealthDocumentPatch(BaseModel):
    document_type: Optional[str] = None
    status: Optional[str] = None
    ai_processing_status: Optional[str] = None
    extraction_status: Optional[str] = None


class HealthDocumentQuery(BaseModel):
    document_type: Optional[str] = None
    status: Optional[str] = None
    limit: int = Field(default=20, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 7. Notification Schemas
class NotificationPatch(BaseModel):
    read: Optional[bool] = None
    dismissed: Optional[bool] = None


class NotificationQuery(BaseModel):
    is_read: Optional[bool] = None
    priority: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 8. AI Insight Schemas
class AIInsightPatch(BaseModel):
    status: Optional[str] = None
    actionability: Optional[str] = None


class AIInsightQuery(BaseModel):
    severity: Optional[str] = None
    type: Optional[str] = None
    status: Optional[str] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 9. Family Message Schemas
class FamilyMessagePatch(BaseModel):
    body: Optional[str] = None


class FamilyMessageQuery(BaseModel):
    conversation_id: Optional[uuid.UUID] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)


# 10. Audit Trail Query
class AuditTrailQuery(BaseModel):
    action: Optional[str] = None
    resource: Optional[str] = None
    actor_id: Optional[uuid.UUID] = None
    since: Optional[datetime] = None
    limit: int = Field(default=50, ge=1, le=100)
    offset: int = Field(default=0, ge=0)




