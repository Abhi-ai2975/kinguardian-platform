"""
Wearable Domain & Integration Events Module.

Defines canonical domain events matching the KinGuardian event taxonomy:
- wearable.connected
- wearable.disconnected
- wearable.sync.started
- wearable.sync.completed
- wearable.sync.failed
- wearable.data.received
- wearable.data.updated

CRITICAL ARCHITECTURAL RULE:
Do NOT emit one event per raw metric unless operationally necessary.
Batch telemetry into composite data packets (`WearableDataReceivedEvent`) to ensure high-throughput
scalability and avoid event bus inundation.
"""

from dataclasses import dataclass, field
import uuid
from datetime import datetime, timezone
from typing import Dict, Any, Optional, List

from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    AnomalySeverity,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals
)


@dataclass(frozen=True)
class WearableDomainEvent:
    """Base domain event for wearable state transitions."""
    event_id: uuid.UUID = field(default_factory=uuid.uuid4)
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    subject_id: uuid.UUID = field(default_factory=uuid.uuid4)
    family_id: uuid.UUID = field(default_factory=uuid.uuid4)
    event_type: str = "wearable.event"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": str(self.event_id),
            "event_type": self.event_type,
            "occurred_at": self.occurred_at.isoformat(),
            "subject_id": str(self.subject_id),
            "family_id": str(self.family_id)
        }


# 1. wearable.connected
@dataclass(frozen=True)
class WearableConnectedEvent(WearableDomainEvent):
    """Fired when a care subject establishes an active provider connection."""
    event_type: str = "wearable.connected"
    provider: str = "unknown"
    connection_id: Optional[str] = None
    provider_user_id: Optional[str] = None
    scopes: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "provider": self.provider,
            "connection_id": self.connection_id,
            "provider_user_id": self.provider_user_id,
            "scopes": self.scopes
        })
        return base


# Compatibility alias
WearableDeviceConnectedEvent = WearableConnectedEvent


# 2. wearable.disconnected
@dataclass(frozen=True)
class WearableDisconnectedEvent(WearableDomainEvent):
    """Fired when a wearable connection is disconnected or revoked."""
    event_type: str = "wearable.disconnected"
    provider: str = "unknown"
    connection_id: Optional[str] = None
    reason: Optional[str] = None
    disconnected_by_profile_id: Optional[uuid.UUID] = None

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "provider": self.provider,
            "connection_id": self.connection_id,
            "reason": self.reason,
            "disconnected_by_profile_id": str(self.disconnected_by_profile_id) if self.disconnected_by_profile_id else None
        })
        return base


# Compatibility alias
WearableDeviceDisconnectedEvent = WearableDisconnectedEvent


# 3. wearable.sync.started
@dataclass(frozen=True)
class WearableSyncStartedEvent(WearableDomainEvent):
    """Fired when a wearable data sync job begins (webhook pull or scheduled poll)."""
    event_type: str = "wearable.sync.started"
    sync_id: str = field(default_factory=lambda: f"sync_{uuid.uuid4().hex[:12]}")
    provider: str = "unknown"
    sync_mode: str = "webhook"  # "webhook" | "poll" | "manual"
    date_from: Optional[str] = None
    date_to: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "sync_id": self.sync_id,
            "provider": self.provider,
            "sync_mode": self.sync_mode,
            "date_from": self.date_from,
            "date_to": self.date_to
        })
        return base


# 4. wearable.sync.completed
@dataclass(frozen=True)
class WearableSyncCompletedEvent(WearableDomainEvent):
    """Fired when a sync job completes successfully with batched metric counts."""
    event_type: str = "wearable.sync.completed"
    sync_id: str = ""
    provider: str = "unknown"
    records_processed: int = 0
    metrics_summary: Dict[str, int] = field(default_factory=dict)
    duration_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "sync_id": self.sync_id,
            "provider": self.provider,
            "records_processed": self.records_processed,
            "metrics_summary": self.metrics_summary,
            "duration_ms": self.duration_ms
        })
        return base


# 5. wearable.sync.failed
@dataclass(frozen=True)
class WearableSyncFailedEvent(WearableDomainEvent):
    """Fired when a sync job fails due to network, token, or provider errors."""
    event_type: str = "wearable.sync.failed"
    sync_id: str = ""
    provider: str = "unknown"
    error_code: str = "SYNC_ERROR"
    error_message: str = ""
    retryable: bool = True

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "sync_id": self.sync_id,
            "provider": self.provider,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "retryable": self.retryable
        })
        return base


# 6. wearable.data.received (Batched Event)
@dataclass(frozen=True)
class WearableDataReceivedEvent(WearableDomainEvent):
    """
    Batched telemetry event. Emitted for a batch of metric readings rather than 1 per raw sample.
    """
    event_type: str = "wearable.data.received"
    provider: str = "unknown"
    batch_size: int = 0
    metrics_categories: List[str] = field(default_factory=list)  # ["activity", "sleep", "recovery"]
    date_range: Optional[str] = None
    records: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "provider": self.provider,
            "batch_size": self.batch_size,
            "metrics_categories": self.metrics_categories,
            "date_range": self.date_range,
            "records_count": len(self.records)
        })
        return base


# 7. wearable.data.updated
@dataclass(frozen=True)
class WearableDataUpdatedEvent(WearableDomainEvent):
    """Fired when previously synced wearable metrics are updated or consolidated."""
    event_type: str = "wearable.data.updated"
    provider: str = "unknown"
    metric_type: str = "steps"
    date: str = ""
    previous_value: Optional[float] = None
    updated_value: float = 0.0
    reason: str = "consolidation"

    def to_dict(self) -> Dict[str, Any]:
        base = super().to_dict()
        base.update({
            "provider": self.provider,
            "metric_type": self.metric_type,
            "date": self.date,
            "previous_value": self.previous_value,
            "updated_value": self.updated_value,
            "reason": self.reason
        })
        return base


# Helper factory for creating batched data received events
def create_batched_data_received_event(
    subject_id: uuid.UUID,
    family_id: uuid.UUID,
    provider: str,
    records: List[Dict[str, Any]],
    date_range: Optional[str] = None
) -> WearableDataReceivedEvent:
    """
    Batches raw metrics into a single domain event envelope.
    Avoids event bus spamming by grouping multiple readings (e.g. intraday samples or multiple days).
    """
    categories = list(set(r.get("metric_type", "general") for r in records))
    return WearableDataReceivedEvent(
        subject_id=subject_id,
        family_id=family_id,
        provider=provider,
        batch_size=len(records),
        metrics_categories=categories,
        date_range=date_range,
        records=records
    )


# Compatibility aliases
@dataclass(frozen=True)
class WearableDataSyncedEvent(WearableDomainEvent):
    """Compatibility alias for legacy sync listeners."""
    date: str = ""
    provider: DeviceProvider = DeviceProvider.UNKNOWN
    activity: Optional[ActivityMetrics] = None
    sleep: Optional[SleepArchitecture] = None
    recovery: Optional[RecoveryVitals] = None


@dataclass(frozen=True)
class WearableAnomalyDetectedEvent(WearableDomainEvent):
    """Fired when wearable telemetry deviates significantly from baseline."""
    metric_name: str = ""
    observed_value: float = 0.0
    baseline_value: float = 0.0
    percentage_drop: float = 0.0
    severity: AnomalySeverity = AnomalySeverity.ATTENTION
    description: str = ""
    suggested_action: str = ""
