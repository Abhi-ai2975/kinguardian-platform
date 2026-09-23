"""
Domain Events Definition Module.
Standardizes platform domain events using strict dot-notation taxonomy:

- family.created
- family.member.added
- care.relationship.created
- subject.checkin.submitted
- medication.taken
- medication.missed
- document.uploaded
- document.processed
- appointment.preparation.created
- insight.generated
- guardian.moment.created
- care.task.created
- care.task.completed
- notification.created
"""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
import uuid
from typing import Optional, Dict, Any, Callable, List
import inspect


class DomainEventType(str, Enum):
    """Canonical Domain Event Taxonomy."""
    FAMILY_CREATED = "family.created"
    FAMILY_MEMBER_ADDED = "family.member.added"
    CARE_RELATIONSHIP_CREATED = "care.relationship.created"

    SUBJECT_CHECKIN_SUBMITTED = "subject.checkin.submitted"
    MEDICATION_TAKEN = "medication.taken"
    MEDICATION_MISSED = "medication.missed"

    DOCUMENT_UPLOADED = "document.uploaded"
    DOCUMENT_PROCESSED = "document.processed"

    APPOINTMENT_PREPARATION_CREATED = "appointment.preparation.created"

    INSIGHT_GENERATED = "insight.generated"
    GUARDIAN_MOMENT_CREATED = "guardian.moment.created"

    CARE_TASK_CREATED = "care.task.created"
    CARE_TASK_COMPLETED = "care.task.completed"

    NOTIFICATION_CREATED = "notification.created"

    # Additional standard lifecycle events
    CONSENT_GRANTED = "consent.granted"
    CONSENT_REVOKED = "consent.revoked"
    FAMILY_MESSAGE_SENT = "family.message.sent"
    AI_ACTION_REQUESTED = "ai.action.requested"
    AI_ACTION_APPROVED = "ai.action.approved"

    # Wearable Connectivity & Synchronization Events
    WEARABLE_CONNECTED = "wearable.connected"
    WEARABLE_DISCONNECTED = "wearable.disconnected"
    WEARABLE_SYNC_STARTED = "wearable.sync.started"
    WEARABLE_SYNC_COMPLETED = "wearable.sync.completed"
    WEARABLE_SYNC_FAILED = "wearable.sync.failed"
    WEARABLE_DATA_RECEIVED = "wearable.data.received"
    WEARABLE_DATA_UPDATED = "wearable.data.updated"



@dataclass(kw_only=True)
class DomainEvent:
    """
    Base Domain Event abstraction with versioning support.
    
    Structure:
    {
      "event_type": "subject.checkin.submitted",
      "event_version": 1,
      "event_id": "...",
      "occurred_at": "...",
      "aggregate_type": "care_subject",
      "aggregate_id": "...",
      "family_id": "...",
      "actor_profile_id": "...",
      "payload": {}
    }
    """
    event_type: str
    event_version: int = 1
    aggregate_type: str
    aggregate_id: str
    family_id: Optional[uuid.UUID] = None
    actor_profile_id: Optional[uuid.UUID] = None
    payload: Dict[str, Any] = field(default_factory=dict)
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_type": self.event_type,
            "event_version": self.event_version,
            "event_id": str(self.event_id),
            "occurred_at": self.occurred_at.isoformat(),
            "aggregate_type": self.aggregate_type,
            "aggregate_id": str(self.aggregate_id),
            "family_id": str(self.family_id) if self.family_id else None,
            "actor_profile_id": str(self.actor_profile_id) if self.actor_profile_id else None,
            "payload": self.payload
        }



# ==========================================
# Typed Domain Event Classes
# ==========================================

# 1. Family & Memberships
@dataclass(kw_only=True)
class FamilyCreated(DomainEvent):
    event_type: str = DomainEventType.FAMILY_CREATED.value
    aggregate_type: str = "family"


