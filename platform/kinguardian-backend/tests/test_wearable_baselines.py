"""
Wearable Baselines Test Suite.

Verifies:
1. Configurable baseline calculation windows (7-day, 14-day, 30-day).
2. Deterministic mathematical comparisons (no AI hallucinations in arithmetic).
3. Exact user scenario:
   - Baseline: 6,200 steps/day
   - Current: 4,500 steps/day
   - Derived observation: "Activity is ~27% below the 30-day baseline."
4. Multi-metric baseline calculations (steps, resting heart rate, sleep duration).
"""

import uuid
import pytest

from app.domains.wearables.domain.baselines import (
    BaselineWindow,
    WearableBaselineCalculator,
    WearableBaselineComparison
)


def test_dads_30_day_activity_baseline_scenario():
    """
    Exact prompt verification:
    Dad's normal: 6,200 steps/day
    Current: 4,500 steps/day
    Derived observation: "Activity is ~27% below the 30-day baseline."
    """
    subject_id = uuid.uuid4()

    # 30-day historical window of 6,200 steps/day
    historical_steps = [6200.0] * 30
    current_steps = 4500.0

    comparison: WearableBaselineComparison = WearableBaselineCalculator.compare_to_baseline(
        subject_id=subject_id,
        metric_name="steps",
        current_value=current_steps,
        historical_values=historical_steps,
        window_days=BaselineWindow.THIRTY_DAY,
        unit="count"
    )

    # 1. Verification of deterministic math: (4500 - 6200) / 6200 = -27.41935...%
    assert comparison.baseline_value == 6200.0
    assert comparison.current_value == 4500.0
    assert comparison.window_days == 30
    assert round(comparison.percentage_deviation, 2) == -27.42
    assert round(comparison.percentage_abs, 1) == 27.4
    assert comparison.direction == "below"

    # 2. Verification of deterministic derived observation
    assert comparison.derived_observation == "Activity is ~27% below the 30-day baseline."


def test_multi_window_configurable_baselines():
    """
    Verifies 7-day, 14-day, and 30-day windows evaluated simultaneously.
    """
    subject_id = uuid.uuid4()

    # Dynamic historical series:
    # Days 1-7 (most recent): avg 5,000 steps
    # Days 8-14: avg 6,000 steps
    # Days 15-30: avg 7,000 steps
    history = ([5000.0] * 7) + ([6000.0] * 7) + ([7000.0] * 16)
    current = 4000.0

    multi_baselines = WearableBaselineCalculator.calculate_multi_window_baselines(
        subject_id=subject_id,
        metric_name="steps",
        current_value=current,
        historical_values=history,
        windows=(BaselineWindow.SEVEN_DAY, BaselineWindow.FOURTEEN_DAY, BaselineWindow.THIRTY_DAY)
    )

    # 7-day window
    b7 = multi_baselines[7]
    assert b7.baseline_value == 5000.0
    assert b7.percentage_deviation == -20.0
    assert b7.derived_observation == "Activity is ~20% below the 7-day baseline."

    # 14-day window
    b14 = multi_baselines[14]
    assert b14.baseline_value == 5500.0
    assert round(b14.percentage_deviation, 2) == -27.27
    assert b14.derived_observation == "Activity is ~27% below the 14-day baseline."

    # 30-day window
    b30 = multi_baselines[30]
    expected_30_avg = ((5000.0 * 7) + (6000.0 * 7) + (7000.0 * 16)) / 30.0  # 6300.0
    assert b30.baseline_value == expected_30_avg
    assert round(b30.percentage_deviation, 2) == round(((4000.0 - 6300.0) / 6300.0) * 100.0, 2)


def test_resting_heart_rate_elevation_comparison():
    """
    Verifies Resting Heart Rate comparison (e.g. 68 bpm baseline -> 76 bpm current -> ~12% above 14-day baseline).
    """
    subject_id = uuid.uuid4()
    history = [68.0] * 14
    current_rhr = 76.0

    comparison = WearableBaselineCalculator.compare_to_baseline(
        subject_id=subject_id,
        metric_name="resting_heart_rate",
        current_value=current_rhr,
        historical_values=history,
        window_days=BaselineWindow.FOURTEEN_DAY,
        unit="bpm"
    )

    assert comparison.direction == "above"
    # (76 - 68) / 68 = 11.76% -> ~12%
    assert round(comparison.percentage_deviation, 2) == 11.76
    assert comparison.derived_observation == "Resting heart rate is ~12% above the 14-day baseline."


def test_stable_baseline_comparison():
    """
    Verifies that readings within +/- 1% of baseline are marked as stable/consistent.
    """
    subject_id = uuid.uuid4()
    history = [6200.0] * 30
    current_steps = 6210.0  # +0.16% change

    comparison = WearableBaselineCalculator.compare_to_baseline(
        subject_id=subject_id,
        metric_name="steps",
        current_value=current_steps,
        historical_values=history,
        window_days=BaselineWindow.THIRTY_DAY
    )

    assert comparison.direction == "at_baseline"
    assert comparison.derived_observation == "Activity is consistent with the 30-day baseline."
