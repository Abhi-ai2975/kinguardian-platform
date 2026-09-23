"""
Wearable Source Priority & Dynamic Policy Test Suite.

Verifies configurable policies across:
- metric
- provider priority (e.g. Apple Health → Garmin → Fitbit)
- freshness
- confidence

Verifies that policies are dynamically configurable and NOT hardcoded globally.
"""

import uuid
from datetime import datetime, timezone, timedelta
import pytest

from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.value_objects import DeviceProvider, WearableMetricType
from app.domains.wearables.domain.source_priority_policy import (
    SourcePriorityRule,
    SourcePriorityPolicy,
    PolicyResolvedMetric,
    ConfigurableSourcePriorityEngine
)


def test_steps_apple_health_to_garmin_to_fitbit_priority():
    """
    Scenario directly from user request:
    Configured policy for steps:
    Apple Health → Garmin → Fitbit

    When Apple Health (5,950 steps) and Garmin (6,200 steps) are concurrently reported:
    - Apple Health is selected because it is ranked #1.
    - Verified that policy is NOT hardcoded and uses user's explicit rule.
    """
    subject_id = uuid.uuid4()
    now = datetime(2026, 8, 27, 18, 0, 0, tzinfo=timezone.utc)

    # 1. Custom Policy: Apple Health → Garmin → Fitbit
    custom_policy = SourcePriorityPolicy(
        id=uuid.uuid4(),
        name="User Custom Step Priority",
        subject_id=subject_id,
        rules={
            "steps": SourcePriorityRule(
                metric="steps",
                provider_priority=["apple_health", "garmin", "fitbit"],
                freshness_weight=0.10,
                min_confidence=0.60
            )
        }
    )

    apple_m = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=5950,
        unit="steps",
        measured_at_utc=now,
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    garmin_m = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=6200,
        unit="steps",
        measured_at_utc=now,
        source_provider=DeviceProvider.GARMIN
    )

    resolved = ConfigurableSourcePriorityEngine.resolve_competing_metrics(
        metrics=[apple_m, garmin_m],
        policy=custom_policy,
        reference_time=now
    )

    assert len(resolved) == 1
    res = resolved[0]
    assert res.was_conflict is True
    assert res.primary_provider == "apple_health"
    assert res.selected_metric.value == 5950
    assert res.provider_priority_order == ["apple_health", "garmin", "fitbit"]
    assert "Apple Health → Garmin → Fitbit" in res.explanation or "apple_health" in res.explanation


def test_freshness_factor_influences_resolution():
    """
    Scenario:
    Default priority: Apple Health → Garmin
    However, Apple Health data is 22 hours old (stale), while Garmin data is 5 minutes fresh.
    Freshness weighting (freshness_weight = 0.40) allows the fresh Garmin telemetry to win.
    """
    subject_id = uuid.uuid4()
    now = datetime(2026, 8, 27, 23, 0, 0, tzinfo=timezone.utc)

    policy = SourcePriorityPolicy(
        id=uuid.uuid4(),
        rules={
            "steps": SourcePriorityRule(
                metric="steps",
                provider_priority=["apple_health", "garmin"],
                freshness_max_age_seconds=86400,
                freshness_weight=0.40,  # Recency has high weight
                min_confidence=0.60
            )
        }
    )

    # Stale Apple Health (14 hours old on same date 2026-08-27)
    apple_stale = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=5000,
        unit="steps",
        measured_at_utc=now - timedelta(hours=14),
        source_provider=DeviceProvider.APPLE_HEALTH
    )

    # Fresh Garmin (5 mins old on same date 2026-08-27)
    garmin_fresh = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=6500,
        unit="steps",
        measured_at_utc=now - timedelta(minutes=5),
        source_provider=DeviceProvider.GARMIN
    )


    resolved = ConfigurableSourcePriorityEngine.resolve_competing_metrics(
        metrics=[apple_stale, garmin_fresh],
        policy=policy,
        reference_time=now
    )

    assert len(resolved) == 1
    res = resolved[0]
    # Fresh Garmin overcomes stale #1 priority
    assert res.primary_provider == "garmin"
    assert res.selected_metric.value == 6500


def test_confidence_filtering_rejects_low_precision_candidate():
    """
    Scenario:
    Provider A has priority, but reports low confidence (0.40 < min_confidence 0.60).
    Provider B has lower priority, but high confidence (0.95).
    System selects Provider B and rejects Provider A.
    """
    subject_id = uuid.uuid4()
    now = datetime(2026, 8, 27, 18, 0, 0, tzinfo=timezone.utc)

    policy = SourcePriorityPolicy(
        id=uuid.uuid4(),
        rules={
            "heart_rate": SourcePriorityRule(
                metric="heart_rate",
                provider_priority=["apple_health", "garmin"],
                min_confidence=0.60
            )
        }
    )

    # Apple Health with poor optical contact (confidence 0.40)
    apple_low_conf = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=110,
        unit="bpm",
        measured_at_utc=now,
        source_provider=DeviceProvider.APPLE_HEALTH,
        metadata={"confidence": 0.40}
    )

    # Garmin chest strap / optical with high precision (confidence 0.95)
    garmin_high_conf = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=72,
        unit="bpm",
        measured_at_utc=now,
        source_provider=DeviceProvider.GARMIN,
        metadata={"confidence": 0.95}
    )

    resolved = ConfigurableSourcePriorityEngine.resolve_competing_metrics(
        metrics=[apple_low_conf, garmin_high_conf],
        policy=policy,
        reference_time=now
    )

    assert len(resolved) == 1
    res = resolved[0]
    assert res.primary_provider == "garmin"
    assert res.selected_metric.value == 72
    assert res.competing_scores["apple_health"] == 0.0  # Rejected by confidence gate


def test_dynamic_policy_reconfiguration():
    """
    Verifies that policies can be dynamically modified at runtime without global hardcoding.
    """
    policy = SourcePriorityPolicy.create_default()

    # Dynamically change sleep priority to: Garmin → Oura → Apple Health
    policy.set_rule(
        SourcePriorityRule(
            metric="sleep_duration",
            provider_priority=["garmin", "oura", "apple_health"],
            freshness_weight=0.10,
            min_confidence=0.70
        )
    )

    rule = policy.get_rule_for_metric("sleep_duration")
    assert rule.provider_priority == ["garmin", "oura", "apple_health"]
    assert rule.get_provider_rank("garmin") == 0
    assert rule.get_provider_rank("oura") == 1
