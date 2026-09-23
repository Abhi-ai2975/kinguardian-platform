"""
Phase 14 — Realtime / Push Test Suite.

Validates:
1. Event-driven updates & projection invalidation engine
2. Push notification abstractions (device push payloads & multi-channel routing)
3. WebSocket duplex communication channel (/ws/families/{id})
4. Server-Sent Events (SSE) streaming (/families/{id}/events/stream)
"""

import pytest
import asyncio
import json
import uuid
from starlette.testclient import TestClient

from app.main import app
from app.infrastructure.realtime.manager import realtime_hub, RealtimeHub
from app.infrastructure.realtime.projections import (
    ProjectionInvalidationRegistry,
    DOMAIN_EVENT_PROJECTION_MAP
)
from app.infrastructure.realtime.models import ProjectionInvalidationEvent
from app.domains.notifications.providers import (
    PushNotificationProvider,
    NotificationDeliveryRequest,
    NotificationDeliveryResult
)


def test_projection_invalidation_mappings_and_event_generation():
    """
    1. Event-Driven Updates:
    Verifies that domain events map precisely to affected mobile projection keys
    (e.g., 'home', 'medications', 'checkins', 'timeline', 'care_tasks').
    """
    # 1. Check-in event maps to home, timeline, checkins, summary
    checkin_projections = ProjectionInvalidationRegistry.get_affected_projections("wellbeing_checkin_submitted")
    assert "home" in checkin_projections
    assert "timeline" in checkin_projections
    assert "checkins" in checkin_projections

    # 2. Medication event maps to home, timeline, medications
    med_projections = ProjectionInvalidationRegistry.get_affected_projections("medication_confirmed")
    assert "home" in med_projections
    assert "medications" in med_projections

    # 3. Care Task event maps to home, timeline, care_tasks
    task_projections = ProjectionInvalidationRegistry.get_affected_projections("care_task_completed")
    assert "home" in task_projections
    assert "care_tasks" in task_projections

    # 4. Generate structured invalidation event
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()
    evt = ProjectionInvalidationRegistry.create_invalidation_event(
        event_type="wellbeing_checkin_submitted",
        family_id=family_id,
        subject_id=subject_id,
        entity_id="checkin-101",
        payload={"feeling": "good"}
    )
    assert evt.event_type == "PROJECTION_INVALIDATED"
    assert evt.domain_event == "wellbeing_checkin_submitted"
    assert evt.family_id == family_id
    assert "home" in evt.affected_projections
    assert evt.action == "refresh"


@pytest.mark.asyncio
async def test_push_notification_abstraction():
    """
    2. Push Notification Abstraction:
    Verifies push delivery adapter formatting, device token dispatch,
    and structured notification payload validation.
    """
    push_provider = PushNotificationProvider()

    req = NotificationDeliveryRequest(
        notification_id=uuid.uuid4(),
        recipient_profile_id=uuid.uuid4(),
        title="Medication Reminder",
        body="Time to take Morning Metformin 500mg",
        priority="high",
        metadata={
            "family_id": str(uuid.uuid4()),
            "action_type": "medication_reminder"
        }
    )

    delivery: NotificationDeliveryResult = await push_provider.send(req)

    assert delivery.success is True
    assert delivery.channel == "push"
    assert delivery.provider == "mock_fcm_push"
    assert delivery.provider_message_id is not None
    assert delivery.error is None


@pytest.mark.asyncio
async def test_sse_event_stream_subscription_and_dispatch():
    """
    3. Server-Sent Events (SSE) Streaming:
    Verifies subscribing to SSE queues and receiving broadcast invalidations in realtime.
    """
    hub = RealtimeHub()
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # 1. Subscribe to SSE queue
    sse_queue = await hub.subscribe_sse(family_id)

    try:
        # 2. Trigger domain event invalidation
        inv_event = await hub.handle_domain_event(
            event_type="care_task_completed",
            family_id=family_id,
            subject_id=subject_id,
            entity_id="task-999",
            payload={"status": "completed"}
        )

        # 3. Queue receives event immediately
        received: ProjectionInvalidationEvent = await asyncio.wait_for(sse_queue.get(), timeout=2.0)
        assert received.event_id == inv_event.event_id
        assert received.domain_event == "care_task_completed"
        assert "care_tasks" in received.affected_projections
        assert "home" in received.affected_projections
    finally:
        await hub.unsubscribe_sse(family_id, sse_queue)


def test_websocket_duplex_channel_lifecycle():
    """
    4. WebSocket Duplex Channel:
    Verifies WebSocket connection establishment, initial connection ack,
    and client ping/pong keepalive loop.
    """
    client = TestClient(app)
    family_id = uuid.uuid4()

    with client.websocket_connect(f"/ws/families/{family_id}") as websocket:
        # 1. Receive Connection Ack
        ack_data = websocket.receive_json()
        assert ack_data["type"] == "connection_ack"
        assert ack_data["family_id"] == str(family_id)
        assert ack_data["status"] == "connected"

        # 2. Send ping -> Receive pong
        websocket.send_json({"type": "ping"})
        pong_data = websocket.receive_json()
        assert pong_data["type"] == "pong"
        assert "timestamp" in pong_data