@dataclass(kw_only=True)
class FamilyMemberAdded(DomainEvent):
    event_type: str = DomainEventType.FAMILY_MEMBER_ADDED.value
    aggregate_type: str = "family"


@dataclass(kw_only=True)
class CareRelationshipCreated(DomainEvent):
    event_type: str = DomainEventType.CARE_RELATIONSHIP_CREATED.value
    aggregate_type: str = "care_subject"


# 2. Check-ins & Wellbeing
@dataclass(kw_only=True)
class SubjectCheckInSubmitted(DomainEvent):
    event_type: str = DomainEventType.SUBJECT_CHECKIN_SUBMITTED.value
    aggregate_type: str = "care_subject"


# Compatibility alias
ParentCheckInSubmitted = SubjectCheckInSubmitted


@dataclass(kw_only=True)
class ParentReportedUnwell(DomainEvent):
    event_type: str = "parent.reported.unwell"
    aggregate_type: str = "care_subject"


# 3. Medications
@dataclass(kw_only=True)
class MedicationTaken(DomainEvent):
    event_type: str = DomainEventType.MEDICATION_TAKEN.value
    aggregate_type: str = "medication_adherence"


@dataclass(kw_only=True)
class MedicationMissed(DomainEvent):
    event_type: str = DomainEventType.MEDICATION_MISSED.value
    aggregate_type: str = "medication_adherence"


@dataclass(kw_only=True)
class MedicationScheduled(DomainEvent):
    event_type: str = "medication.scheduled"
    aggregate_type: str = "medication_adherence"


# 4. Documents
@dataclass(kw_only=True)
class DocumentUploaded(DomainEvent):
    event_type: str = DomainEventType.DOCUMENT_UPLOADED.value
    aggregate_type: str = "health_document"


@dataclass(kw_only=True)
class DocumentProcessed(DomainEvent):
    event_type: str = DomainEventType.DOCUMENT_PROCESSED.value
    aggregate_type: str = "health_document"


# Compatibility alias
DocumentProcessingCompleted = DocumentProcessed


@dataclass(kw_only=True)
class DocumentExtractionNeedsReview(DomainEvent):
    event_type: str = "document.extraction.needs_review"
    aggregate_type: str = "document_extraction"


# 5. Appointments
@dataclass(kw_only=True)
class AppointmentPreparationCreated(DomainEvent):
    event_type: str = DomainEventType.APPOINTMENT_PREPARATION_CREATED.value
    aggregate_type: str = "appointment_coordination"


# Compatibility alias
AppointmentCreated = AppointmentPreparationCreated


@dataclass(kw_only=True)
class AppointmentCompleted(DomainEvent):
    event_type: str = "appointment.completed"
    aggregate_type: str = "appointment_coordination"


# 6. Insights & Guardian Moments
@dataclass(kw_only=True)
class InsightGenerated(DomainEvent):
    event_type: str = DomainEventType.INSIGHT_GENERATED.value
    aggregate_type: str = "ai_insight"


# Compatibility alias
AIInsightCreated = InsightGenerated


@dataclass(kw_only=True)
class HealthTrendChanged(DomainEvent):
    event_type: str = "health.trend.changed"
    aggregate_type: str = "monitoring_preference"


@dataclass(kw_only=True)
class GuardianMomentCreated(DomainEvent):
    event_type: str = DomainEventType.GUARDIAN_MOMENT_CREATED.value
    aggregate_type: str = "ai_insight"



# 7. Care Tasks
@dataclass(kw_only=True)
class CareTaskCreated(DomainEvent):
    event_type: str = DomainEventType.CARE_TASK_CREATED.value
    aggregate_type: str = "care_task"


@dataclass(kw_only=True)
class CareTaskCompleted(DomainEvent):
    event_type: str = DomainEventType.CARE_TASK_COMPLETED.value
    aggregate_type: str = "care_task"


@dataclass(kw_only=True)
class CareTaskAssigned(DomainEvent):
    event_type: str = "care.task.assigned"
    aggregate_type: str = "care_task"


