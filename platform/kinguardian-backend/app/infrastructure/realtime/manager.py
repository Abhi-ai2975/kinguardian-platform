"""
Realtime Hub & Connection Manager:
Manages active WebSocket and SSE client connections per family room.
Dispatches realtime projection invalidation events to active foreground sessions,
and coordinates with Push Notifications for background attention.
"""

import asyncio
import json
import uuid
from typing import Dict, List, Set, Any, Optional
from datetime import datetime, timezone
from fastapi import WebSocket

from app.core.logging import get_logger
from app.infrastructure.realtime.models import ProjectionInvalidationEvent, RealtimeMessage
from app.infrastructure.realtime.projections import ProjectionInvalidationRegistry

logger = get_logger(__name__)


class RealtimeHub:
    """
    Central Realtime Connection and Invalidation Dispatcher.
    Eliminates aggressive client polling by streaming invalidation events to active sessions.
    """

    def __init__(self):
        # Active WebSockets: family_id -> Set[WebSocket]
        self._active_sockets: Dict[uuid.UUID, Set[WebSocket]] = {}
        # Active SSE Queues: family_id -> List[asyncio.Queue]
        self._active_sse_queues: Dict[uuid.UUID, List[asyncio.Queue]] = {}
        # User session index: user_id -> Set[uuid.UUID] (subscribed families)
        self._user_subscriptions: Dict[uuid.UUID, Set[uuid.UUID]] = {}
        self._lock = asyncio.Lock()

    async def connect_websocket(self, family_id: uuid.UUID, websocket: WebSocket, user_id: Optional[uuid.UUID] = None) -> None:
        await websocket.accept()
        async with self._lock:
            if family_id not in self._active_sockets:
                self._active_sockets[family_id] = set()
            self._active_sockets[family_id].add(websocket)

            if user_id:
                if user_id not in self._user_subscriptions:
                    self._user_subscriptions[user_id] = set()
                self._user_subscriptions[user_id].add(family_id)

        logger.info(f"RealtimeHub: WebSocket connected for family={family_id}, active={len(self._active_sockets[family_id])}")

    async def disconnect_websocket(self, family_id: uuid.UUID, websocket: WebSocket, user_id: Optional[uuid.UUID] = None) -> None:
        async with self._lock:
            if family_id in self._active_sockets:
                self._active_sockets[family_id].discard(websocket)
                if not self._active_sockets[family_id]:
                    del self._active_sockets[family_id]

            if user_id and user_id in self._user_subscriptions:
                self._user_subscriptions[user_id].discard(family_id)
                if not self._user_subscriptions[user_id]:
                    del self._user_subscriptions[user_id]

        logger.info(f"RealtimeHub: WebSocket disconnected for family={family_id}")

    async def subscribe_sse(self, family_id: uuid.UUID) -> asyncio.Queue:
        queue: asyncio.Queue = asyncio.Queue()
        async with self._lock:
            if family_id not in self._active_sse_queues:
                self._active_sse_queues[family_id] = []
            self._active_sse_queues[family_id].append(queue)
        logger.info(f"RealtimeHub: SSE subscribed for family={family_id}, active={len(self._active_sse_queues[family_id])}")
        return queue

    async def unsubscribe_sse(self, family_id: uuid.UUID, queue: asyncio.Queue) -> None:
        async with self._lock:
            if family_id in self._active_sse_queues:
                if queue in self._active_sse_queues[family_id]:
                    self._active_sse_queues[family_id].remove(queue)
                if not self._active_sse_queues[family_id]:
                    del self._active_sse_queues[family_id]
        logger.info(f"RealtimeHub: SSE unsubscribed for family={family_id}")

    async def broadcast_invalidation(self, event: ProjectionInvalidationEvent) -> int:
        """
        Broadcasts a projection invalidation event to all active WebSocket and SSE connections
        subscribed to the affected family group.
        """
        family_id = event.family_id
        payload_text = event.model_dump_json()
        delivered_count = 0

        # 1. Dispatch to WebSockets
        sockets_to_remove = set()
        async with self._lock:
            sockets = list(self._active_sockets.get(family_id, []))

        for ws in sockets:
            try:
                await ws.send_text(payload_text)
                delivered_count += 1
            except Exception as e:
                logger.warning(f"RealtimeHub: Failed to send to websocket: {e}")
                sockets_to_remove.add(ws)

        if sockets_to_remove:
            async with self._lock:
                for dead_ws in sockets_to_remove:
                    if family_id in self._active_sockets:
                        self._active_sockets[family_id].discard(dead_ws)

        # 2. Dispatch to SSE Queues
        async with self._lock:
            sse_queues = list(self._active_sse_queues.get(family_id, []))

        for q in sse_queues:
            try:
                await q.put(event)
                delivered_count += 1
            except Exception as e:
                logger.warning(f"RealtimeHub: Failed to put to SSE queue: {e}")

        logger.info(
            f"RealtimeHub: Broadcasted invalidation for {event.domain_event} to family={family_id} "
            f"(projections={event.affected_projections}, delivered={delivered_count})"
        )
        return delivered_count

    async def handle_domain_event(
        self,
        event_type: str,
        family_id: uuid.UUID,
        subject_id: Optional[uuid.UUID] = None,
        entity_id: Optional[str] = None,
        payload: Optional[Dict[str, Any]] = None
    ) -> ProjectionInvalidationEvent:
        """
        Convenience adapter: converts domain event to invalidation event and broadcasts immediately.
        """
        inv_event = ProjectionInvalidationRegistry.create_invalidation_event(
            event_type=event_type,
            family_id=family_id,
            subject_id=subject_id,
            entity_id=entity_id,
            payload=payload
        )
        await self.broadcast_invalidation(inv_event)
        return inv_event


# Global singleton instance
realtime_hub = RealtimeHub()
