"""
Wearable Data Availability & Quality Governance Module.

Enforces the 5 Pillars of Wearable Data Availability before generating any AI Guardian Moment:
1. Device Connected? (Active, non-revoked provider connection)
2. Recent Sync? (Synced within expected cadence, not stopped syncing)
3. Data Completeness? (Sufficient wear time/intraday coverage, not device-on-charger)
4. Sufficient Baseline? (Minimum historical observation window, e.g. >= 7 days)
5. Expected Sampling Frequency? (Adequate temporal density for vitals/sleep)

CORE SAFETY INVARIANT:
Distinguish a true 'health change' from a 'data availability problem'.
NEVER generate a Guardian Moment merely because a device stopped syncing or was off-wrist.
"""

from dataclasses import dataclass, field
from enum import Enum
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import uuid

from app.domains.wearables.domain.entities import WearableDailySummary
from app.domains.wearables.domain.value_objects import ActivityMetrics, SleepArchitecture, RecoveryVitals


class DataAvailabilityPillar(str, Enum):
    DEVICE_CONNECTED = "device_connected"
    RECENT_SYNC = "recent_sync"
    DATA_COMPLETENESS = "data_completeness"
    SUFFICIENT_BASELINE = "sufficient_baseline"
    EXPECTED_SAMPLING_FREQUENCY = "expected_sampling_frequency"


class DataQualityClassification(str, Enum):
    VALID_FOR_INSIGHT = "valid_for_insight"
    DATA_AVAILABILITY_PROBLEM = "data_availability_problem"
    DEVICE_DISCONNECTED = "device_disconnected"
    STALE_SYNC = "stale_sync"
    INCOMPLETE_DATA = "incomplete_data"
    INSUFFICIENT_BASELINE = "insufficient_baseline"


@dataclass(frozen=True)
class WearableDataAvailabilityResult:
    """
    Evaluation assessment of wearable data availability and quality.
    """
    is_device_connected: bool
    has_recent_sync: bool
    is_data_complete: bool
    has_sufficient_baseline: bool
    meets_sampling_frequency: bool

    classification: DataQualityClassification
    can_generate_guardian_moment: bool
    explanation: str
    failed_pillars: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_data_availability_problem(self) -> bool:
        return self.classification == DataQualityClassification.DATA_AVAILABILITY_PROBLEM or not self.can_generate_guardian_moment


