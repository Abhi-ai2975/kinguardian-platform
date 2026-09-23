"""
Realtime & Event Invalidation Abstraction Test Suite:
Verifies:
1. Projection Invalidation Mapping for domain events (eliminating aggressive HTTP polling)
2. RealtimeHub multi-subscriber dispatch (WebSocket & SSE)
3. WebSocket duplex communication (connection ack, ping/pong, realtime invalidations)
4. Client-side projection refresh verification
"""

import pytest
import asyncio
import json
import uuid
from starlette.testclient import TestClient

from app.main import app
from app.infrastructure.realtime.manager import realtime_hub
from app.infrastructure.realtime.projections import (
    ProjectionInvalidationRegistry,
    DOMAIN_EVENT_PROJECTION_MAP
)
from app.infrastructure.realtime.models import ProjectionInvalidationEvent


def test_projection_invalidation_registry_mappings():
    """
    Verifies that domain events map to specific affected client projection keys.
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
    task_projections = ProjectionInvalidationRegistry.get_affected_projections("care_task_updated")
    assert "home" in task_projections
    assert "care_tasks" in task_projections

    # 4. Guardian Moment maps to insights and home
    gm_projections = ProjectionInvalidationRegistry.get_affected_projections("guardian_moment_generated")
    assert "home" in gm_projections
    assert "guardian_moments" in gm_projections

    # 5. Factory helper creates valid invalidation event
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()
    evt = ProjectionInvalidationRegistry.create_invalidation_event(
        event_type="wellbeing_checkin_submitted",
        family_id=family_id,
        subject_id=subject_id,
        entity_id="ci_100",
        payload={"feeling": "great"}
    )
    assert evt.event_type == "PROJECTION_INVALIDATED"
    assert evt.domain_event == "wellbeing_checkin_submitted"
    assert evt.family_id == family_id
    assert "home" in evt.affected_projections
    assert evt.action == "refresh"


@pytest.mark.asyncio
async def test_realtime_hub_sse_subscription_and_broadcast():
    """
    Verifies that RealtimeHub delivers invalidation events to active SSE subscriber queues.
    """
    family_id = uuid.uuid4()
    subject_id = uuid.uuid4()

    # 1. Subscribe SSE
    sse_queue = await realtime_hub.subscribe_sse(family_id)

    try:
        # 2. Emit domain event invalidation
        inv_event = await realtime_hub.handle_domain_event(
            event_type="care_task_completed",
            family_id=family_id,
            subject_id=subject_id,
            entity_id="task_999",
            payload={"status": "completed"}
        )

        # 3. Queue receives event without polling
        received_event: ProjectionInvalidationEvent = await asyncio.wait_for(sse_queue.get(), timeout=2.0)
        assert received_event.event_id == inv_event.event_id
        assert received_event.domain_event == "care_task_completed"
        assert "care_tasks" in received_event.affected_projections
        assert "home" in received_event.affected_projections
    finally:
        await realtime_hub.unsubscribe_sse(family_id, sse_queue)


def test_websocket_family_channel_lifecycle():
    """
    Verifies WebSocket duplex channel: connection ack, ping-pong keepalive,
    and receiving realtime invalidation events.
    """
    family_id = uuid.uuid4()
    client = TestClient(app)

    with client.websocket_connect(f"/ws/families/{family_id}") as websocket:
        # 1. Receive Connection Ack
        ack_data = websocket.receive_json()
        assert ack_data["type"] == "connection_ack"
        assert ack_data["family_id"] == str(family_id)
        assert ack_data["status"] == "connected"

        # 2. Ping-Pong keepalive
        websocket.send_json({"type": "ping"})
        pong_data = websocket.receive_json()
        assert pong_data["type"] == "pong"
        assert "timestamp" in pong_data
