"""
Wearable Multi-Device & Concurrent Data Sources Test Suite.

Verifies:
1. Multiple concurrent data sources for a single care subject:
   - Apple Watch
   - Garmin
   - Fitbit
   - Oura
2. Never assume one wearable per person.
3. Source priority configuration where multiple providers produce the same metric.
4. Conflict resolution and prevention of duplicate step summation / double-counting.
5. Cross-device daily summary synthesis (e.g. Garmin activity + Oura sleep).
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest

from app.domains.wearables.domain.entities import WearableMetric, WearableDailySummary
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals
)
from app.domains.wearables.domain.multidevice import (
    MetricSourcePriorityConfig,
    ResolvedWearableMetric,
    MultiDeviceDataSynthesizer
)


def test_multi_device_step_conflict_resolution_and_no_double_counting():
    """
    Scenario:
    Dad in Chennai wears both a Garmin Venu and an Apple Watch on the same day (Aug 22).
    Garmin records: 6,200 steps
    Apple Watch records: 5,950 steps

    Invariant:
    - Does NOT double-count to 12,150 steps!
    - Resolves conflict using MetricSourcePriorityConfig (Garmin ranked #1 for steps).
    - Preserves source transparency with competing providers and values.
    """
    subject_id = uuid.uuid4()
    meas_dt = datetime(2026, 8, 22, 21, 0, 0, tzinfo=timezone.utc)

    garmin_steps = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=6200,
        unit="steps",
        measured_at_utc=meas_dt,
        source_provider=DeviceProvider.GARMIN
    )

    apple_steps = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=5950,
        unit="steps",
        measured_at_utc=meas_dt,
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    resolved = MultiDeviceDataSynthesizer.resolve_metric_conflicts(
        [garmin_steps, apple_steps]
    )

    assert len(resolved) == 1
    res = resolved[0]
    assert res.was_conflict is True
    assert res.primary_provider == DeviceProvider.GARMIN
    assert res.selected_metric.value == 6200  # Authoritative Garmin value
    assert res.selected_metric.value != 12150  # STRICT INVARIANT: NOT double counted!
    assert DeviceProvider.APPLE_HEALTH in res.competing_providers
    assert res.competing_values["apple_health"] == 5950
    assert res.competing_values["garmin"] == 6200


def test_multi_device_sleep_conflict_resolution_oura_preferred():
    """
    Scenario:
    Dad wears an Oura Ring Gen 3 and an Apple Watch to bed.
    Oura records: 468 mins (7.8 hours) of sleep architecture
    Apple Watch records: 440 mins (7.3 hours) of sleep

    Invariant:
    - Oura Ring is ranked #1 for sleep duration/stages in MetricSourcePriorityConfig.
    - Selects Oura Ring measurement as primary.
    """
    subject_id = uuid.uuid4()
    meas_dt = datetime(2026, 8, 22, 7, 0, 0, tzinfo=timezone.utc)

    oura_sleep = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.SLEEP_DURATION,
        value=468,
        unit="minutes",
        measured_at_utc=meas_dt,
        source_provider=DeviceProvider.OURA
    )

    apple_sleep = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.SLEEP_DURATION,
        value=440,
        unit="minutes",
        measured_at_utc=meas_dt,
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    resolved = MultiDeviceDataSynthesizer.resolve_metric_conflicts(
        [apple_sleep, oura_sleep]
    )

    assert len(resolved) == 1
    res = resolved[0]
    assert res.was_conflict is True
    assert res.primary_provider == DeviceProvider.OURA
    assert res.selected_metric.value == 468
    assert DeviceProvider.APPLE_HEALTH in res.competing_providers


def test_multi_device_four_concurrent_sources_synthesis():
    """
    Scenario:
    Dad has 4 concurrent wearable devices:
    - Garmin (Daytime running / steps: 6,200 steps)
    - Oura (Nocturnal sleep: 470 mins, 7.8 hrs, score 88)
    - Apple Watch (ECG / daytime vitals / steps: 5,900)
    - Fitbit (Past backup device)

    MultiDeviceDataSynthesizer synthesizes a composite daily summary:
    - Activity: From Garmin (6,200 steps)
    - Sleep: From Oura (470 mins)
    - Recovery: From Oura/Garmin
    """
    # 1. Garmin Daily Summary
    garmin_summary = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=6200, active_minutes=48, distance_meters=4800.0),
        source_provider=DeviceProvider.GARMIN
    )

    # 2. Oura Daily Summary
    oura_summary = WearableDailySummary(
        date="2026-08-22",
        sleep=SleepArchitecture(total_sleep_minutes=470, deep_sleep_minutes=95, rem_sleep_minutes=110, sleep_score=88),
        recovery=RecoveryVitals(resting_heart_rate_bpm=58, hrv_rmssd_ms=45.0),
        source_provider=DeviceProvider.OURA
    )

    # 3. Apple Watch Daily Summary
    apple_summary = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=5900, active_minutes=42),
        sleep=SleepArchitecture(total_sleep_minutes=440, sleep_score=80),
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    # 4. Fitbit Daily Summary
    fitbit_summary = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=5750, active_minutes=40),
        source_provider=DeviceProvider.FITBIT
    )

    composite = MultiDeviceDataSynthesizer.synthesize_daily_summary(
        summaries_from_devices=[garmin_summary, oura_summary, apple_summary, fitbit_summary],
        target_date="2026-08-22"
    )

    assert composite.date == "2026-08-22"
    # Activity picked from Garmin (highest step priority)
    assert composite.activity is not None
    assert composite.activity.steps == 6200
    assert composite.activity.distance_meters == 4800.0

    # Sleep picked from Oura (highest sleep priority)
    assert composite.sleep is not None
    assert composite.sleep.total_sleep_minutes == 470
    assert composite.sleep.sleep_score == 88

    # Recovery picked from Oura (highest HRV/recovery priority)
    assert composite.recovery is not None
    assert composite.recovery.resting_heart_rate_bpm == 58
    assert composite.recovery.hrv_rmssd_ms == 45.0


def test_custom_source_priority_configuration():
    """
    Verifies that source priority can be customized per family/subject preferences.
    For example, user explicitly prefers Apple Watch for steps over Garmin.
    """
    subject_id = uuid.uuid4()
    meas_dt = datetime(2026, 8, 22, 18, 0, 0, tzinfo=timezone.utc)

    garmin_steps = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=6200,
        unit="steps",
        measured_at_utc=meas_dt,
        source_provider=DeviceProvider.GARMIN
    )

    apple_steps = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=5950,
        unit="steps",
        measured_at_utc=meas_dt,
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    # Custom priority: Apple Health > Garmin
    custom_cfg = MetricSourcePriorityConfig(
        priorities={
            WearableMetricType.STEPS: [DeviceProvider.APPLE_HEALTH, DeviceProvider.GARMIN]
        }
    )

    resolved = MultiDeviceDataSynthesizer.resolve_metric_conflicts(
        [garmin_steps, apple_steps],
        priority_config=custom_cfg
    )

    assert len(resolved) == 1
    assert resolved[0].primary_provider == DeviceProvider.APPLE_HEALTH
    assert resolved[0].selected_metric.value == 5950
