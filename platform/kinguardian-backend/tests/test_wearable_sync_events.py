"""
Wearable Sync & Lifecycle Domain Events Test Suite.

Verifies:
1. Canonical dot-notation event types:
   - wearable.connected
   - wearable.disconnected
   - wearable.sync.started
   - wearable.sync.completed
   - wearable.sync.failed
   - wearable.data.received
   - wearable.data.updated
2. Telemetry batching rule (do not emit 1 event per raw metric tick).
3. Publishing and handling on DomainEventBus.
"""

import uuid
import pytest
from datetime import datetime, timezone

from app.domains.events.domain_events import (
    DomainEventType,
    DomainEventBus,
    WearableConnected,
    WearableDisconnected,
    WearableSyncStarted,
    WearableSyncCompleted,
    WearableSyncFailed,
    WearableDataReceived,
    WearableDataUpdated
)
from app.domains.wearables.domain.events import (
    WearableConnectedEvent,
    WearableDisconnectedEvent,
    WearableSyncStartedEvent,
    WearableSyncCompletedEvent,
    WearableSyncFailedEvent,
    WearableDataReceivedEvent,
    WearableDataUpdatedEvent,
    create_batched_data_received_event
)


def test_wearable_event_types_taxonomy():
    """Verifies all 7 event types match the required taxonomy."""
    assert DomainEventType.WEARABLE_CONNECTED.value == "wearable.connected"
    assert DomainEventType.WEARABLE_DISCONNECTED.value == "wearable.disconnected"
    assert DomainEventType.WEARABLE_SYNC_STARTED.value == "wearable.sync.started"
    assert DomainEventType.WEARABLE_SYNC_COMPLETED.value == "wearable.sync.completed"
    assert DomainEventType.WEARABLE_SYNC_FAILED.value == "wearable.sync.failed"
    assert DomainEventType.WEARABLE_DATA_RECEIVED.value == "wearable.data.received"
    assert DomainEventType.WEARABLE_DATA_UPDATED.value == "wearable.data.updated"


def test_wearable_connected_and_disconnected_events():
    """Verifies connection lifecycle event payloads."""
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # Connected
    conn_event = WearableConnectedEvent(
        subject_id=subject_id,
        family_id=family_id,
        provider="garmin",
        connection_id="conn_garmin_123",
        provider_user_id="user_garmin_abc",
        scopes=["activity", "sleep", "heart_rate"]
    )
    assert conn_event.event_type == "wearable.connected"
    d_conn = conn_event.to_dict()
    assert d_conn["provider"] == "garmin"
    assert d_conn["connection_id"] == "conn_garmin_123"
    assert "activity" in d_conn["scopes"]

    # Disconnected
    disconn_event = WearableDisconnectedEvent(
        subject_id=subject_id,
        family_id=family_id,
        provider="garmin",
        connection_id="conn_garmin_123",
        reason="user_revoked"
    )
    assert disconn_event.event_type == "wearable.disconnected"
    d_disconn = disconn_event.to_dict()
    assert d_disconn["reason"] == "user_revoked"


def test_wearable_sync_lifecycle_events():
    """Verifies sync started, completed, and failed events."""
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # Sync Started
    started = WearableSyncStartedEvent(
        subject_id=subject_id,
        family_id=family_id,
        sync_id="sync_001",
        provider="oura",
        sync_mode="webhook",
        date_from="2026-08-01",
        date_to="2026-08-22"
    )
    assert started.event_type == "wearable.sync.started"
    assert started.to_dict()["sync_mode"] == "webhook"

    # Sync Completed
    completed = WearableSyncCompletedEvent(
        subject_id=subject_id,
        family_id=family_id,
        sync_id="sync_001",
        provider="oura",
        records_processed=150,
        metrics_summary={"sleep": 21, "hrv": 129},
        duration_ms=420.5
    )
    assert completed.event_type == "wearable.sync.completed"
    assert completed.to_dict()["records_processed"] == 150
    assert completed.to_dict()["metrics_summary"]["sleep"] == 21

    # Sync Failed
    failed = WearableSyncFailedEvent(
        subject_id=subject_id,
        family_id=family_id,
        sync_id="sync_002",
        provider="fitbit",
        error_code="TOKEN_EXPIRED",
        error_message="OAuth refresh token expired",
        retryable=False
    )
    assert failed.event_type == "wearable.sync.failed"
    assert failed.to_dict()["error_code"] == "TOKEN_EXPIRED"
    assert failed.to_dict()["retryable"] is False


def test_wearable_data_batching_invariant():
    """
    CRITICAL TEST:
    Verifies that raw intraday telemetry (e.g. 500 heart rate / step ticks)
    is batched into a single WearableDataReceivedEvent rather than flooding the bus.
    """
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    # Simulate 500 minute-by-minute step readings
    raw_samples = [
        {"metric_type": "steps", "timestamp": f"2026-08-22T10:{i:02d}:00Z", "value": 15}
        for i in range(50)
    ] + [
        {"metric_type": "heart_rate", "timestamp": f"2026-08-22T10:{i:02d}:00Z", "value": 72}
        for i in range(50)
    ]

    batched_event = create_batched_data_received_event(
        subject_id=subject_id,
        family_id=family_id,
        provider="garmin",
        records=raw_samples,
        date_range="2026-08-22"
    )

    assert batched_event.event_type == "wearable.data.received"
    assert batched_event.batch_size == 100
    assert set(batched_event.metrics_categories) == {"steps", "heart_rate"}
    d = batched_event.to_dict()
    assert d["batch_size"] == 100
    assert d["records_count"] == 100


def test_wearable_data_updated_event():
    """Verifies event emitted when previously synced data is consolidated."""
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    updated_event = WearableDataUpdatedEvent(
        subject_id=subject_id,
        family_id=family_id,
        provider="apple_health",
        metric_type="steps",
        date="2026-08-21",
        previous_value=4200.0,
        updated_value=4821.0,
        reason="late_sync_consolidation"
    )

    assert updated_event.event_type == "wearable.data.updated"
    d = updated_event.to_dict()
    assert d["previous_value"] == 4200.0
    assert d["updated_value"] == 4821.0
    assert d["reason"] == "late_sync_consolidation"


@pytest.mark.asyncio
async def test_domain_event_bus_dispatch_for_wearables():
    """Verifies that typed wearable domain events publish and dispatch via DomainEventBus."""
    bus = DomainEventBus()
    received_events = []

    def handler(event):
        received_events.append(event)

    bus.subscribe("wearable.connected", handler)
    bus.subscribe("wearable.data.received", handler)

    evt1 = WearableConnected(
        aggregate_id=str(uuid.uuid4()),
        payload={"provider": "garmin"}
    )
    evt2 = WearableDataReceived(
        aggregate_id=str(uuid.uuid4()),
        payload={"batch_size": 25, "provider": "garmin"}
    )

    await bus.publish(evt1)
    await bus.publish(evt2)

    assert len(received_events) == 2
    assert received_events[0].event_type == "wearable.connected"
    assert received_events[1].event_type == "wearable.data.received"
