"""
Wearable Data Quality Governance & Validation Service.

Enforces strict quality controls on all incoming wearable telemetry:
1. Stale data (outdated sync / ancient timestamps)
2. Missing days (gaps in historical time-series)
3. Duplicate data (identical timestamp / telemetry collisions)
4. Impossible values (physiologically impossible step counts, heart rates, SpO2, sleep)
5. Unit mismatch (invalid or incompatible metric units)
6. Timestamp anomalies (future dates, epoch zero 1970-01-01, start > end)

CORE INVARIANT:
Bad data must NOT feed the insight engine silently.
All violations are quarantined, logged, and audited.
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Tuple, Set
from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta, date
import uuid

from app.core.logging import get_logger
from app.domains.wearables.domain.entities import WearableMetric, WearableDailySummary
from app.domains.wearables.domain.value_objects import WearableMetricType

logger = get_logger(__name__)


class QualityViolationType(str, Enum):
    STALE_DATA = "stale_data"
    MISSING_DAYS = "missing_days"
    DUPLICATE_DATA = "duplicate_data"
    IMPOSSIBLE_VALUE = "impossible_value"
    UNIT_MISMATCH = "unit_mismatch"
    TIMESTAMP_ANOMALY = "timestamp_anomaly"


@dataclass(frozen=True)
class QualityViolation:
    """Individual data quality violation finding."""
    violation_type: QualityViolationType
    metric_type: Optional[str]
    description: str
    observed_value: Any = None
    expected_range: Optional[str] = None
    timestamp: Optional[datetime] = None
    quarantined: bool = True


@dataclass
class QualityAuditReport:
    """Comprehensive data quality audit report."""
    total_records_evaluated: int = 0
    valid_records_count: int = 0
    quarantined_records_count: int = 0
    violations: List[QualityViolation] = field(default_factory=list)
    missing_dates: List[str] = field(default_factory=list)
    duplicate_count: int = 0
    is_valid_for_insights: bool = True

    @property
    def has_violations(self) -> bool:
        return len(self.violations) > 0 or len(self.missing_dates) > 0


class WearableDataQualityService:
    """
    Quality governance service inspecting incoming wearable telemetry before
    it reaches the Insight Engine or FHIR persist layer.
    """

    # Physiological Bounds (Clinically & Biometrically verified)
    PHYSIOLOGICAL_BOUNDS = {
        WearableMetricType.STEPS: (0, 120_000, "steps", "0 to 120,000 steps/day"),
        WearableMetricType.HEART_RATE: (25.0, 250.0, "bpm", "25 to 250 bpm"),
        WearableMetricType.RESTING_HEART_RATE: (25.0, 180.0, "bpm", "25 to 180 bpm"),
        WearableMetricType.BLOOD_OXYGEN: (40.0, 100.0, "%", "40% to 100%"),
        WearableMetricType.BODY_TEMPERATURE: (30.0, 45.0, "C", "30.0°C to 45.0°C"),
        WearableMetricType.RESPIRATORY_RATE: (4.0, 60.0, "rpm", "4 to 60 rpm"),
        WearableMetricType.HEART_RATE_VARIABILITY: (1.0, 400.0, "ms", "1 to 400 ms"),
        WearableMetricType.SLEEP_DURATION: (0.0, 1440.0, "minutes", "0 to 1,440 minutes (24 hours)"),
        WearableMetricType.DISTANCE: (0.0, 150_000.0, "m", "0 to 150,000 meters"),
        WearableMetricType.CALORIES: (0.0, 20_000.0, "kcal", "0 to 20,000 kcal"),
        WearableMetricType.WEIGHT: (10.0, 400.0, "kg", "10 to 400 kg")
    }

    # Unit Compatibility Map
    VALID_UNITS_MAP: Dict[WearableMetricType, Set[str]] = {
        WearableMetricType.STEPS: {"steps", "count", "step", None, ""},
        WearableMetricType.HEART_RATE: {"bpm", "count/min", "beats/minute", "beats/min"},
        WearableMetricType.RESTING_HEART_RATE: {"bpm", "count/min", "beats/minute", "beats/min"},
        WearableMetricType.BLOOD_OXYGEN: {"%", "percent", "ratio", "percentage", None},
        WearableMetricType.BODY_TEMPERATURE: {"C", "degC", "celsius", "F", "degF", "fahrenheit"},
        WearableMetricType.RESPIRATORY_RATE: {"rpm", "breaths/min", "breaths/minute", "count/min", "brpm"},
        WearableMetricType.HEART_RATE_VARIABILITY: {"ms", "milliseconds"},
        WearableMetricType.SLEEP_DURATION: {"minutes", "min", "seconds", "sec", "hours", "hrs"},
        WearableMetricType.DISTANCE: {"m", "meters", "meter", "km", "kilometers", "miles", "mi"},
        WearableMetricType.CALORIES: {"kcal", "calories", "cal", "kJ"},
        WearableMetricType.WEIGHT: {"kg", "lbs", "pounds", "g"}
    }


    @classmethod
    def check_impossible_values(cls, metric_type: WearableMetricType, value: Any) -> Optional[QualityViolation]:
        """Validates that a biometric measurement is within physiological possibility."""
        if value is None:
            return QualityViolation(
                violation_type=QualityViolationType.IMPOSSIBLE_VALUE,
                metric_type=metric_type.value,
                description=f"Null or missing value for {metric_type.value}",
                observed_value=None
            )

        try:
            num_val = float(value)
        except (ValueError, TypeError):
            return QualityViolation(
                violation_type=QualityViolationType.IMPOSSIBLE_VALUE,
                metric_type=metric_type.value,
                description=f"Non-numeric value '{value}' for {metric_type.value}",
                observed_value=value
            )

        if metric_type in cls.PHYSIOLOGICAL_BOUNDS:
            min_val, max_val, unit, range_desc = cls.PHYSIOLOGICAL_BOUNDS[metric_type]
            if num_val < min_val or num_val > max_val:
                return QualityViolation(
                    violation_type=QualityViolationType.IMPOSSIBLE_VALUE,
                    metric_type=metric_type.value,
                    description=f"Physiologically impossible value {num_val} {unit} for {metric_type.value} (Expected: {range_desc})",
                    observed_value=num_val,
                    expected_range=range_desc
                )

        return None

    @classmethod
    def check_unit_mismatch(cls, metric_type: WearableMetricType, unit: Optional[str]) -> Optional[QualityViolation]:
        """Validates that the reported unit matches known compatible units for the metric."""
        if metric_type not in cls.VALID_UNITS_MAP:
            return None

        if unit is None or unit == "":
            # Some metrics allow unitless defaults (e.g. steps)
            if None in cls.VALID_UNITS_MAP[metric_type] or "" in cls.VALID_UNITS_MAP[metric_type]:
                return None
            return QualityViolation(
                violation_type=QualityViolationType.UNIT_MISMATCH,
                metric_type=metric_type.value,
                description=f"Missing unit for metric {metric_type.value} which requires explicit unit",
                observed_value=None
            )

        normalized_unit = str(unit).strip().lower()
        valid_units = {u.lower() for u in cls.VALID_UNITS_MAP[metric_type] if u is not None}

        if normalized_unit not in valid_units:
            return QualityViolation(
                violation_type=QualityViolationType.UNIT_MISMATCH,
                metric_type=metric_type.value,
                description=f"Unit mismatch: '{unit}' is incompatible with {metric_type.value} (Allowed: {', '.join(sorted(valid_units))})",
                observed_value=unit,
                expected_range=f"One of: {', '.join(sorted(valid_units))}"
            )

        return None

    @classmethod
    def check_timestamp_anomalies(
        cls,
        timestamp: Optional[datetime],
        reference_time: Optional[datetime] = None,
        max_future_skew_seconds: int = 3600
    ) -> Optional[QualityViolation]:
        """Validates timestamps against future skew, epoch-zero (1970), and ancient dates."""
        if timestamp is None:
            return QualityViolation(
                violation_type=QualityViolationType.TIMESTAMP_ANOMALY,
                metric_type=None,
                description="Missing timestamp on metric record",
                observed_value=None
            )

        now_dt = reference_time or datetime.now(timezone.utc)
        ts_utc = timestamp if timestamp.tzinfo is not None else timestamp.replace(tzinfo=timezone.utc)

        # 1. Epoch Zero Check (1970-01-01)
        if ts_utc.year < 2000:
            return QualityViolation(
                violation_type=QualityViolationType.TIMESTAMP_ANOMALY,
                metric_type=None,
                description=f"Timestamp anomaly: Corrupted or epoch-zero timestamp ({ts_utc.isoformat()})",
                observed_value=ts_utc.isoformat(),
                timestamp=ts_utc
            )

        # 2. Future Timestamp Check (> now + max_future_skew)
        if (ts_utc - now_dt).total_seconds() > max_future_skew_seconds:
            return QualityViolation(
                violation_type=QualityViolationType.TIMESTAMP_ANOMALY,
                metric_type=None,
                description=f"Timestamp anomaly: Future timestamp ({ts_utc.isoformat()}) ahead of current time",
                observed_value=ts_utc.isoformat(),
                timestamp=ts_utc
            )

        return None

    @classmethod
    def check_stale_data(
        cls,
        timestamp: Optional[datetime],
        reference_time: Optional[datetime] = None,
        max_staleness_days: int = 90
    ) -> Optional[QualityViolation]:
        """Validates that telemetry is not excessively stale (e.g. > 90 days old for live feeds)."""
        if timestamp is None:
            return None

        now_dt = reference_time or datetime.now(timezone.utc)
        ts_utc = timestamp if timestamp.tzinfo is not None else timestamp.replace(tzinfo=timezone.utc)

        age_days = (now_dt - ts_utc).total_seconds() / 86400.0
        if age_days > max_staleness_days:
            return QualityViolation(
                violation_type=QualityViolationType.STALE_DATA,
                metric_type=None,
                description=f"Stale data: Telemetry timestamp ({ts_utc.date()}) is {int(age_days)} days old (limit: {max_staleness_days} days)",
                observed_value=ts_utc.isoformat(),
                timestamp=ts_utc
            )

        return None

    @classmethod
    def check_missing_days(
        cls,
        dates_present: List[str],
        start_date: str,
        end_date: str
    ) -> List[str]:
        """Identifies any missing calendar dates in a daily time-series sequence."""
        try:
            start_d = date.fromisoformat(start_date)
            end_d = date.fromisoformat(end_date)
        except ValueError:
            return []

        if start_d > end_d:
            return []

        present_set = set(dates_present)
        missing: List[str] = []

        curr = start_d
        while curr <= end_d:
            iso_str = curr.isoformat()
            if iso_str not in present_set:
                missing.append(iso_str)
            curr += timedelta(days=1)

        return missing

    @classmethod
    def check_duplicate_data(
        cls,
        metrics: List[WearableMetric]
    ) -> Tuple[List[WearableMetric], List[QualityViolation]]:
        """Deduplicates metrics based on composite key and records violation findings."""
        seen_keys: Set[Tuple[str, str, str, str]] = set()
        deduped: List[WearableMetric] = []
        violations: List[QualityViolation] = []

        for m in metrics:
            ts_str = m.measured_at_utc.isoformat() if m.measured_at_utc else ""
            key = (str(m.subject_id), m.metric_type.value, ts_str, str(m.value))

            if key in seen_keys:
                violations.append(
                    QualityViolation(
                        violation_type=QualityViolationType.DUPLICATE_DATA,
                        metric_type=m.metric_type.value,
                        description=f"Duplicate telemetry packet for {m.metric_type.value} at {ts_str}",
                        observed_value=m.value,
                        timestamp=m.measured_at_utc
                    )
                )
            else:
                seen_keys.add(key)
                deduped.append(m)

        return deduped, violations

    @classmethod
    def validate_metric(
        cls,
        metric: WearableMetric,
        reference_time: Optional[datetime] = None,
        max_staleness_days: int = 90
    ) -> List[QualityViolation]:
        """Runs all single-record quality checks against a WearableMetric instance."""
        violations: List[QualityViolation] = []

        # 1. Impossible Values
        imp_v = cls.check_impossible_values(metric.metric_type, metric.value)
        if imp_v:
            violations.append(imp_v)

        # 2. Unit Mismatch
        unit_v = cls.check_unit_mismatch(metric.metric_type, metric.unit)
        if unit_v:
            violations.append(unit_v)

        # 3. Timestamp Anomalies
        ts_v = cls.check_timestamp_anomalies(metric.measured_at_utc, reference_time=reference_time)
        if ts_v:
            violations.append(ts_v)

        # 4. Stale Data
        stale_v = cls.check_stale_data(metric.measured_at_utc, reference_time=reference_time, max_staleness_days=max_staleness_days)
        if stale_v:
            violations.append(stale_v)

        return violations

    @classmethod
    def sanitize_and_validate_batch(
        cls,
        metrics: List[WearableMetric],
        reference_time: Optional[datetime] = None,
        max_staleness_days: int = 90
    ) -> Tuple[List[WearableMetric], QualityAuditReport]:
        """
        Validates a batch of wearable metrics, quarantines bad data, removes duplicates,
        and produces a QualityAuditReport so that bad data NEVER feeds the insight engine silently.
        """
        report = QualityAuditReport(total_records_evaluated=len(metrics))
        valid_metrics: List[WearableMetric] = []

        # Step 1: Deduplication
        deduped, dup_violations = cls.check_duplicate_data(metrics)
        report.duplicate_count = len(dup_violations)
        report.violations.extend(dup_violations)

        # Step 2: Individual Record Verification & Quarantining
        for m in deduped:
            v_list = cls.validate_metric(m, reference_time=reference_time, max_staleness_days=max_staleness_days)
            if v_list:
                report.violations.extend(v_list)
                report.quarantined_records_count += 1
                logger.warning(
                    "Quarantining bad wearable metric: metric_type=%s, value=%s, reasons=%s",
                    m.metric_type.value,
                    m.value,
                    [v.description for v in v_list]
                )
            else:
                valid_metrics.append(m)
                report.valid_records_count += 1

        if report.quarantined_records_count > 0 or report.duplicate_count > 0:
            report.is_valid_for_insights = len(valid_metrics) > 0

        return valid_metrics, report
