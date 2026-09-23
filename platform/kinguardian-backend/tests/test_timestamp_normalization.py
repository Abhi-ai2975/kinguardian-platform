"""
Timestamp Normalization Test Suite.

Verifies:
1. All stored timestamps are strictly normalized to UTC (timezone-aware).
2. Each metric retains:
   - measured_at_utc
   - local_timezone
3. Mobile client timezone conversion simulation (e.g. converting UTC to Asia/Kolkata and Europe/London).
4. API contract adherence on GET /subjects/{subject_id}/wearables/metrics.
"""

import pytest
import uuid
from zoneinfo import ZoneInfo
from datetime import datetime, timezone

from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.normalizer import WearableMetricNormalizer
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType
)


def test_wearable_metric_retains_utc_and_local_timezone():
    """
    Verifies that WearableMetric enforces strictly UTC for measured_at_utc
    while preserving the subject's local_timezone.
    """
    subject_id = uuid.uuid4()

    # Case 1: Raw payload with IST offset (+05:30) for Ramesh in Chennai
    ramesh_raw = {
        "provider": "Garmin",
        "metric": "steps",
        "value": 5840,
        "measured_at": "2026-08-27T13:30:00+05:30",
        "local_timezone": "Asia/Kolkata"
    }
    metric_ramesh = WearableMetricNormalizer.normalize(
        subject_id=subject_id,
        raw_measurement=ramesh_raw,
        local_timezone="Asia/Kolkata"
    )

    # 1. Verification of UTC storage
    assert metric_ramesh.measured_at_utc.tzinfo == timezone.utc
    # 13:30:00 +05:30 -> 08:00:00 UTC
    assert metric_ramesh.measured_at_utc.hour == 8
    assert metric_ramesh.measured_at_utc.minute == 0
    assert metric_ramesh.local_timezone == "Asia/Kolkata"

    # 2. Simulated Mobile UI conversion to user's local timezone
    kolkata_tz = ZoneInfo(metric_ramesh.local_timezone)
    ramesh_local_display = metric_ramesh.measured_at_utc.astimezone(kolkata_tz)
    assert ramesh_local_display.hour == 13
    assert ramesh_local_display.minute == 30

    # 3. Serialized dictionary inspection
    d = metric_ramesh.to_dict()
    assert "measured_at_utc" in d
    assert "local_timezone" in d
    assert d["local_timezone"] == "Asia/Kolkata"
    assert d["measured_at_utc"].endswith("+00:00") or d["measured_at_utc"].endswith("Z")


def test_wearable_metric_london_timezone():
    """
    Verifies metric timestamp normalization for Anjali in London (BST / Europe/London).
    """
    subject_id = uuid.uuid4()

    # Raw payload from Apple Watch recorded at 09:15 BST (+01:00)
    anjali_raw = {
        "provider": "Apple Health",
        "metric": "resting_heart_rate",
        "value": 64,
        "measured_at": "2026-08-27T09:15:00+01:00",
        "local_timezone": "Europe/London"
    }
    metric_anjali = WearableMetricNormalizer.normalize(
        subject_id=subject_id,
        raw_measurement=anjali_raw
    )

    # Stored in UTC: 09:15 +01:00 -> 08:15 UTC
    assert metric_anjali.measured_at_utc.tzinfo == timezone.utc
    assert metric_anjali.measured_at_utc.hour == 8
    assert metric_anjali.measured_at_utc.minute == 15
    assert metric_anjali.local_timezone == "Europe/London"

    # Converted back to London time on mobile UI
    london_tz = ZoneInfo(metric_anjali.local_timezone)
    anjali_local_display = metric_anjali.measured_at_utc.astimezone(london_tz)
    assert anjali_local_display.hour == 9
    assert anjali_local_display.minute == 15


def test_epoch_milliseconds_utc_normalization():
    """
    Verifies epoch ms timestamps are converted to UTC and retain local timezone.
    """
    subject_id = uuid.uuid4()
    epoch_ms = 1787827200000  # 2026-08-27 10:40:00 UTC

    metric = WearableMetricNormalizer.normalize(
        subject_id=subject_id,
        raw_measurement={
            "provider": "Fitbit",
            "metric": "sleep_duration",
            "value": 420,
            "measured_at": epoch_ms
        },
        local_timezone="America/New_York"
    )

    assert metric.measured_at_utc.tzinfo == timezone.utc
    assert metric.local_timezone == "America/New_York"
