import pytest
from datetime import datetime, timedelta

from app.domains.insights.baseline import (
    DataPoint,
    BaselineCalculator,
    BaselineService,
    MetricBaselineResult,
    BaselineComparison
)


def test_deterministic_7d_14d_30d_baseline_calculations():
    """
    Verifies that BaselineCalculator computes reproducible, deterministic statistics:
    mean, median, std_dev, min, max, percentiles (p25/p75), IQR, and slope.
    """
    now = datetime.now()
    # Create 30 consecutive daily step readings (5000 -> 7900 steps)
    points = [
        DataPoint(
            timestamp=now - timedelta(days=29 - i),
            value=5000.0 + (i * 100.0)
        )
        for i in range(30)
    ]

    service = BaselineService()
    baselines = service.calculate_multi_window_baselines("steps", points)

    # 1. 7-Day Baseline
    b7 = baselines["7_day"]
    assert b7.metric_name == "steps"
    assert b7.timeframe_days == 7
    assert b7.sample_count == 7
    assert b7.mean == pytest.approx(7600.0, 50.0)
    assert b7.min_value >= 7300.0
    assert b7.max_value <= 7900.0
    assert b7.trend_direction == "increasing"
    assert b7.trend_slope > 0
    assert b7.is_sufficient_data is True

    # 2. 14-Day Baseline
    b14 = baselines["14_day"]
    assert b14.timeframe_days == 14
    assert b14.sample_count == 14
    assert b14.mean == pytest.approx(7250.0, 50.0)
    assert b14.p75 > b14.p25
    assert b14.iqr > 0

    # 3. 30-Day Baseline
    b30 = baselines["30_day"]
    assert b30.timeframe_days == 30
    assert b30.sample_count == 30
    assert b30.mean == pytest.approx(6450.0, 50.0)
    assert b30.min_value == 5000.0
    assert b30.max_value == 7900.0


def test_baseline_measurement_comparison_and_anomaly_detection():
    """
    Verifies deterministic statistical comparison against baseline (z-score, bounds, anomaly detection).
    """
    now = datetime.now()
    # Systolic blood pressure with normal baseline: mean ~ 120, std ~ 3.5
    normal_bp_values = [118.0, 120.0, 122.0, 119.0, 121.0, 120.0, 118.0]
    points = [
        DataPoint(timestamp=now - timedelta(days=6 - i), value=val)
        for i, val in enumerate(normal_bp_values)
    ]

    service = BaselineService()
    baseline = service.calculate_baseline_from_points("systolic_bp", points, timeframe_days=7)
    assert baseline.mean == pytest.approx(119.7, 0.5)
    assert baseline.std_dev > 0

    # 1. Normal reading (120.5 mmHg)
    comp_normal = service.evaluate_measurement(120.5, baseline)
    assert comp_normal.status == "within_baseline"
    assert comp_normal.is_outlier is False
    assert abs(comp_normal.z_score) < 1.0

    # 2. Mild deviation (121.5 mmHg)
    comp_mild = service.evaluate_measurement(121.5, baseline)
    assert comp_mild.status == "mild_deviation"
    assert comp_mild.is_outlier is False
    assert 1.0 <= comp_mild.z_score < 2.0

    # 3. Significant Anomaly / Hypertensive Spike (150 mmHg)
    comp_spike = service.evaluate_measurement(150.0, baseline)
    assert comp_spike.status == "significant_anomaly"
    assert comp_spike.is_outlier is True
    assert comp_spike.z_score >= 2.0
    assert comp_spike.current_value > baseline.anomaly_threshold_upper


def test_empty_dataset_and_insufficient_samples():
    """
    Verifies graceful deterministic handling for empty or insufficient sample datasets.
    """
    service = BaselineService()

    # Empty data points
    b_empty = service.calculate_baseline_from_points("glucose", [], timeframe_days=7)
    assert b_empty.sample_count == 0
    assert b_empty.mean == 0.0
    assert b_empty.is_sufficient_data is False

    # Single data point (insufficient for std dev)
    single_point = [DataPoint(timestamp=datetime.now(), value=105.0)]
    b_single = service.calculate_baseline_from_points("glucose", single_point, timeframe_days=7)
    assert b_single.sample_count == 1
    assert b_single.mean == 105.0
    assert b_single.std_dev == 0.0
    assert b_single.is_sufficient_data is False
