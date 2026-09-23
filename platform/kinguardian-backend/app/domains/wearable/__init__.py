"""
KinGuardian Wearable Domain Package.
Re-exports the core DDD aggregates, entities, value objects, domain services, events, policies, and repositories.
"""

from app.domains.wearables.domain.entities import (
    WearableIdentity,
    WearableDeviceConnection,
    WearableDailySummary,
    WearableAnomalyDiagnostic,
    WearableMetric
)
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    ConnectionStatus,
    AnomalySeverity,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals,
    AnomalyThreshold,
    WearableMetricType,
    METRIC_UNIT_MAP
)
from app.domains.wearables.domain.repositories import (
    IWearableRepository,
    InMemoryWearableRepository
)
from app.domains.wearables.domain.services import WearableDomainService
from app.domains.wearables.domain.events import (
    WearableDomainEvent,
    WearableDeviceConnectedEvent,
    WearableDeviceDisconnectedEvent,
    WearableDataSyncedEvent,
    WearableAnomalyDetectedEvent
)
from app.domains.wearables.domain.policies import (
    ActivityAnomalyPolicy,
    SleepDisruptionPolicy,
    AutonomicRecoveryPolicy
)

__all__ = [
    "WearableIdentity",
    "WearableDeviceConnection",
    "WearableDailySummary",
    "WearableAnomalyDiagnostic",
    "WearableMetric",
    "DeviceProvider",
    "ConnectionStatus",
    "AnomalySeverity",
    "ActivityMetrics",
    "SleepArchitecture",
    "RecoveryVitals",
    "AnomalyThreshold",
    "WearableMetricType",
    "METRIC_UNIT_MAP",
    "IWearableRepository",
    "InMemoryWearableRepository",
    "WearableDomainService",
    "WearableDomainEvent",
    "WearableDeviceConnectedEvent",
    "WearableDeviceDisconnectedEvent",
    "WearableDataSyncedEvent",
    "WearableAnomalyDetectedEvent",
    "ActivityAnomalyPolicy",
    "SleepDisruptionPolicy",
    "AutonomicRecoveryPolicy",
]

