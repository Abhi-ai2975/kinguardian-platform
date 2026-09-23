"""
Wearable Pure Domain Services Module.
Performs domain-level biometric trend analytics, baseline goal updates,
cross-metric correlation, and anomaly policy evaluation without direct database or network dependencies.
"""

from typing import List, Optional, Tuple, Dict, Any
from datetime import datetime
import uuid


from app.domains.wearables.domain.entities import (
    WearableIdentity,
    WearableDailySummary,
    WearableAnomalyDiagnostic
)
from app.domains.wearables.domain.value_objects import (
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals,
    AnomalyThreshold
)
from app.domains.wearables.domain.policies import (
    ActivityAnomalyPolicy,
    SleepDisruptionPolicy,
    AutonomicRecoveryPolicy
)


from app.domains.wearables.domain.availability import (
    WearableDataAvailabilityEvaluator,
    WearableDataAvailabilityResult,
    DataQualityClassification
)


class WearableDomainService:
    """
    Pure domain service for wearable health intelligence.
    Independent of frameworks, ORM, and external HTTP clients.
    """

    @classmethod
    def calculate_rolling_step_baseline(cls, summaries: List[WearableDailySummary]) -> int:
        """Calculates historical rolling median/mean steps over valid days."""
        valid_steps = [s.activity.steps for s in summaries if s.activity is not None and s.activity.steps > 0]
        if not valid_steps:
            return 5000
        return int(sum(valid_steps) / len(valid_steps))

    @classmethod
    def calculate_rolling_sleep_baseline(cls, summaries: List[WearableDailySummary]) -> float:
        """Calculates average nocturnal sleep duration in hours."""
        valid_sleep = [s.sleep.total_sleep_hours for s in summaries if s.sleep is not None and s.sleep.total_sleep_minutes > 0]
        if not valid_sleep:
            return 7.0
        return round(sum(valid_sleep) / len(valid_sleep), 1)

    @classmethod
    def evaluate_all_anomalies(
        cls,
        subject_id: uuid.UUID,
        today_summary: WearableDailySummary,
        historical_summaries: List[WearableDailySummary],
        configured_step_baseline: Optional[int] = None,
        threshold: AnomalyThreshold = AnomalyThreshold(),
        is_device_connected: bool = True,
        last_sync_at: Optional[datetime] = None,
        enforce_availability_governance: bool = False
    ) -> List[WearableAnomalyDiagnostic]:
        """
        Evaluates active anomaly policies across physical activity, sleep architecture,
        and cardiovascular recovery vitals.
        
        When enforce_availability_governance is True, verifies all 5 data availability pillars:
        - device connected
        - recent sync
        - data completeness (not off-wrist)
        - sufficient baseline (>=7 days)
        - expected sampling frequency
        Suppresses false Guardian Moments on data availability problems.
        """
        anomalies: List[WearableAnomalyDiagnostic] = []

        # 1. Activity Anomaly Check
        if today_summary.activity is not None:
            if enforce_availability_governance:
                avail = WearableDataAvailabilityEvaluator.evaluate(
                    subject_id=subject_id,
                    is_device_connected=is_device_connected,
                    last_sync_at=last_sync_at,
                    today_summary=today_summary,
                    historical_summaries=historical_summaries,
                    metric_name="activity"
                )
                can_evaluate_activity = avail.can_generate_guardian_moment
            else:
                can_evaluate_activity = True

            if can_evaluate_activity:
                baseline_steps = configured_step_baseline or cls.calculate_rolling_step_baseline(historical_summaries)
                act_diag = ActivityAnomalyPolicy.evaluate(
                    subject_id=subject_id,
                    current_activity=today_summary.activity,
                    baseline_steps=baseline_steps,
                    threshold=threshold
                )
                if act_diag:
                    anomalies.append(act_diag)

        # 2. Sleep Anomaly Check
        if today_summary.sleep is not None:
            if enforce_availability_governance:
                avail = WearableDataAvailabilityEvaluator.evaluate(
                    subject_id=subject_id,
                    is_device_connected=is_device_connected,
                    last_sync_at=last_sync_at,
                    today_summary=today_summary,
                    historical_summaries=historical_summaries,
                    metric_name="sleep"
                )
                can_evaluate_sleep = avail.can_generate_guardian_moment
            else:
                can_evaluate_sleep = True

            if can_evaluate_sleep:
                baseline_sleep = cls.calculate_rolling_sleep_baseline(historical_summaries)
                sleep_diag = SleepDisruptionPolicy.evaluate(
                    subject_id=subject_id,
                    current_sleep=today_summary.sleep,
                    baseline_sleep_hours=baseline_sleep,
                    threshold=threshold
                )
                if sleep_diag:
                    anomalies.append(sleep_diag)

        # 3. Recovery Anomaly Check
        if today_summary.recovery is not None:
            if enforce_availability_governance:
                avail = WearableDataAvailabilityEvaluator.evaluate(
                    subject_id=subject_id,
                    is_device_connected=is_device_connected,
                    last_sync_at=last_sync_at,
                    today_summary=today_summary,
                    historical_summaries=historical_summaries,
                    metric_name="recovery"
                )
                can_evaluate_recovery = avail.can_generate_guardian_moment
            else:
                can_evaluate_recovery = True

            if can_evaluate_recovery:
                rec_diag = AutonomicRecoveryPolicy.evaluate(
                    subject_id=subject_id,
                    current_recovery=today_summary.recovery,
                    threshold=threshold
                )
                if rec_diag:
                    anomalies.append(rec_diag)

        return anomalies

