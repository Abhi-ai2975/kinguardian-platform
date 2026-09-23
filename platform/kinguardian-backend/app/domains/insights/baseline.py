import uuid
import math
import statistics
from typing import List, Dict, Any, Optional, Tuple
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field


from app.core.logging import get_logger
from app.domains.family.domain.interfaces import IFamilyRepository

logger = get_logger(__name__)


# ==========================================
# Deterministic Data Models
# ==========================================

class DataPoint(BaseModel):
    timestamp: datetime
    value: float
    metadata: Dict[str, Any] = Field(default_factory=dict)


class MetricBaselineResult(BaseModel):
    """
    Deterministic statistical baseline calculated over a defined window (7d, 14d, 30d).
    """
    metric_name: str
    timeframe_days: int
    sample_count: int
    mean: float
    median: float
    std_dev: float
    min_value: float
    max_value: float
    p25: float
    p75: float
    iqr: float
    trend_slope: float  # Linear regression slope per day
    trend_direction: str  # "stable" | "increasing" | "decreasing"
    anomaly_threshold_upper: float  # Mean + 2 * std_dev
    anomaly_threshold_lower: float  # Mean - 2 * std_dev
    is_sufficient_data: bool  # True if sample size meets minimum reliability threshold
    start_date: datetime
    end_date: datetime


class BaselineComparison(BaseModel):
    """
    Deterministic comparison of a current measurement against an established baseline.
    """
    metric_name: str
    current_value: float
    baseline_mean: float
    delta: float
    relative_change_pct: float
    z_score: float
    is_outlier: bool
    status: str  # "within_baseline" | "mild_deviation" | "significant_anomaly"


# ==========================================
# Deterministic Statistical Calculator
# ==========================================

class BaselineCalculator:
    """
    Pure, deterministic statistical computation functions.
    Ensures baseline mathematical calculations are reproducible and testable in pure code.
    """

    @staticmethod
    def calculate_percentile(sorted_data: List[float], percentile: float) -> float:
        """Calculates percentile using standard linear interpolation."""
        if not sorted_data:
            return 0.0
        if len(sorted_data) == 1:
            return sorted_data[0]

        index = (len(sorted_data) - 1) * percentile
        lower = math.floor(index)
        upper = math.ceil(index)
        weight = index - lower

        return round(sorted_data[lower] * (1.0 - weight) + sorted_data[upper] * weight, 2)

    @staticmethod
    def calculate_linear_trend_slope(points: List[DataPoint], start_time: datetime) -> float:
        """
        Calculates least-squares linear regression slope (units change per day).
        """
        if len(points) < 2:
            return 0.0

        # Convert timestamps to fractional days from start_time
        x_values = [(p.timestamp - start_time).total_seconds() / 86400.0 for p in points]
        y_values = [p.value for p in points]

        n = len(points)
        x_mean = sum(x_values) / n
        y_mean = sum(y_values) / n

        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, y_values))
        denominator = sum((x - x_mean) ** 2 for x in x_values)

        if denominator == 0:
            return 0.0

        slope = numerator / denominator
        return round(slope, 3)

    @classmethod
    def compute_baseline(
        cls,
        metric_name: str,
        points: List[DataPoint],
        timeframe_days: int,
        start_date: datetime,
        end_date: datetime,
        min_required_samples: int = 3
    ) -> MetricBaselineResult:
        """
        Computes deterministic descriptive statistics, percentiles, IQR, and trend slopes.
        """
        if not points:
            return MetricBaselineResult(
                metric_name=metric_name,
                timeframe_days=timeframe_days,
                sample_count=0,
                mean=0.0,
                median=0.0,
                std_dev=0.0,
                min_value=0.0,
                max_value=0.0,
                p25=0.0,
                p75=0.0,
                iqr=0.0,
                trend_slope=0.0,
                trend_direction="stable",
                anomaly_threshold_upper=0.0,
                anomaly_threshold_lower=0.0,
                is_sufficient_data=False,
                start_date=start_date,
                end_date=end_date
            )

        values = [p.value for p in points]
        sorted_vals = sorted(values)
        n = len(values)

        mean_val = round(statistics.mean(values), 2)
        median_val = round(statistics.median(values), 2)
        std_val = round(statistics.stdev(values), 2) if n > 1 else 0.0

        min_val = round(sorted_vals[0], 2)
        max_val = round(sorted_vals[-1], 2)

        p25 = cls.calculate_percentile(sorted_vals, 0.25)
        p75 = cls.calculate_percentile(sorted_vals, 0.75)
        iqr = round(p75 - p25, 2)

        slope = cls.calculate_linear_trend_slope(points, start_date)

        # Determine trend direction (significant if slope changes >= 1% of mean per day)
        slope_threshold = 0.01 * mean_val if mean_val > 0 else 0.1
        if slope > slope_threshold:
            trend_dir = "increasing"
        elif slope < -slope_threshold:
            trend_dir = "decreasing"
        else:
            trend_dir = "stable"

        upper_thresh = round(mean_val + (2.0 * std_val), 2)
        lower_thresh = round(max(0.0, mean_val - (2.0 * std_val)), 2)

        return MetricBaselineResult(
            metric_name=metric_name,
            timeframe_days=timeframe_days,
            sample_count=n,
            mean=mean_val,
            median=median_val,
            std_dev=std_val,
            min_value=min_val,
            max_value=max_val,
            p25=p25,
            p75=p75,
            iqr=iqr,
            trend_slope=slope,
            trend_direction=trend_dir,
            anomaly_threshold_upper=upper_thresh,
            anomaly_threshold_lower=lower_thresh,
            is_sufficient_data=n >= min_required_samples,
            start_date=start_date,
            end_date=end_date
        )

    @classmethod
    def compare_to_baseline(
        cls,
        current_value: float,
        baseline: MetricBaselineResult
    ) -> BaselineComparison:
        """
        Determines statistical deviation, z-score, and outlier status against baseline.
        """
        delta = round(current_value - baseline.mean, 2)
        rel_pct = round((delta / baseline.mean * 100.0), 1) if baseline.mean > 0 else 0.0

        if baseline.std_dev > 0:
            z_score = round(delta / baseline.std_dev, 2)
        else:
            z_score = 0.0

        abs_z = abs(z_score)
        if abs_z >= 2.0 or (current_value > baseline.anomaly_threshold_upper or current_value < baseline.anomaly_threshold_lower):
            status = "significant_anomaly"
            is_outlier = True
        elif abs_z >= 1.0:
            status = "mild_deviation"
            is_outlier = False
        else:
            status = "within_baseline"
            is_outlier = False


        return BaselineComparison(
            metric_name=baseline.metric_name,
            current_value=round(current_value, 2),
            baseline_mean=baseline.mean,
            delta=delta,
            relative_change_pct=rel_pct,
            z_score=z_score,
            is_outlier=is_outlier,
            status=status
        )


