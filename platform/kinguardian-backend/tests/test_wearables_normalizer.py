"""
Wearable Health Data Normalizer Test Suite.

Verifies:
1. Normalization across heterogeneous vendor step streams:
   - Garmin steps -> metric_type = steps, unit = count
   - Fitbit steps -> metric_type = steps, unit = count
   - Apple Health steps -> metric_type = steps, unit = count
2. Unit conversions (km -> meters, miles -> meters, lbs -> kg, Fahrenheit -> Celsius, SpO2 ratio -> %)
3. Timestamps normalization (epoch ms, epoch sec, ISO-8601 strings, dates -> UTC datetime)
4. Provider names normalization (Garmin, Apple Health, HealthKit, Fitbit, Oura, Whoop)
5. Metric names normalization (Apple HealthKit identifiers, Fitbit keys, vendor aliases)
6. Missing/invalid values handling (NaN, null, empty strings)
7. Device identifier & model string extraction
"""

import uuid
from datetime import datetime, timezone

from app.domains.wearables.domain.normalizer import WearableMetricNormalizer
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType
)


def test_garmin_fitbit_apple_steps_normalization():
    """
    Direct verification of the User Scenario:
    Garmin steps, Fitbit steps, Apple Health steps
          ↓
    normalized:
    metric_type = steps, unit = count
    """
    subject_id = uuid.uuid4()

    # 1. Garmin steps
    garmin_raw = {
        "provider": "Garmin",
        "metric": "steps",
        "value": 5840,
        "unit": "steps",
        "measured_at": "2026-08-27T08:00:00Z",
        "device": "Garmin Venu 3 (006-B4254-00)"
    }
    garmin_metric = WearableMetricNormalizer.normalize(subject_id, garmin_raw)
    assert garmin_metric.metric_type == WearableMetricType.STEPS
    assert garmin_metric.unit == "count"
    assert garmin_metric.value == 5840
    assert garmin_metric.source_provider == DeviceProvider.GARMIN
    assert garmin_metric.source_device == "Garmin Venu 3"
    assert garmin_metric.metadata.get("device_id") == "006-B4254-00"

    # 2. Fitbit steps
    fitbit_raw = {
        "provider": "Fitbit",
        "metric": "activities-steps",
        "value": "7200",
        "unit": "steps",
        "measured_at": 1787827200000,  # epoch ms
        "device": {"model": "Fitbit Charge 6", "id": "FB423"}
    }
    fitbit_metric = WearableMetricNormalizer.normalize(subject_id, fitbit_raw)
    assert fitbit_metric.metric_type == WearableMetricType.STEPS
    assert fitbit_metric.unit == "count"
    assert fitbit_metric.value == 7200
    assert fitbit_metric.source_provider == DeviceProvider.FITBIT
    assert fitbit_metric.source_device == "Fitbit Charge 6"
    assert fitbit_metric.metadata.get("device_id") == "FB423"

    # 3. Apple Health steps
    apple_raw = {
        "provider": "HealthKit",
        "metric": "HKQuantityTypeIdentifierStepCount",
        "value": 6420.0,
        "unit": "count",
        "measured_at": "2026-08-27",
        "device": "Apple Watch Series 9 (Watch7,5)"
    }
    apple_metric = WearableMetricNormalizer.normalize(subject_id, apple_raw)
    assert apple_metric.metric_type == WearableMetricType.STEPS
    assert apple_metric.unit == "count"
    assert apple_metric.value == 6420
    assert apple_metric.source_provider == DeviceProvider.APPLE_HEALTH
    assert apple_metric.source_device == "Apple Watch Series 9"
    assert apple_metric.metadata.get("device_id") == "Watch7,5"


