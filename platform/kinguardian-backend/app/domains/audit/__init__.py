"""
Audit Domain Module:
Bounded domain for Immutable Audit Logging, Event Logs, Cross-Timezone Event Auditing, and Outbox Events.
"""

from app.domains.events.models import EventLog, OutboxEvent
from app.domains.events.services import EventService
from app.domains.events.audit import AuditService, AuditEventRecord
from app.domains.events.bus import InMemoryEventBus
from app.domains.events.domain_events import DomainEvent

EventBus = InMemoryEventBus
AuditLogger = AuditService
AuditRecord = AuditEventRecord

__all__ = [
    "EventLog",
    "OutboxEvent",
    "EventService",
    "AuditService",
    "AuditEventRecord",
    "AuditLogger",
    "AuditRecord",
    "InMemoryEventBus",
    "EventBus",
    "DomainEvent"
]
