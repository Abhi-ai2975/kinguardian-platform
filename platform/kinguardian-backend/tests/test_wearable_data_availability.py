"""
Wearable Data Availability & Quality Governance Test Suite.

Verifies:
1. The 5 Data Availability Pillars:
   - device connected?
   - recent sync?
   - data completeness? (not off-wrist / left on charger)
   - sufficient baseline? (>= 7 days required)
   - expected sampling frequency?
2. Critical Safety Invariant:
   - Distinguish health change from data availability problem.
   - Do NOT generate a Guardian Moment merely because a device stopped syncing.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest

from app.domains.wearables.domain.entities import WearableDailySummary
from app.domains.wearables.domain.value_objects import (
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals
)
from app.domains.wearables.domain.availability import (
    DataAvailabilityPillar,
    DataQualityClassification,
    WearableDataAvailabilityResult,
    WearableDataAvailabilityEvaluator
)
from app.domains.wearables.domain.services import WearableDomainService


def test_data_availability_all_five_pillars_satisfied():
    """
    Scenario: Valid Genuine Health Observation.
    - Device connected: True
    - Recent sync: 10 minutes ago
    - Data completeness: Complete (4,520 steps, 45 active mins)
    - Sufficient baseline: 21 historical days (baseline: 6,210 steps)
    - Sampling frequency: Met

    Result: can_generate_guardian_moment = True, VALID_FOR_INSIGHT.
    """
    subject_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # 21 historical days with ~6,200 steps
    history = [
        WearableDailySummary(
            date=f"2026-08-{i:02d}",
            activity=ActivityMetrics(steps=6200, active_minutes=50)
        )
        for i in range(1, 22)
    ]

    today = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=4520, active_minutes=42)
    )

    result = WearableDataAvailabilityEvaluator.evaluate(
        subject_id=subject_id,
        is_device_connected=True,
        last_sync_at=now - timedelta(minutes=10),
        today_summary=today,
        historical_summaries=history,
        metric_name="activity",
        reference_time=now
    )

    assert result.is_device_connected is True
    assert result.has_recent_sync is True
    assert result.is_data_complete is True
    assert result.has_sufficient_baseline is True
    assert result.meets_sampling_frequency is True
    assert result.can_generate_guardian_moment is True
    assert result.classification == DataQualityClassification.VALID_FOR_INSIGHT
    assert len(result.failed_pillars) == 0


def test_data_availability_device_stopped_syncing_suppresses_guardian_moment():
    """
    CRITICAL TEST:
    Device stopped syncing (last sync 36 hours ago).
    Must distinguish data availability problem from health change and suppress Guardian Moment.
    """
    subject_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    history = [
        WearableDailySummary(date=f"2026-08-{i:02d}", activity=ActivityMetrics(steps=6000, active_minutes=50))
        for i in range(1, 15)
    ]

    # Stale sync (36 hours ago)
    stale_sync = now - timedelta(hours=36)

    today = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=1500, active_minutes=20)
    )

    result = WearableDataAvailabilityEvaluator.evaluate(
        subject_id=subject_id,
        is_device_connected=True,
        last_sync_at=stale_sync,
        today_summary=today,
        historical_summaries=history,
        metric_name="activity",
        reference_time=now
    )

    assert result.has_recent_sync is False
    assert result.can_generate_guardian_moment is False
    assert result.classification == DataQualityClassification.DATA_AVAILABILITY_PROBLEM
    assert DataAvailabilityPillar.RECENT_SYNC.value in result.failed_pillars
    assert "stopped syncing" in result.explanation.lower()

    # Verify domain service suppresses anomaly
    anomalies = WearableDomainService.evaluate_all_anomalies(
        subject_id=subject_id,
        today_summary=today,
        historical_summaries=history,
        is_device_connected=True,
        last_sync_at=stale_sync,
        enforce_availability_governance=True
    )
    assert len(anomalies) == 0  # SUPPRESSED!


def test_data_availability_off_wrist_incomplete_wear_time():
    """
    CRITICAL TEST:
    Dad left the watch on the nightstand/charger for the whole day (0 steps, 0 active mins).
    Must classify as data availability / non-wear problem, NOT an activity drop!
    """
    subject_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    history = [
        WearableDailySummary(date=f"2026-08-{i:02d}", activity=ActivityMetrics(steps=6200, active_minutes=50))
        for i in range(1, 15)
    ]

    # Zero wear time / off-wrist
    off_wrist_today = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=0, active_minutes=0)
    )

    result = WearableDataAvailabilityEvaluator.evaluate(
        subject_id=subject_id,
        is_device_connected=True,
        last_sync_at=now - timedelta(minutes=15),
        today_summary=off_wrist_today,
        historical_summaries=history,
        metric_name="activity",
        reference_time=now
    )

    assert result.is_data_complete is False
    assert result.can_generate_guardian_moment is False
    assert result.classification == DataQualityClassification.DATA_AVAILABILITY_PROBLEM
    assert DataAvailabilityPillar.DATA_COMPLETENESS.value in result.failed_pillars
    assert "off-wrist" in result.explanation.lower() or "incomplete data" in result.explanation.lower()

    # Suppressed in domain service
    anomalies = WearableDomainService.evaluate_all_anomalies(
        subject_id=subject_id,
        today_summary=off_wrist_today,
        historical_summaries=history,
        is_device_connected=True,
        last_sync_at=now - timedelta(minutes=15),
        enforce_availability_governance=True
    )
    assert len(anomalies) == 0


def test_data_availability_insufficient_baseline():
    """
    CRITICAL TEST:
    Subject only connected the device 2 days ago (< 7 required baseline days).
    Must classify as insufficient baseline and suppress Guardian Moment.
    """
    subject_id = uuid.uuid4()
    now = datetime.now(timezone.utc)

    # Only 2 historical days
    scant_history = [
        WearableDailySummary(date="2026-08-01", activity=ActivityMetrics(steps=6500, active_minutes=50)),
        WearableDailySummary(date="2026-08-02", activity=ActivityMetrics(steps=6200, active_minutes=48))
    ]

    today = WearableDailySummary(
        date="2026-08-03",
        activity=ActivityMetrics(steps=3500, active_minutes=30)
    )

    result = WearableDataAvailabilityEvaluator.evaluate(
        subject_id=subject_id,
        is_device_connected=True,
        last_sync_at=now - timedelta(minutes=10),
        today_summary=today,
        historical_summaries=scant_history,
        metric_name="activity",
        reference_time=now
    )

    assert result.has_sufficient_baseline is False
    assert result.can_generate_guardian_moment is False
    assert DataAvailabilityPillar.SUFFICIENT_BASELINE.value in result.failed_pillars
    assert "insufficient baseline" in result.explanation.lower()



def test_data_availability_disconnected_device():
    """
    Device connection was revoked or disconnected.
    Must immediately identify as device_disconnected.
    """
    subject_id = uuid.uuid4()

    result = WearableDataAvailabilityEvaluator.evaluate(
        subject_id=subject_id,
        is_device_connected=False,
        metric_name="activity"
    )

    assert result.is_device_connected is False
    assert result.can_generate_guardian_moment is False
    assert DataAvailabilityPillar.DEVICE_CONNECTED.value in result.failed_pillars
    assert "disconnected" in result.explanation.lower()