# ==========================================
# Baseline Service
# ==========================================

class BaselineService:
    """
    BaselineService:
    Calculates deterministic 7-day, 14-day, and 30-day health baselines from underlying repository data.
    """

    def __init__(self, family_repo: Optional[IFamilyRepository] = None):
        self.family_repo = family_repo

    def calculate_baseline_from_points(
        self,
        metric_name: str,
        points: List[DataPoint],
        timeframe_days: int = 7
    ) -> MetricBaselineResult:
        """
        Calculates deterministic baseline for given raw data points over 7d/14d/30d timeframe.
        """
        if points and points[0].timestamp.tzinfo is not None:
            now = datetime.now(timezone.utc)
        else:
            now = datetime.now()
        start = now - timedelta(days=timeframe_days)
        window_points = [p for p in points if p.timestamp > start]
        window_points.sort(key=lambda p: p.timestamp)




        return BaselineCalculator.compute_baseline(
            metric_name=metric_name,
            points=window_points,
            timeframe_days=timeframe_days,
            start_date=start,
            end_date=now
        )

    def calculate_multi_window_baselines(
        self,
        metric_name: str,
        points: List[DataPoint]
    ) -> Dict[str, MetricBaselineResult]:
        """
        Calculates 7-day, 14-day, and 30-day deterministic baselines in a single pass.
        """
        return {
            "7_day": self.calculate_baseline_from_points(metric_name, points, timeframe_days=7),
            "14_day": self.calculate_baseline_from_points(metric_name, points, timeframe_days=14),
            "30_day": self.calculate_baseline_from_points(metric_name, points, timeframe_days=30)
        }

    def evaluate_measurement(
        self,
        current_value: float,
        baseline: MetricBaselineResult
    ) -> BaselineComparison:
        """
        Compares measurement against baseline with statistical rigor (z-score, bounds).
        """
        return BaselineCalculator.compare_to_baseline(current_value, baseline)
