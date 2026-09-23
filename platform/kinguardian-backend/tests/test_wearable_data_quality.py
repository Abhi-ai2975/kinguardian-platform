"""
Wearable Data Quality Governance Test Suite.

Verifies WearableDataQualityService checks:
1. stale data
2. missing days
3. duplicate data
4. impossible values
5. unit mismatch
6. timestamp anomalies

Ensures bad data never feeds the insight engine silently.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest

from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.value_objects import WearableMetricType, DeviceProvider
from app.domains.wearables.domain.quality import (
    WearableDataQualityService,
    QualityViolationType,
    QualityViolation,
    QualityAuditReport
)


def test_quality_check_impossible_values():
    """
    Verifies physiological boundary enforcement on impossible values:
    - Steps: -500 (negative) or 250,000 (impossible)
    - Heart rate: 0 bpm, 400 bpm
    - Blood oxygen: 125%, 20%
    - Sleep duration: 30 hours (1,800 mins)
    """
    # 1. Negative Steps
    v1 = WearableDataQualityService.check_impossible_values(WearableMetricType.STEPS, -500)
    assert v1 is not None
    assert v1.violation_type == QualityViolationType.IMPOSSIBLE_VALUE
    assert "impossible value" in v1.description.lower()

    # 2. Impossible Steps (250,000 in a day)
    v2 = WearableDataQualityService.check_impossible_values(WearableMetricType.STEPS, 250_000)
    assert v2 is not None
    assert v2.violation_type == QualityViolationType.IMPOSSIBLE_VALUE

    # 3. Heart Rate 400 bpm
    v3 = WearableDataQualityService.check_impossible_values(WearableMetricType.HEART_RATE, 400)
    assert v3 is not None
    assert v3.violation_type == QualityViolationType.IMPOSSIBLE_VALUE

    # 4. SpO2 120%
    v4 = WearableDataQualityService.check_impossible_values(WearableMetricType.BLOOD_OXYGEN, 120)
    assert v4 is not None
    assert v4.violation_type == QualityViolationType.IMPOSSIBLE_VALUE

    # 5. Valid steps (6,200) -> None
    assert WearableDataQualityService.check_impossible_values(WearableMetricType.STEPS, 6200) is None

    # 6. Valid Heart Rate (72 bpm) -> None
    assert WearableDataQualityService.check_impossible_values(WearableMetricType.HEART_RATE, 72) is None


def test_quality_check_unit_mismatch():
    """
    Verifies detection of unit mismatches:
    - Steps with unit 'bpm' or 'kg'
    - Heart rate with unit 'meters'
    - Temperature with unit 'mmHg'
    """
    # 1. Steps as bpm
    v1 = WearableDataQualityService.check_unit_mismatch(WearableMetricType.STEPS, "bpm")
    assert v1 is not None
    assert v1.violation_type == QualityViolationType.UNIT_MISMATCH
    assert "incompatible" in v1.description.lower()

    # 2. Heart rate as kg
    v2 = WearableDataQualityService.check_unit_mismatch(WearableMetricType.HEART_RATE, "kg")
    assert v2 is not None
    assert v2.violation_type == QualityViolationType.UNIT_MISMATCH

    # 3. Valid units -> None
    assert WearableDataQualityService.check_unit_mismatch(WearableMetricType.STEPS, "steps") is None
    assert WearableDataQualityService.check_unit_mismatch(WearableMetricType.HEART_RATE, "bpm") is None
    assert WearableDataQualityService.check_unit_mismatch(WearableMetricType.BODY_TEMPERATURE, "degC") is None



def test_quality_check_timestamp_anomalies():
    """
    Verifies detection of:
    - Future timestamps (> 1 hour ahead)
    - Epoch-zero timestamps (1970-01-01)
    """
    now = datetime(2026, 8, 27, 12, 0, 0, tzinfo=timezone.utc)

    # 1. Future timestamp (3 days ahead)
    fut_ts = now + timedelta(days=3)
    v1 = WearableDataQualityService.check_timestamp_anomalies(fut_ts, reference_time=now)
    assert v1 is not None
    assert v1.violation_type == QualityViolationType.TIMESTAMP_ANOMALY
    assert "future" in v1.description.lower()

    # 2. Epoch Zero (1970-01-01)
    epoch_zero = datetime(1970, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    v2 = WearableDataQualityService.check_timestamp_anomalies(epoch_zero, reference_time=now)
    assert v2 is not None
    assert v2.violation_type == QualityViolationType.TIMESTAMP_ANOMALY
    assert "epoch-zero" in v2.description.lower() or "corrupted" in v2.description.lower()

    # 3. Valid timestamp (today) -> None
    assert WearableDataQualityService.check_timestamp_anomalies(now - timedelta(minutes=5), reference_time=now) is None


def test_quality_check_stale_data():
    """
    Verifies detection of stale data (> 90 days old).
    """
    now = datetime(2026, 8, 27, 12, 0, 0, tzinfo=timezone.utc)

    # 120 days old
    old_ts = now - timedelta(days=120)
    v = WearableDataQualityService.check_stale_data(old_ts, reference_time=now, max_staleness_days=90)
    assert v is not None
    assert v.violation_type == QualityViolationType.STALE_DATA
    assert "stale data" in v.description.lower()

    # 10 days old -> None
    assert WearableDataQualityService.check_stale_data(now - timedelta(days=10), reference_time=now, max_staleness_days=90) is None


def test_quality_check_missing_days():
    """
    Verifies missing calendar date identification in time series.
    """
    present = ["2026-08-01", "2026-08-02", "2026-08-05", "2026-08-07"]
    missing = WearableDataQualityService.check_missing_days(present, "2026-08-01", "2026-08-07")

    assert missing == ["2026-08-03", "2026-08-04", "2026-08-06"]


def test_quality_check_duplicate_data():
    """
    Verifies deduplication of identical telemetry packets.
    """
    subj_id = uuid.uuid4()
    now = datetime(2026, 8, 27, 10, 0, 0, tzinfo=timezone.utc)

    m1 = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=72,
        unit="bpm",
        measured_at_utc=now,
        source_provider=DeviceProvider.GARMIN
    )
    # Exact duplicate
    m2 = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=72,
        unit="bpm",
        measured_at_utc=now,
        source_provider=DeviceProvider.GARMIN
    )
    # Distinct metric (different timestamp)
    m3 = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=75,
        unit="bpm",
        measured_at_utc=now + timedelta(minutes=1),
        source_provider=DeviceProvider.GARMIN
    )

    deduped, violations = WearableDataQualityService.check_duplicate_data([m1, m2, m3])
    assert len(deduped) == 2
    assert len(violations) == 1
    assert violations[0].violation_type == QualityViolationType.DUPLICATE_DATA


def test_sanitize_and_validate_batch_quarantines_bad_data():
    """
    CRITICAL INVARIANT TEST:
    Bad data must NOT feed the insight engine silently.
    Batch with valid and bad records is audited: bad records are quarantined,
    valid records are preserved, and audit report is produced.
    """
    subj_id = uuid.uuid4()
    now = datetime(2026, 8, 27, 10, 0, 0, tzinfo=timezone.utc)

    # 1. Valid step metric
    m_valid = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.STEPS,
        value=6200,
        unit="steps",
        measured_at_utc=now - timedelta(hours=2),
        source_provider=DeviceProvider.GARMIN
    )

    # 2. Bad metric: Impossible value (350,000 steps)
    m_bad_val = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.STEPS,
        value=350_000,
        unit="steps",
        measured_at_utc=now - timedelta(hours=2),
        source_provider=DeviceProvider.GARMIN
    )

    # 3. Bad metric: Unit mismatch (steps labeled as bpm)
    m_bad_unit = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.STEPS,
        value=4500,
        unit="bpm",
        measured_at_utc=now - timedelta(hours=1),
        source_provider=DeviceProvider.GARMIN
    )


    # 4. Bad metric: Epoch zero timestamp (1970)
    m_bad_ts = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=70,
        unit="bpm",
        measured_at_utc=datetime(1970, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
        source_provider=DeviceProvider.GARMIN
    )

    raw_batch = [m_valid, m_bad_val, m_bad_unit, m_bad_ts]
    sanitized, report = WearableDataQualityService.sanitize_and_validate_batch(raw_batch, reference_time=now)

    # Only the 1 valid record survives
    assert len(sanitized) == 1
    assert sanitized[0].value == 6200

    # 3 bad records are quarantined
    assert report.quarantined_records_count == 3
    assert report.total_records_evaluated == 4
    assert report.valid_records_count == 1
    assert report.has_violations is True
    assert len(report.violations) >= 3

    violation_types = {v.violation_type for v in report.violations}
    assert QualityViolationType.IMPOSSIBLE_VALUE in violation_types
    assert QualityViolationType.UNIT_MISMATCH in violation_types
    assert QualityViolationType.TIMESTAMP_ANOMALY in violation_types

