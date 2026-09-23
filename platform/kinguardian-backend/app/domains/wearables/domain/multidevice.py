"""
Wearable Multi-Device & Concurrent Data Source Governance.

Supports care subjects with multiple concurrent wearable devices:
- Apple Watch
- Garmin
- Fitbit
- Oura
- Whoop

Rules:
1. NEVER assume one wearable per person.
2. Define source priority/configuration where multiple providers produce the same metric.
3. Prevent duplicate summation / double-counting across concurrent devices.
4. Synthesize complementary multi-device telemetry (e.g. Garmin activity + Oura sleep).
5. Maintain full source provenance and attribution.
"""

from typing import List, Dict, Any, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone, date
import uuid

from app.domains.wearables.domain.entities import WearableMetric, WearableDailySummary
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals
)


@dataclass
class MetricSourcePriorityConfig:
    """
    Configurable source priority mapping determining which provider is authoritative
    when multiple devices produce overlapping telemetry for the same care subject.
    """
    priorities: Dict[WearableMetricType, List[DeviceProvider]] = field(default_factory=lambda: {
        # Daytime physical movement & exertion -> Garmin preferred for GPS/stride accuracy
        WearableMetricType.STEPS: [
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.FITBIT,
            DeviceProvider.OURA,
            DeviceProvider.HEALTH_CONNECT
        ],
        WearableMetricType.DISTANCE: [
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.STRAVA,
            DeviceProvider.FITBIT
        ],
        WearableMetricType.ACTIVE_MINUTES: [
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.FITBIT,
            DeviceProvider.OURA
        ],
        WearableMetricType.CALORIES: [
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.FITBIT,
            DeviceProvider.OURA
        ],
        # Nocturnal sleep architecture & circadian stages -> Oura Ring preferred
        WearableMetricType.SLEEP_DURATION: [
            DeviceProvider.OURA,
            DeviceProvider.WHOOP,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.GARMIN,
            DeviceProvider.FITBIT
        ],
        WearableMetricType.SLEEP_SCORE: [
            DeviceProvider.OURA,
            DeviceProvider.WHOOP,
            DeviceProvider.GARMIN,
            DeviceProvider.FITBIT
        ],
        WearableMetricType.SLEEP_STAGES: [
            DeviceProvider.OURA,
            DeviceProvider.WHOOP,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.GARMIN,
            DeviceProvider.FITBIT
        ],
        # Autonomic recovery & HRV -> Oura Ring / Whoop preferred
        WearableMetricType.HEART_RATE_VARIABILITY: [
            DeviceProvider.OURA,
            DeviceProvider.WHOOP,
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH
        ],
        WearableMetricType.RESTING_HEART_RATE: [
            DeviceProvider.OURA,
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.FITBIT
        ],
        WearableMetricType.BODY_TEMPERATURE: [
            DeviceProvider.OURA,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.WHOOP
        ],
        WearableMetricType.RESPIRATORY_RATE: [
            DeviceProvider.OURA,
            DeviceProvider.WHOOP,
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH
        ],
        WearableMetricType.BLOOD_OXYGEN: [
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.OURA
        ]
    })

    def get_priority_for_metric(self, metric_type: WearableMetricType) -> List[DeviceProvider]:
        return self.priorities.get(metric_type, [
            DeviceProvider.GARMIN,
            DeviceProvider.APPLE_HEALTH,
            DeviceProvider.OURA,
            DeviceProvider.FITBIT
        ])

    def get_provider_rank(self, metric_type: WearableMetricType, provider: DeviceProvider) -> int:
        """Returns 0-indexed rank of provider (lower is higher priority)."""
        order = self.get_priority_for_metric(metric_type)
        try:
            return order.index(provider)
        except ValueError:
            return 999  # Lowest priority if unlisted


@dataclass
class ResolvedWearableMetric:
    """
    Result of multi-device conflict resolution for a single metric time bucket.
    """
    selected_metric: WearableMetric
    primary_provider: DeviceProvider
    was_conflict: bool = False
    competing_providers: List[DeviceProvider] = field(default_factory=list)
    competing_values: Dict[str, Any] = field(default_factory=dict)
    resolution_rationale: str = "Single data source"


