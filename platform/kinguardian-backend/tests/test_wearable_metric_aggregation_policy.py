"""
Wearable Metric Aggregation & Duplicate Handling Policy Test Suite.

Verifies:
1. MetricAggregationPolicy determines:
   - preferred source
   - deduplication
   - aggregation
   - provenance
2. Multiple sources providing the same metric/time period are NOT simply double counted.
3. Every derived metric retains source provenance.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest

from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.value_objects import DeviceProvider, WearableMetricType
from app.domains.wearables.domain.aggregation_policy import (
    AggregationMethod,
    SourceProvenance,
    MetricAggregationRule,
    AggregatedWearableMetric,
    MetricAggregationPolicy
)


def test_metric_aggregation_policy_steps_no_double_counting_with_provenance():
    """
    Scenario:
    Dad in Chennai has both Garmin and Apple Watch reporting daily steps for 2026-08-22.
    Garmin: 6,200 steps
    Apple Watch: 5,950 steps

    Invariant:
    - MetricAggregationPolicy uses PREFERRED_SOURCE (Garmin priority).
    - Result value = 6,200 (STRICTLY NOT 12,150).
    - Provenance contains:
      - primary_source: "garmin"
      - contributing_sources: ["garmin", "apple_health"]
      - raw_values_by_source: {"garmin": 6200, "apple_health": 5950}
      - deduplication_applied: True
    """
    subj_id = uuid.uuid4()
    now = datetime(2026, 8, 22, 22, 0, 0, tzinfo=timezone.utc)

    garmin_m = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.STEPS,
        value=6200,
        unit="steps",
        measured_at_utc=now,
        source_provider=DeviceProvider.GARMIN
    )

    apple_m = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.STEPS,
        value=5950,
        unit="steps",
        measured_at_utc=now,
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    policy = MetricAggregationPolicy()
    aggregated = policy.aggregate_metrics([garmin_m, apple_m], reference_time=now)

    assert len(aggregated) == 1
    item = aggregated[0]

    # Value check (Zero double counting)
    assert item.value == 6200
    assert item.value != 12150
    assert item.metric_type == "steps"
    assert item.raw_records_count == 2

    # Provenance check
    prov = item.provenance
    assert prov.primary_source == "garmin"
    assert "garmin" in prov.contributing_sources
    assert "apple_health" in prov.contributing_sources
    assert prov.raw_values_by_source["garmin"] == 6200
    assert prov.raw_values_by_source["apple_health"] == 5950
    assert prov.aggregation_method == AggregationMethod.PREFERRED_SOURCE
    assert prov.deduplication_applied is True

    # Serialization check
    item_dict = item.to_dict()
    assert "provenance" in item_dict
    assert item_dict["provenance"]["primary_source"] == "garmin"
    assert item_dict["provenance"]["deduplication_applied"] is True


def test_metric_aggregation_policy_resting_heart_rate_min_method():
    """
    Scenario:
    Resting Heart Rate measured by Oura (56 bpm) and Apple Watch (61 bpm) on same night.
    Policy method: MIN (Lowest nocturnal basal pulse).
    Result: 56 bpm with full multi-source provenance.
    """
    subj_id = uuid.uuid4()
    now = datetime(2026, 8, 22, 6, 30, 0, tzinfo=timezone.utc)

    oura_hr = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.RESTING_HEART_RATE,
        value=56,
        unit="bpm",
        measured_at_utc=now,
        source_provider=DeviceProvider.OURA
    )

    apple_hr = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.RESTING_HEART_RATE,
        value=61,
        unit="bpm",
        measured_at_utc=now,
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    policy = MetricAggregationPolicy()
    aggregated = policy.aggregate_metrics([oura_hr, apple_hr], reference_time=now)

    assert len(aggregated) == 1
    item = aggregated[0]
    assert item.value == 56
    assert item.provenance.primary_source == "oura"
    assert item.provenance.aggregation_method == AggregationMethod.MIN
    assert item.provenance.raw_values_by_source["oura"] == 56
    assert item.provenance.raw_values_by_source["apple_health"] == 61


def test_metric_aggregation_policy_blood_oxygen_weighted_average():
    """
    Scenario:
    SpO2 measured by Garmin (97.0%) and Oura (98.0%).
    Policy method: WEIGHTED_AVERAGE.
    Result: Weighted average ~ 97.5% with composite provenance.
    """
    subj_id = uuid.uuid4()
    now = datetime(2026, 8, 22, 5, 0, 0, tzinfo=timezone.utc)

    garmin_spo2 = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.BLOOD_OXYGEN,
        value=97.0,
        unit="%",
        measured_at_utc=now,
        source_provider=DeviceProvider.GARMIN
    )

    oura_spo2 = WearableMetric(
        subject_id=subj_id,
        metric_type=WearableMetricType.BLOOD_OXYGEN,
        value=98.0,
        unit="%",
        measured_at_utc=now,
        source_provider=DeviceProvider.OURA
    )

    policy = MetricAggregationPolicy()
    aggregated = policy.aggregate_metrics([garmin_spo2, oura_spo2], reference_time=now)

    assert len(aggregated) == 1
    item = aggregated[0]
    assert 97.0 <= item.value <= 98.0
    assert item.provenance.aggregation_method == AggregationMethod.WEIGHTED_AVERAGE
    assert "garmin" in item.provenance.contributing_sources
    assert "oura" in item.provenance.contributing_sources
