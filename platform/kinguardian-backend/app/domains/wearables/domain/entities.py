"""
Wearable Domain Entities Module.
Provides DDD Aggregate Roots and Entities for Care Subject Wearable Identities,
Device Connections, Daily Health Summaries, and Anomaly Diagnostics.
"""

import uuid
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone


from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    ConnectionStatus,
    AnomalySeverity,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals,
    WearableMetricType,
    METRIC_UNIT_MAP
)



class WearableDeviceConnection:
    """Entity representing a specific connected wearable device/service."""

    def __init__(
        self,
        id: str,
        provider: DeviceProvider,
        status: ConnectionStatus = ConnectionStatus.ACTIVE,
        provider_user_id: Optional[str] = None,
        capabilities: Optional[Dict[str, Any]] = None,
        last_synced_at: Optional[datetime] = None,
        created_at: Optional[datetime] = None
    ):
        self.id = id
        self.provider = provider
        self.status = status
        self.provider_user_id = provider_user_id
        self.capabilities = capabilities or {}
        self.last_synced_at = last_synced_at
        self.created_at = created_at or datetime.utcnow()

    def mark_synced(self, sync_time: Optional[datetime] = None) -> None:
        self.last_synced_at = sync_time or datetime.utcnow()
        self.status = ConnectionStatus.ACTIVE

    def revoke(self) -> None:
        self.status = ConnectionStatus.REVOKED


class WearableDailySummary:
    """Entity containing day-level aggregated biometric telemetry for a care subject."""

    def __init__(
        self,
        date: str,
        activity: Optional[ActivityMetrics] = None,
        sleep: Optional[SleepArchitecture] = None,
        recovery: Optional[RecoveryVitals] = None,
        source_provider: Optional[DeviceProvider] = None,
        synced_at: Optional[datetime] = None
    ):
        self.date = date
        self.activity = activity
        self.sleep = sleep
        self.recovery = recovery
        self.source_provider = source_provider or DeviceProvider.UNKNOWN
        self.synced_at = synced_at or datetime.utcnow()

    @property
    def has_full_telemetry(self) -> bool:
        return self.activity is not None and self.sleep is not None and self.recovery is not None


class WearableAnomalyDiagnostic:
    """Entity representing an alertable clinical/mobility anomaly detected from wearable streams."""

    def __init__(
        self,
        id: uuid.UUID,
        subject_id: uuid.UUID,
        metric_name: str,
        observed_value: float,
        baseline_value: float,
        percentage_deviation: float,
        severity: AnomalySeverity,
        description: str,
        detected_at: Optional[datetime] = None
    ):
        self.id = id
        self.subject_id = subject_id
        self.metric_name = metric_name
        self.observed_value = observed_value
        self.baseline_value = baseline_value
        self.percentage_deviation = percentage_deviation
        self.severity = severity
        self.description = description
        self.detected_at = detected_at or datetime.utcnow()


class WearableIdentity:
    """
    Aggregate Root: Care Subject Wearable Identity.
    Maintains the invariant that a KinGuardian Care Subject owns external wearable device connections,
    baseline goals, and daily telemetry streams.
    """

    def __init__(
        self,
        subject_id: uuid.UUID,
        family_id: uuid.UUID,
        external_wearable_user_id: Optional[str] = None,
        baseline_step_goal: int = 5000,
        baseline_sleep_hours_goal: float = 7.0,
        connections: Optional[List[WearableDeviceConnection]] = None,
        created_at: Optional[datetime] = None
    ):
        self.subject_id = subject_id
        self.family_id = family_id
        self.external_wearable_user_id = external_wearable_user_id or f"kinguardian_subject_{subject_id}"
        self.baseline_step_goal = baseline_step_goal
        self.baseline_sleep_hours_goal = baseline_sleep_hours_goal
        self._connections: Dict[str, WearableDeviceConnection] = {}
        if connections:
            for conn in connections:
                self._connections[conn.provider.value] = conn
        self.created_at = created_at or datetime.utcnow()

    @property
    def connections(self) -> List[WearableDeviceConnection]:
        return list(self._connections.values())

    @property
    def active_providers(self) -> List[DeviceProvider]:
        return [c.provider for c in self._connections.values() if c.status == ConnectionStatus.ACTIVE]

    def add_or_update_connection(self, connection: WearableDeviceConnection) -> None:
        self._connections[connection.provider.value] = connection

    def remove_connection(self, provider: DeviceProvider) -> bool:
        if provider.value in self._connections:
            self._connections[provider.value].revoke()
            return True
        return False

    def update_baseline_goals(self, step_goal: int, sleep_hours_goal: float) -> None:
        if step_goal < 1000 or step_goal > 30000:
            raise ValueError("Baseline step goal must be between 1,000 and 30,000 steps")
        if sleep_hours_goal < 4.0 or sleep_hours_goal > 12.0:
            raise ValueError("Baseline sleep goal must be between 4.0 and 12.0 hours")
        self.baseline_step_goal = step_goal
        self.baseline_sleep_hours_goal = sleep_hours_goal