def test_unit_and_value_conversions():
    """Verifies standard unit conversions across distance, weight, temperature, and SpO2."""
    subject_id = uuid.uuid4()

    # Distance: 5.2 km -> 5200.0 meters
    dist_km = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "garmin",
        "metric": "distance",
        "value": 5.2,
        "unit": "km"
    })
    assert dist_km.metric_type == WearableMetricType.DISTANCE
    assert dist_km.unit == "meters"
    assert dist_km.value == 5200.0

    # Distance: 2.0 miles -> 3218.69 meters
    dist_miles = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "apple_health",
        "metric": "distance",
        "value": 2.0,
        "unit": "miles"
    })
    assert dist_miles.value == 3218.69

    # Weight: 154.32 lbs -> ~70.0 kg
    weight_lbs = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "fitbit",
        "metric": "weight",
        "value": 154.32,
        "unit": "lbs"
    })
    assert weight_lbs.metric_type == WearableMetricType.WEIGHT
    assert weight_lbs.unit == "kg"
    assert weight_lbs.value == 70.0

    # Temperature: 98.6 F -> 37.0 C
    temp_f = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "oura",
        "metric": "body_temperature",
        "value": 98.6,
        "unit": "F"
    })
    assert temp_f.metric_type == WearableMetricType.BODY_TEMPERATURE
    assert temp_f.unit == "celsius"
    assert temp_f.value == 37.0

    # SpO2: 0.985 ratio -> 98.5%
    spo2_ratio = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "garmin",
        "metric": "spo2",
        "value": 0.985,
        "unit": "ratio"
    })
    assert spo2_ratio.metric_type == WearableMetricType.BLOOD_OXYGEN
    assert spo2_ratio.unit == "percentage"
    assert spo2_ratio.value == 98.5


def test_timestamp_normalization():
    """Verifies epoch ms, epoch sec, ISO-8601 strings, and date strings convert to UTC datetime."""
    # 1. Epoch Milliseconds
    dt_ms, tz_ms = WearableMetricNormalizer.normalize_timestamp(1700000000000)
    assert dt_ms.tzinfo == timezone.utc
    assert dt_ms.year == 2023
    assert tz_ms == "UTC"

    # 2. Epoch Seconds
    dt_sec, tz_sec = WearableMetricNormalizer.normalize_timestamp(1700000000)
    assert dt_sec.tzinfo == timezone.utc
    assert dt_sec.year == 2023

    # 3. ISO String with Z
    dt_iso, tz_iso = WearableMetricNormalizer.normalize_timestamp("2026-08-27T10:30:00Z")
    assert dt_iso.tzinfo == timezone.utc
    assert dt_iso.year == 2026
    assert dt_iso.hour == 10
    assert dt_iso.minute == 30

    # 4. Date String YYYY-MM-DD
    dt_date, tz_date = WearableMetricNormalizer.normalize_timestamp("2026-08-27")
    assert dt_date.tzinfo == timezone.utc
    assert dt_date.day == 27
    assert dt_date.month == 8



def test_missing_values_and_sanitization():
    """Verifies missing and corrupted values are handled gracefully without raising exceptions."""
    subject_id = uuid.uuid4()

    # None steps defaults to 0
    metric_none = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "garmin",
        "metric": "steps",
        "value": None
    })
    assert metric_none.value == 0

    # "NaN" heart rate becomes None
    metric_nan = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "fitbit",
        "metric": "heart_rate",
        "value": "NaN"
    })
    assert metric_nan.value is None

    # Empty string temperature becomes None
    metric_empty = WearableMetricNormalizer.normalize(subject_id, {
        "provider": "oura",
        "metric": "temperature",
        "value": ""
    })
    assert metric_empty.value is None


def test_batch_normalization():
    """Verifies batch normalization over multiple dimensions."""
    subject_id = uuid.uuid4()
    raw_batch = [
        {"provider": "Garmin", "metric": "steps", "value": 5000, "measured_at": "2026-08-27"},
        {"provider": "Apple Health", "metric": "resting_heart_rate", "value": 64, "measured_at": "2026-08-27"},
        {"provider": "Oura", "metric": "sleep_duration", "value": 450, "unit": "minutes", "measured_at": "2026-08-27"}
    ]
    metrics = WearableMetricNormalizer.normalize_batch(subject_id, raw_batch)
    assert len(metrics) == 3
    assert metrics[0].metric_type == WearableMetricType.STEPS
    assert metrics[0].unit == "count"
    assert metrics[1].metric_type == WearableMetricType.RESTING_HEART_RATE
    assert metrics[1].unit == "bpm"
    assert metrics[2].metric_type == WearableMetricType.SLEEP_DURATION
    assert metrics[2].unit == "minutes"