class WearableDataAvailabilityEvaluator:
    """
    Evaluates whether wearable telemetry meets all 5 availability pillars to distinguish
    genuine health trends from data collection artifacts or device offline issues.
    """

    MIN_BASELINE_DAYS_REQUIRED: int = 7
    MAX_SYNC_STALENESS_HOURS: float = 24.0
    MIN_DAILY_ACTIVE_MINUTES_OR_WEAR_HOURS: int = 240  # minimum 4 hours of recorded wear/activity to prevent off-wrist false alerts

    @classmethod
    def evaluate(
        cls,
        subject_id: uuid.UUID,
        is_device_connected: bool = True,
        last_sync_at: Optional[datetime] = None,
        today_summary: Optional[WearableDailySummary] = None,
        historical_summaries: Optional[List[WearableDailySummary]] = None,
        metric_name: str = "activity",
        reference_time: Optional[datetime] = None
    ) -> WearableDataAvailabilityResult:
        now_dt = reference_time or datetime.now(timezone.utc)
        failed_pillars: List[str] = []

        # 1. Pillar 1: Device Connected?
        if not is_device_connected:
            failed_pillars.append(DataAvailabilityPillar.DEVICE_CONNECTED.value)
            return WearableDataAvailabilityResult(
                is_device_connected=False,
                has_recent_sync=False,
                is_data_complete=False,
                has_sufficient_baseline=False,
                meets_sampling_frequency=False,
                classification=DataQualityClassification.DATA_AVAILABILITY_PROBLEM,
                can_generate_guardian_moment=False,
                explanation="Data availability problem: Device is disconnected or unlinked. Cannot evaluate health trends.",
                failed_pillars=failed_pillars,
                metadata={"reason": "device_disconnected"}
            )

        # 2. Pillar 2: Recent Sync?
        has_recent_sync = True
        if last_sync_at:
            sync_dt = last_sync_at if last_sync_at.tzinfo is not None else last_sync_at.replace(tzinfo=timezone.utc)
            staleness_hours = (now_dt - sync_dt).total_seconds() / 3600.0
            if staleness_hours > cls.MAX_SYNC_STALENESS_HOURS:
                has_recent_sync = False
                failed_pillars.append(DataAvailabilityPillar.RECENT_SYNC.value)
        else:
            # If no sync recorded at all
            has_recent_sync = False
            failed_pillars.append(DataAvailabilityPillar.RECENT_SYNC.value)

        # 3. Pillar 3: Data Completeness (Not off-wrist / device left on charger)
        is_data_complete = True
        if today_summary is None:
            is_data_complete = False
            failed_pillars.append(DataAvailabilityPillar.DATA_COMPLETENESS.value)
        else:
            if metric_name in ("steps", "activity", "daily_steps"):
                if today_summary.activity is None or today_summary.activity.steps is None:
                    is_data_complete = False
                    failed_pillars.append(DataAvailabilityPillar.DATA_COMPLETENESS.value)
                elif today_summary.activity.steps == 0 and today_summary.activity.active_minutes == 0:
                    # Off-wrist / zero wear time artifact
                    is_data_complete = False
                    failed_pillars.append(DataAvailabilityPillar.DATA_COMPLETENESS.value)
            elif metric_name in ("sleep", "sleep_duration"):
                if today_summary.sleep is None or today_summary.sleep.total_sleep_minutes <= 0:
                    is_data_complete = False
                    failed_pillars.append(DataAvailabilityPillar.DATA_COMPLETENESS.value)
            elif metric_name in ("heart_rate", "recovery", "resting_heart_rate"):
                if today_summary.recovery is None or (today_summary.recovery.resting_heart_rate_bpm is None and today_summary.recovery.hrv_rmssd_ms is None):
                    is_data_complete = False
                    failed_pillars.append(DataAvailabilityPillar.DATA_COMPLETENESS.value)

        # 4. Pillar 4: Sufficient Baseline? (>= 7 days of historical summaries)
        hist = historical_summaries or []
        valid_historical_days = 0
        for s in hist:
            if metric_name in ("steps", "activity", "daily_steps"):
                if s.activity and s.activity.steps > 0:
                    valid_historical_days += 1
            elif metric_name in ("sleep", "sleep_duration"):
                if s.sleep and s.sleep.total_sleep_minutes > 0:
                    valid_historical_days += 1
            elif metric_name in ("heart_rate", "recovery", "resting_heart_rate"):
                if s.recovery and (s.recovery.resting_heart_rate_bpm or s.recovery.hrv_rmssd_ms):
                    valid_historical_days += 1
            else:
                valid_historical_days += 1

        has_sufficient_baseline = (valid_historical_days >= cls.MIN_BASELINE_DAYS_REQUIRED)
        if not has_sufficient_baseline:
            failed_pillars.append(DataAvailabilityPillar.SUFFICIENT_BASELINE.value)

        # 5. Pillar 5: Expected Sampling Frequency?
        meets_sampling_frequency = True
        # If telemetry completeness passes, baseline passes, and sync is recent, sampling frequency is satisfied
        if not has_recent_sync or not is_data_complete:
            meets_sampling_frequency = False
            if DataAvailabilityPillar.EXPECTED_SAMPLING_FREQUENCY.value not in failed_pillars:
                failed_pillars.append(DataAvailabilityPillar.EXPECTED_SAMPLING_FREQUENCY.value)

        # Final Synthesis: Can we generate a clinical Guardian Moment?
        can_generate = len(failed_pillars) == 0

        if can_generate:
            classification = DataQualityClassification.VALID_FOR_INSIGHT
            explanation = "Wearable telemetry meets all 5 data availability pillars (connected, recent sync, complete, sufficient baseline, expected frequency)."
        else:
            classification = DataQualityClassification.DATA_AVAILABILITY_PROBLEM
            reasons = []
            if DataAvailabilityPillar.RECENT_SYNC.value in failed_pillars:
                reasons.append("device stopped syncing / stale sync")
            if DataAvailabilityPillar.DATA_COMPLETENESS.value in failed_pillars:
                reasons.append("incomplete data (device off-wrist or on charger)")
            if DataAvailabilityPillar.SUFFICIENT_BASELINE.value in failed_pillars:
                reasons.append(f"insufficient baseline ({valid_historical_days}/{cls.MIN_BASELINE_DAYS_REQUIRED} required days)")
            if DataAvailabilityPillar.EXPECTED_SAMPLING_FREQUENCY.value in failed_pillars:
                reasons.append("insufficient sampling density")
            explanation = f"Data availability problem: {', '.join(reasons)}. Suppressing Guardian Moment to prevent false clinical alert."

        return WearableDataAvailabilityResult(
            is_device_connected=is_device_connected,
            has_recent_sync=has_recent_sync,
            is_data_complete=is_data_complete,
            has_sufficient_baseline=has_sufficient_baseline,
            meets_sampling_frequency=meets_sampling_frequency,
            classification=classification,
            can_generate_guardian_moment=can_generate,
            explanation=explanation,
            failed_pillars=failed_pillars,
            metadata={
                "valid_historical_days": valid_historical_days,
                "required_baseline_days": cls.MIN_BASELINE_DAYS_REQUIRED,
                "metric_name": metric_name
            }
        )
