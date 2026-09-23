"""
Mobile-Optimized API Contracts & DTOs:
Designed specifically for mobile efficiency:
- Compact, aggregated Home DTOs (eliminating 100 individual REST roundtrips)
- Standardized cursor pagination for timelines and chat messages
- Standardized offset pagination for tasks and documents
- Dynamic partial field projections
"""

from typing import List, Dict, Any, Optional, Generic, TypeVar
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field


T = TypeVar("T")


class CursorPaginatedResponse(BaseModel, Generic[T]):
    """Standardized Cursor-based pagination for high-volume infinite scroll timelines and messages."""
    items: List[T]
    next_cursor: Optional[str] = None
    prev_cursor: Optional[str] = None
    has_more: bool = False
    limit: int = 20


class OffsetPaginatedResponse(BaseModel, Generic[T]):
    """Standardized Offset-based pagination for administrative/tabular views."""
    items: List[T]
    page: int = 1
    per_page: int = 20
    total_pages: int = 1
    total_items: int = 0


# ==========================================
# Compact Mobile DTOs
# ==========================================

class MobileSubjectSummaryDTO(BaseModel):
    subject_id: uuid.UUID
    fhir_patient_id: str
    display_name: str
    relationship: str
    avatar_url: Optional[str] = None
    status: str = "active"
    latest_feeling: Optional[str] = None
    vital_summary: Dict[str, Any] = Field(default_factory=dict)
    today_adherence_rate: str = "100%"


class MobileGuardianMomentDTO(BaseModel):
    moment_id: uuid.UUID
    subject_id: uuid.UUID
    type: str
    severity: str
    title: str
    summary: str
    recommendation: Optional[str] = None
    created_at: datetime


class MobileMedicationSummaryDTO(BaseModel):
    medication_id: str
    subject_id: uuid.UUID
    name: str
    dosage: str
    scheduled_time: str
    status: str  # "taken" | "due" | "missed" | "scheduled"


class MobileAppointmentDTO(BaseModel):
    coordination_id: uuid.UUID
    subject_id: uuid.UUID
    fhir_appointment_id: str
    title: str
    scheduled_at: datetime
    preparation_status: str
    doctor_name: str = "Attending Physician"


class MobileCareTaskDTO(BaseModel):
    task_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    title: str
    category: str
    priority: str
    status: str
    due_at: Optional[datetime] = None
    assigned_to_name: Optional[str] = None


class MobileTimelineEventDTO(BaseModel):
    event_id: str
    event_type: str
    summary: str
    category: str
    occurred_at: datetime
    metadata: Dict[str, Any] = Field(default_factory=dict)


class TimelineItemDTO(BaseModel):
    id: str
    event_type: str
    title: str
    summary: str
    category: str
    occurred_at: datetime
    actor_name: Optional[str] = None
    metadata: Dict[str, Any] = Field(default_factory=dict)


class SubjectTimelineResponse(BaseModel):
    items: List[TimelineItemDTO] = Field(default_factory=list)
    next_cursor: Optional[str] = None



class MobileFamilyMessageDTO(BaseModel):
    message_id: uuid.UUID
    conversation_id: uuid.UUID
    sender_id: uuid.UUID
    sender_name: str
    message_type: str = "text"
    body: str
    created_at: datetime


class MobileFamilyHomeDTO(BaseModel):
    """
    Compact, aggregated Home DTO for mobile efficiency.
    Delivers entire mobile home state in a single request instead of 100 REST calls.
    """
    coordinator_profile_id: Optional[uuid.UUID] = None
    family_id: uuid.UUID
    family_name: str
    user_role: str
    timezone: str = "UTC"
    subjects: List[MobileSubjectSummaryDTO] = Field(default_factory=list)
    parent_statuses: List[Any] = Field(default_factory=list)
    attention_items: List[Any] = Field(default_factory=list)
    guardian_moments: List[MobileGuardianMomentDTO] = Field(default_factory=list)
    medications_today: List[MobileMedicationSummaryDTO] = Field(default_factory=list)
    today_medications: List[Any] = Field(default_factory=list)
    upcoming_appointments: List[MobileAppointmentDTO] = Field(default_factory=list)
    pending_tasks: List[MobileCareTaskDTO] = Field(default_factory=list)
    pending_care_tasks: List[Any] = Field(default_factory=list)
    recent_updates: List[Any] = Field(default_factory=list)
    unread_notifications_count: int = 0
    latest_message: Optional[MobileFamilyMessageDTO] = None
    clinical_data_status: str = "available"
    clinical_warning: Optional[str] = None
    generated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


