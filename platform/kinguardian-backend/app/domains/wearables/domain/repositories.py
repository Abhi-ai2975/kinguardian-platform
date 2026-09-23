"""
Wearable Domain Repositories Module.
Defines abstract repository interfaces and in-memory test doubles for Wearable Identities,
Connections, and Aggregated Biometric Records.
"""

import abc
import uuid
from typing import Optional, List, Dict, Protocol
from datetime import datetime

from app.domains.wearables.domain.entities import (
    WearableIdentity,
    WearableDeviceConnection,
    WearableDailySummary,
    WearableAnomalyDiagnostic
)
from app.domains.wearables.domain.value_objects import DeviceProvider


class IWearableRepository(Protocol):
    """Domain repository contract for Wearable Aggregate Roots and Summaries."""

    async def get_identity_by_subject(self, subject_id: uuid.UUID) -> Optional[WearableIdentity]:
        """Fetches the wearable identity aggregate for a care subject."""
        ...

    async def save_identity(self, identity: WearableIdentity) -> None:
        """Persists the wearable identity aggregate."""
        ...

    async def save_daily_summary(
        self,
        subject_id: uuid.UUID,
        summary: WearableDailySummary
    ) -> None:
        """Stores or updates day-level telemetry summary."""
        ...

    async def get_daily_summaries(
        self,
        subject_id: uuid.UUID,
        start_date: str,
        end_date: str
    ) -> List[WearableDailySummary]:
        """Fetches historical daily summaries for a care subject."""
        ...

    async def record_anomaly(self, anomaly: WearableAnomalyDiagnostic) -> None:
        """Logs a detected biometric anomaly diagnostic."""
        ...


class InMemoryWearableRepository:
    """In-memory implementation of IWearableRepository for unit testing and local dev."""

    def __init__(self):
        self._identities: Dict[uuid.UUID, WearableIdentity] = {}
        self._summaries: Dict[uuid.UUID, Dict[str, WearableDailySummary]] = {}
        self._anomalies: List[WearableAnomalyDiagnostic] = []

    async def get_identity_by_subject(self, subject_id: uuid.UUID) -> Optional[WearableIdentity]:
        return self._identities.get(subject_id)

    async def save_identity(self, identity: WearableIdentity) -> None:
        self._identities[identity.subject_id] = identity

    async def save_daily_summary(
        self,
        subject_id: uuid.UUID,
        summary: WearableDailySummary
    ) -> None:
        if subject_id not in self._summaries:
            self._summaries[subject_id] = {}
        self._summaries[subject_id][summary.date] = summary

    async def get_daily_summaries(
        self,
        subject_id: uuid.UUID,
        start_date: str,
        end_date: str
    ) -> List[WearableDailySummary]:
        user_sums = self._summaries.get(subject_id, {})
        # Sort chronologically by date
        sorted_dates = sorted([d for d in user_sums.keys() if start_date <= d <= end_date])
        return [user_sums[d] for d in sorted_dates]

    async def record_anomaly(self, anomaly: WearableAnomalyDiagnostic) -> None:
        self._anomalies.append(anomaly)
