"""
Realtime API Endpoints:
Provides WebSocket and Server-Sent Events (SSE) subscriptions for active mobile/web sessions.
Allows clients to reactively refresh affected projections upon receiving event notifications.
"""

import asyncio
import json
import uuid
from typing import Optional, AsyncGenerator
from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, Query, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession


from app.core.database import get_db
from app.core.security import get_current_user, decode_access_token
from app.core.logging import get_logger
from app.domains.family.infrastructure.models import AppProfile
from app.domains.family.infrastructure.repositories import (
    SQLAlchemyAppProfileRepository,
    SQLAlchemyFamilyRepository,
    SQLAlchemyConsentRepository
)
from app.domains.events.services import EventService
from app.domains.family.application.services import FamilyService
from app.infrastructure.realtime.manager import realtime_hub
from app.infrastructure.realtime.models import ProjectionInvalidationEvent
router = APIRouter(tags=["Realtime & Events"])
logger = get_logger(__name__)



def get_family_service(session: AsyncSession) -> FamilyService:
    return FamilyService(
        user_repo=SQLAlchemyAppProfileRepository(session),
        circle_repo=SQLAlchemyFamilyRepository(session),
        consent_repo=SQLAlchemyConsentRepository(session),
        event_logger=EventService(session)
    )


@router.websocket("/ws/families/{family_id}")
async def websocket_family_endpoint(
    websocket: WebSocket,
    family_id: uuid.UUID,
    token: Optional[str] = Query(None)
):
    """
    WebSocket Duplex Channel:
    Active mobile sessions connect here to receive realtime projection invalidations.
    Eliminates aggressive HTTP polling.
    """
    # 1. Authenticate Token
    user_profile_id = None
    if token:
        try:
            payload = decode_access_token(token)
            if payload and "sub" in payload:
                user_profile_id = uuid.UUID(payload["sub"]) if len(payload["sub"]) == 36 else None
        except Exception as err:
            logger.debug(f"WebSocket token decode failed: {err}")

    # 2. Connect to Realtime Hub
    await realtime_hub.connect_websocket(family_id, websocket, user_id=user_profile_id)

    # 3. Send Initial Welcome / Connected Ack
    await websocket.send_text(json.dumps({
        "type": "connection_ack",
        "family_id": str(family_id),
        "status": "connected",
        "timestamp": datetime.now(timezone.utc).isoformat()
    }))

    try:
        while True:
            # Keepalive / Client message loop
            data_text = await websocket.receive_text()
            try:
                msg = json.loads(data_text)
                if msg.get("type") == "ping":
                    await websocket.send_text(json.dumps({
                        "type": "pong",
                        "timestamp": datetime.now(timezone.utc).isoformat()
                    }))
            except Exception as parse_err:
                logger.debug(f"WebSocket incoming message parse failed: {parse_err}")
    except WebSocketDisconnect:
        await realtime_hub.disconnect_websocket(family_id, websocket, user_id=user_profile_id)



@router.get("/families/{family_id}/events/stream")
async def sse_family_events_stream(
    family_id: uuid.UUID,
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Server-Sent Events (SSE) Stream:
    Streams projection invalidation events to active browser and lightweight mobile sessions.
    """
    service = get_family_service(db_session)
    mem = await service.circle_repo.get_member(family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this family circle.")

    async def event_generator() -> AsyncGenerator[str, None]:
        queue = await realtime_hub.subscribe_sse(family_id)
        # Send initial connected event
        yield f"event: connected\ndata: {json.dumps({'status': 'stream_active', 'family_id': str(family_id)})}\n\n"

        try:
            while True:
                try:
                    event: ProjectionInvalidationEvent = await asyncio.wait_for(queue.get(), timeout=15.0)
                    yield f"event: {event.event_type}\ndata: {event.model_dump_json()}\n\n"
                except asyncio.TimeoutError:
                    # Keepalive heartbeat comment
                    yield ": keepalive\n\n"
        except asyncio.CancelledError:
            pass
        finally:
            await realtime_hub.unsubscribe_sse(family_id, queue)

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@router.post("/families/{family_id}/events/invalidation", response_model=ProjectionInvalidationEvent)
async def trigger_invalidation_broadcast(
    family_id: uuid.UUID,
    domain_event: str = Query(..., description="Domain event that occurred (e.g. wellbeing_checkin_submitted)"),
    subject_id: Optional[uuid.UUID] = Query(None),
    current_user: AppProfile = Depends(get_current_user),
    db_session: AsyncSession = Depends(get_db)
):
    """
    Triggers an invalidation broadcast to active sessions of the family.
    Used by internal domain services and event listeners.
    """
    service = get_family_service(db_session)
    mem = await service.circle_repo.get_member(family_id, current_user.id)
    if not mem:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Not authorized for this family.")

    return await realtime_hub.handle_domain_event(
        event_type=domain_event,
        family_id=family_id,
        subject_id=subject_id
    )
