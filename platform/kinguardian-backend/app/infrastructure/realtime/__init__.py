"""
Realtime Infrastructure Package:
WebSocket, SSE, and Push Notification event invalidation abstraction.
"""

from app.infrastructure.realtime.models import (
    ProjectionInvalidationEvent,
    RealtimeMessage
)
from app.infrastructure.realtime.projections import (
    DOMAIN_EVENT_PROJECTION_MAP,
    ProjectionInvalidationRegistry
)
from app.infrastructure.realtime.manager import (
    RealtimeHub,
    realtime_hub
)

__all__ = [
    "ProjectionInvalidationEvent",
    "RealtimeMessage",
    "DOMAIN_EVENT_PROJECTION_MAP",
    "ProjectionInvalidationRegistry",
    "RealtimeHub",
    "realtime_hub"
]