class WearableMetric:
    """
    Normalized KinGuardian domain representation of a wearable biometric/activity metric.
    Encapsulates raw vendor measurements into a normalized, strongly-typed domain model.
    All stored timestamps are guaranteed UTC, while retaining measured_at_utc and local_timezone
    for mobile client localized rendering.
    """

    def __init__(
        self,
        subject_id: uuid.UUID,
        metric_type: WearableMetricType,
        value: Any,
        unit: Optional[str] = None,
        measured_at_utc: Optional[datetime] = None,
        local_timezone: Optional[str] = None,
        source_provider: DeviceProvider = DeviceProvider.UNKNOWN,
        source_device: Optional[str] = None,
        source_reference: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None,
        # Backwards compatible alias
        measured_at: Optional[datetime] = None
    ):
        self.subject_id = subject_id
        self.metric_type = metric_type if isinstance(metric_type, WearableMetricType) else WearableMetricType.from_str(str(metric_type))
        self.value = value
        self.unit = unit or METRIC_UNIT_MAP.get(self.metric_type, "unit")

        # Standardize strictly to UTC
        raw_time = measured_at_utc or measured_at or datetime.now(timezone.utc)
        if raw_time.tzinfo is None:
            self.measured_at_utc = raw_time.replace(tzinfo=timezone.utc)
        else:
            self.measured_at_utc = raw_time.astimezone(timezone.utc)

        self.local_timezone = local_timezone or "UTC"
        self.source_provider = source_provider if isinstance(source_provider, DeviceProvider) else DeviceProvider.from_str(str(source_provider))
        self.source_device = source_device
        self.source_reference = source_reference
        self.metadata = metadata or {}

    @property
    def measured_at(self) -> datetime:
        """Backwards-compatible alias for measured_at_utc."""
        return self.measured_at_utc

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject_id": str(self.subject_id),
            "metric_type": self.metric_type.value,
            "value": self.value,
            "unit": self.unit,
            "measured_at_utc": self.measured_at_utc.isoformat(),
            "measured_at": self.measured_at_utc.isoformat(),
            "local_timezone": self.local_timezone,
            "source_provider": self.source_provider.value,
            "source_device": self.source_device,
            "source_reference": self.source_reference,
            "metadata": self.metadata
        }


from dataclasses import dataclass, field


@dataclass(frozen=True)
class WearableGuardianMoment:
    """
    Structured Guardian Moment for wearable patterns and baseline deviations.

    GUARDIAN PRINCIPLES:
    1. Clarity: Clear headline stating who, what metric, and how many days.
    2. Transparency: Explicit current window average vs historical baseline comparison.
    3. Actionable Care: Actionable next steps (e.g. Check in with Dad, Review trends, Contact caregiver).
    4. Non-Diagnostic Invariant: Decreased activity is NEVER automatically interpreted as illness.
    """
    id: uuid.UUID
    subject_id: uuid.UUID
    family_id: uuid.UUID
    title: str                  # "Dad's activity has been below his usual level for 5 days."
    summary: str                # Summary text with average and baseline
    current_average: float      # 4520.0
    current_average_label: str  # "4,520 steps/day"
    baseline_value: float       # 6210.0
    baseline_label: str         # "30-day baseline: 6,210 steps/day"
    actions: List[str]          # ["Check in with Dad", "Review trends", "Contact caregiver"]
    timeframe_days: int         # 5
    metric_name: str = "steps"
    unit: str = "steps/day"
    severity: str = "warning"
    type: str = "guardian_moment"
    based_on_text: Optional[str] = None
    source_transparency: Optional[Dict[str, Any]] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "subject_id": str(self.subject_id),
            "family_id": str(self.family_id),
            "type": self.type,
            "title": self.title,
            "summary": self.summary,
            "average": self.current_average_label,
            "baseline": self.baseline_label,
            "actions": self.actions,
            "timeframe_days": self.timeframe_days,
            "severity": self.severity,
            "based_on": self.based_on_text,
            "source_transparency": self.source_transparency,
            "created_at": self.created_at.isoformat()
        }




