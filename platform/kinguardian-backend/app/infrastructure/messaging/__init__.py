"""
Infrastructure Messaging Layer:
Transactional outbox pattern, event publishers, and asynchronous event consumers.
"""

from app.domains.events.bus import InMemoryEventBus
from app.domains.events.outbox import OutboxService
from app.domains.events.models import OutboxEvent

OutboxProcessor = OutboxService

__all__ = ["InMemoryEventBus", "OutboxService", "OutboxProcessor", "OutboxEvent"]