# 8. Notifications & Messages
@dataclass(kw_only=True)
class NotificationCreated(DomainEvent):
    event_type: str = DomainEventType.NOTIFICATION_CREATED.value
    aggregate_type: str = "notification"


@dataclass(kw_only=True)
class FamilyMessageSent(DomainEvent):
    event_type: str = DomainEventType.FAMILY_MESSAGE_SENT.value
    aggregate_type: str = "family_conversation"


# 9. Consents
@dataclass(kw_only=True)
class ConsentGranted(DomainEvent):
    event_type: str = DomainEventType.CONSENT_GRANTED.value
    aggregate_type: str = "consent"


@dataclass(kw_only=True)
class ConsentRevoked(DomainEvent):
    event_type: str = DomainEventType.CONSENT_REVOKED.value
    aggregate_type: str = "consent"


# 10. AI Actions
@dataclass(kw_only=True)
class AIActionRequested(DomainEvent):
    event_type: str = DomainEventType.AI_ACTION_REQUESTED.value
    aggregate_type: str = "ai_action"


@dataclass(kw_only=True)
class AIActionApproved(DomainEvent):
    event_type: str = DomainEventType.AI_ACTION_APPROVED.value
    aggregate_type: str = "ai_action"


# 11. Wearable Sync & Telemetry Events
@dataclass(kw_only=True)
class WearableConnected(DomainEvent):
    event_type: str = DomainEventType.WEARABLE_CONNECTED.value
    aggregate_type: str = "wearable_connection"


@dataclass(kw_only=True)
class WearableDisconnected(DomainEvent):
    event_type: str = DomainEventType.WEARABLE_DISCONNECTED.value
    aggregate_type: str = "wearable_connection"


@dataclass(kw_only=True)
class WearableSyncStarted(DomainEvent):
    event_type: str = DomainEventType.WEARABLE_SYNC_STARTED.value
    aggregate_type: str = "wearable_sync"


@dataclass(kw_only=True)
class WearableSyncCompleted(DomainEvent):
    event_type: str = DomainEventType.WEARABLE_SYNC_COMPLETED.value
    aggregate_type: str = "wearable_sync"


@dataclass(kw_only=True)
class WearableSyncFailed(DomainEvent):
    event_type: str = DomainEventType.WEARABLE_SYNC_FAILED.value
    aggregate_type: str = "wearable_sync"


@dataclass(kw_only=True)
class WearableDataReceived(DomainEvent):
    """
    Batched telemetry envelope fired when fresh metrics/summaries are received.
    Batches records to prevent flooding the event bus with 1 event per raw sensor measurement.
    """
    event_type: str = DomainEventType.WEARABLE_DATA_RECEIVED.value
    aggregate_type: str = "wearable_data"


@dataclass(kw_only=True)
class WearableDataUpdated(DomainEvent):
    """
    Fired when previously synced wearable metrics are updated or consolidated.
    """
    event_type: str = DomainEventType.WEARABLE_DATA_UPDATED.value
    aggregate_type: str = "wearable_data"



# ==========================================
# Domain Event Dispatcher / Handler Bus
# ==========================================

EventHandler = Callable[[DomainEvent], Any]


class DomainEventBus:
    """
    In-memory domain event bus for subscribing and dispatching domain events.
    """
    def __init__(self):
        self._handlers: Dict[str, List[EventHandler]] = {}

    def subscribe(self, event_type: str, handler: EventHandler) -> None:
        if event_type not in self._handlers:
            self._handlers[event_type] = []
        self._handlers[event_type].append(handler)

    async def publish(self, event: DomainEvent) -> None:
        handlers = self._handlers.get(event.event_type, [])
        for handler in handlers:
            if inspect.iscoroutinefunction(handler):
                await handler(event)
            else:
                handler(event)

    def clear(self) -> None:
        self._handlers.clear()


# Global domain event bus instance
event_bus = DomainEventBus()
