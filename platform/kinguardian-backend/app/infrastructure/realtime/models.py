"""
Realtime Event Models & Schemas:
Defines lightweight projection invalidation payloads and realtime message formats for WebSockets and SSE.
"""

from typing import List, Dict, Any, Optional
from datetime import datetime, timezone
import uuid
from pydantic import BaseModel, Field


class ProjectionInvalidationEvent(BaseModel):
    """
    Lightweight projection invalidation event dispatched to active mobile/web sessions.
    Instructs the client which specific queries/projections need to be refreshed.
    Eliminates constant aggressive polling.
    """
    event_id: str = Field(default_factory=lambda: f"rt_evt_{uuid.uuid4().hex[:12]}")
    event_type: str = "PROJECTION_INVALIDATED"
    domain_event: str
    family_id: uuid.UUID
    subject_id: Optional[uuid.UUID] = None
    affected_projections: List[str] = Field(
        default_factory=list,
        description="Keys of affected screens/projections: ['home', 'timeline', 'medications', 'care_tasks', 'insights', 'messages', 'documents']"
    )
    action: str = "refresh"  # "refresh" | "append" | "update" | "delete"
    entity_id: Optional[str] = None
    payload: Dict[str, Any] = Field(default_factory=dict)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class RealtimeMessage(BaseModel):
    """Encapsulates any realtime message exchanged over WebSocket / SSE."""
    type: str  # "invalidation" | "ping" | "pong" | "chat" | "alert"
    channel: str
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
