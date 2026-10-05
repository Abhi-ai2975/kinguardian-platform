import uuid
from datetime import datetime
from pydantic import BaseModel, Field, field_validator
from zoneinfo import ZoneInfo


class FamilyCreate(BaseModel):
    name: str = Field(min_length=2, max_length=160)
    home_timezone: str = "Asia/Kolkata"
    @field_validator("home_timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        ZoneInfo(value)
        return value


class UserRegister(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    password: str = Field(min_length=6, max_length=128)
    name: str = Field(min_length=1, max_length=160)
    timezone: str = "Asia/Kolkata"
    role: str = Field(default="coordinator", pattern="^(coordinator|parent|caregiver|observer)$")


class UserLogin(BaseModel):
    email: str = Field(min_length=1, max_length=320)
    password: str = Field(min_length=1, max_length=128)


class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int
    user: dict
    role: str = "coordinator"
    permissions: list[str] = []


class IAMTokenExchange(BaseModel):
    token: str = Field(min_length=1)


class TokenRefreshRequest(BaseModel):
    refresh_token: str = Field(min_length=1)


class PasswordChangeRequest(BaseModel):
    old_password: str = Field(min_length=1)
    new_password: str = Field(min_length=6, max_length=128)


class MemberRoleUpdate(BaseModel):
    role: str = Field(pattern="^(coordinator|parent|caregiver|observer)$")


class SignInRequest(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    name: str = Field(min_length=1, max_length=160)
    timezone: str = "Europe/London"
    password: str | None = Field(default=None, max_length=128)
    role: str | None = Field(default="coordinator", pattern="^(coordinator|parent|caregiver|observer)$")


class MemberCreate(BaseModel):
    profile_id: uuid.UUID | None = None
    email: str | None = None
    name: str | None = None
    role: str = Field(pattern="^(coordinator|parent|caregiver|observer)$")
    timezone: str | None = None
    relationship: str | None = None


class SubjectCreate(BaseModel):
    profile_id: uuid.UUID | None = None
    external_patient_ref: str | None = Field(default=None, max_length=255)
    preferred_timezone: str = "Asia/Kolkata"
    @field_validator("preferred_timezone")
    @classmethod
    def valid_timezone(cls, value: str) -> str:
        ZoneInfo(value)
        return value


class GrantCreate(BaseModel):
    profile_id: uuid.UUID
    scopes: set[str] = Field(min_length=1)
    expires_at: datetime | None = None


class TaskCreate(BaseModel):
    assigned_to: uuid.UUID
    title: str = Field(min_length=1, max_length=200)
    detail: str | None = Field(default=None, max_length=5000)
    priority: str = Field(default="routine", pattern="^(routine|high|urgent)$")
    due_at: datetime


class CheckInCreate(BaseModel):
    occurred_at: datetime
    mood: str = Field(min_length=1, max_length=24)
    note: str | None = Field(default=None, max_length=5000)
    severity: str = Field(default="normal", pattern="^(normal|watch|urgent|high)$")


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=5000)


class ConsentCreate(BaseModel):
    subject_id: uuid.UUID | None = None
    profile_id: uuid.UUID
    scopes: set[str] = Field(min_length=1)


class RoutedCheckInCreate(CheckInCreate):
    family_id: uuid.UUID
    subject_id: uuid.UUID


class MedicationTakenCreate(BaseModel):
    family_id: uuid.UUID
    subject_id: uuid.UUID
    taken_at: datetime
    source: str = Field(default="parent", pattern="^(parent|caregiver|coordinator)$")


class RoutedTaskCreate(TaskCreate):
    family_id: uuid.UUID
    subject_id: uuid.UUID


class DocumentCreate(BaseModel):
    family_id: uuid.UUID
    subject_id: uuid.UUID
    filenest_file_id: str = Field(min_length=1, max_length=255)
    classification: str = Field(default="unclassified", max_length=64)


class AIMessageCreate(MessageCreate):
    # The agent receives a bounded conversation reference; it does not receive raw DB access.
    pass


class TaskComplete(BaseModel):
    completed_at: datetime = Field(default_factory=lambda: datetime.now(ZoneInfo("UTC")))
    completion_note: str | None = Field(default=None, max_length=5000)
    note: str | None = Field(default=None, max_length=5000)


class MedicationConfirmPayload(BaseModel):
    family_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    medication_id: str | None = None
    medication_ref: str | None = None
    taken: bool = True
    taken_at: datetime | None = None
    source: str = Field(default="parent", pattern="^(parent|caregiver|coordinator)$")


class CheckInDirectCreate(BaseModel):
    family_id: uuid.UUID | None = None
    feeling: str | None = None
    mood: str | None = None
    notes: str | None = None
    note: str | None = None
    severity: str = "normal"
    occurred_at: datetime | None = None


class NotificationCreate(BaseModel):
    recipient_id: uuid.UUID | None = None
    event_type: str = "alert"
    payload: dict = Field(default_factory=dict)
    family_id: uuid.UUID | None = None


class SimpleCheckInCreate(BaseModel):
    family_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    mood: str = Field(min_length=1, max_length=24)
    note: str | None = Field(default=None, max_length=5000)
    severity: str = Field(default="normal", pattern="^(normal|watch|urgent)$")
    occurred_at: datetime | None = None


class SimpleMedicationConfirm(BaseModel):
    family_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    medication_ref: str = Field(min_length=1, max_length=255)
    taken_at: datetime | None = None
    source: str = Field(default="parent", pattern="^(parent|caregiver|coordinator)$")


class SimpleDocumentCreate(BaseModel):
    family_id: uuid.UUID | None = None
    subject_id: uuid.UUID | None = None
    filenest_file_id: str = Field(min_length=1, max_length=255)
    classification: str = Field(default="unclassified", max_length=64)


class AppointmentCreate(BaseModel):
    doctor_name: str = Field(min_length=1, max_length=200)
    specialty: str | None = Field(default=None, max_length=100)
    date: datetime
    time: str = Field(min_length=1, max_length=10)
    location: str | None = Field(default=None, max_length=255)
    subject_id: uuid.UUID | None = None
    family_id: uuid.UUID | None = None
    telehealth_link: str | None = Field(default=None, max_length=500)
    notes: str | None = Field(default=None, max_length=5000)


class AIQueryRequest(BaseModel):
    query: str = Field(min_length=1, max_length=5000)
    family_id: uuid.UUID | None = None
    conversation_id: uuid.UUID | None = None


class ConversationCreate(BaseModel):
    family_id: uuid.UUID
    subject_id: uuid.UUID | None = None
    visibility: str = Field(default="family", max_length=24)


class NotificationCreateRequest(BaseModel):
    event_type: str = Field(min_length=1, max_length=100)
    payload: dict = Field(default_factory=dict)
    recipient_id: uuid.UUID | None = None
    family_id: uuid.UUID | None = None