class MultiDeviceDataSynthesizer:
    """
    Domain service for resolving multi-device telemetry conflicts,
    synthesizing cross-device streams, and preventing double-counting.
    """

    @classmethod
    def resolve_metric_conflicts(
        cls,
        metrics: List[WearableMetric],
        priority_config: Optional[MetricSourcePriorityConfig] = None
    ) -> List[ResolvedWearableMetric]:
        """
        Groups metrics by (date, metric_type). Where multiple concurrent devices
        record the same metric on the same day/time, selects the authoritative
        metric per priority configuration, preventing duplicate summation.
        """
        cfg = priority_config or MetricSourcePriorityConfig()
        grouped: Dict[Tuple[str, WearableMetricType], List[WearableMetric]] = {}

        for m in metrics:
            dt_key = m.measured_at_utc.date().isoformat() if m.measured_at_utc else "unknown_date"
            key = (dt_key, m.metric_type)
            if key not in grouped:
                grouped[key] = []
            grouped[key].append(m)

        resolved_list: List[ResolvedWearableMetric] = []

        for (dt_key, metric_type), candidates in grouped.items():
            if len(candidates) == 1:
                single = candidates[0]
                resolved_list.append(
                    ResolvedWearableMetric(
                        selected_metric=single,
                        primary_provider=single.source_provider,
                        was_conflict=False,
                        resolution_rationale=f"Single source ({single.source_provider.value})"
                    )
                )
            else:
                # Multiple concurrent devices produced this metric
                # Sort by provider priority rank (lower rank = higher priority)
                sorted_candidates = sorted(
                    candidates,
                    key=lambda c: (
                        cfg.get_provider_rank(metric_type, c.source_provider),
                        # Tie-breaker: most recent measurement
                        -(c.measured_at_utc.timestamp() if c.measured_at_utc else 0)
                    )
                )
                winner = sorted_candidates[0]
                competing_providers = [c.source_provider for c in sorted_candidates[1:]]
                competing_values = {c.source_provider.value: c.value for c in sorted_candidates}

                resolved_list.append(
                    ResolvedWearableMetric(
                        selected_metric=winner,
                        primary_provider=winner.source_provider,
                        was_conflict=True,
                        competing_providers=competing_providers,
                        competing_values=competing_values,
                        resolution_rationale=(
                            f"Multi-device resolution: Selected {winner.source_provider.value} ({winner.value}) "
                            f"over {', '.join(p.value for p in competing_providers)} per metric priority configuration"
                        )
                    )
                )

        return resolved_list

    @classmethod
    def synthesize_daily_summary(
        cls,
        summaries_from_devices: List[WearableDailySummary],
        target_date: str,
        priority_config: Optional[MetricSourcePriorityConfig] = None
    ) -> WearableDailySummary:
        """
        Synthesizes multiple daily summaries from different concurrent devices into a single
        authoritative composite daily health summary (e.g. Garmin for steps + Oura for sleep).
        """
        cfg = priority_config or MetricSourcePriorityConfig()

        # Find best Activity
        best_activity: Optional[ActivityMetrics] = None
        best_act_provider: Optional[DeviceProvider] = None
        best_act_rank: int = 999

        # Find best Sleep
        best_sleep: Optional[SleepArchitecture] = None
        best_sleep_provider: Optional[DeviceProvider] = None
        best_sleep_rank: int = 999

        # Find best Recovery
        best_recovery: Optional[RecoveryVitals] = None
        best_rec_provider: Optional[DeviceProvider] = None
        best_rec_rank: int = 999

        for s in summaries_from_devices:
            if s.date != target_date:
                continue

            provider = s.source_provider

            # Activity check
            if s.activity and s.activity.steps > 0:
                rank = cfg.get_provider_rank(WearableMetricType.STEPS, provider)
                if rank < best_act_rank:
                    best_activity = s.activity
                    best_act_provider = provider
                    best_act_rank = rank

            # Sleep check
            if s.sleep and s.sleep.total_sleep_minutes > 0:
                rank = cfg.get_provider_rank(WearableMetricType.SLEEP_DURATION, provider)
                if rank < best_sleep_rank:
                    best_sleep = s.sleep
                    best_sleep_provider = provider
                    best_sleep_rank = rank

            # Recovery check
            if s.recovery and (s.recovery.resting_heart_rate_bpm or s.recovery.hrv_rmssd_ms):
                rank = cfg.get_provider_rank(WearableMetricType.HEART_RATE_VARIABILITY, provider)
                if rank < best_rec_rank:
                    best_recovery = s.recovery
                    best_rec_provider = provider
                    best_rec_rank = rank

        # Primary composite source
        composite_provider = best_act_provider or best_sleep_provider or best_rec_provider or DeviceProvider.UNKNOWN

        return WearableDailySummary(
            date=target_date,
            activity=best_activity,
            sleep=best_sleep,
            recovery=best_recovery,
            source_provider=composite_provider,
            synced_at=datetime.now(timezone.utc)
        )
