"""
Wearable Baseline Calculation Module.

Provides deterministic mathematical calculations of rolling baselines (7-day, 14-day, 30-day)
and derived baseline comparison observations.

CORE PRINCIPLE:
All numerical calculations and derived percentage comparisons are strictly deterministic backend code.
AI models explain the clinical context afterward without performing hallucinated arithmetic.
"""

from enum import IntEnum
from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import List, Sequence, Optional, Dict, Any
import uuid


class BaselineWindow(IntEnum):
    """Standard configurable baseline evaluation windows in days."""
    SEVEN_DAY = 7
    FOURTEEN_DAY = 14
    THIRTY_DAY = 30


@dataclass(frozen=True)
class WearableBaselineComparison:
    """
    Deterministic result of comparing an observed metric against a historical baseline window.
    """
    subject_id: uuid.UUID
    metric_name: str
    current_value: float
    baseline_value: float
    window_days: int
    percentage_deviation: float  # Signed (+/- percentage)
    percentage_abs: float        # Absolute percentage value for human text
    direction: str              # "below" | "above" | "at_baseline"
    derived_observation: str    # Deterministic text (e.g. "Activity is ~27% below the 30-day baseline.")
    unit: str = "count"
    sample_size: int = 0
    calculated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subject_id": str(self.subject_id),
            "metric_name": self.metric_name,
            "current_value": self.current_value,
            "baseline_value": self.baseline_value,
            "window_days": self.window_days,
            "percentage_deviation": round(self.percentage_deviation, 2),
            "percentage_abs": round(self.percentage_abs, 1),
            "direction": self.direction,
            "derived_observation": self.derived_observation,
            "unit": self.unit,
            "sample_size": self.sample_size,
            "calculated_at": self.calculated_at.isoformat()
        }


class WearableBaselineCalculator:
    """
    Deterministic baseline engine for health & wearable metrics.
    Calculates 7-day, 14-day, 30-day baselines and formatted derived observations.
    """

    METRIC_LABEL_MAP = {
        "steps": "Activity",
        "daily_steps": "Activity",
        "activity": "Activity",
        "sleep_duration": "Sleep duration",
        "sleep": "Sleep duration",
        "resting_heart_rate": "Resting heart rate",
        "heart_rate": "Heart rate",
        "hrv": "Heart rate variability",
        "heart_rate_variability": "Heart rate variability",
        "blood_oxygen": "Blood oxygen",
        "spo2": "Blood oxygen",
        "body_temperature": "Body temperature",
        "weight": "Body weight",
    }

    @classmethod
    def calculate_mean_baseline(cls, historical_values: Sequence[float]) -> float:
        """
        Calculates arithmetic mean baseline from valid numerical readings.
        """
        valid = [float(v) for v in historical_values if v is not None]
        if not valid:
            return 0.0
        return sum(valid) / len(valid)

    @classmethod
    def compare_to_baseline(
        cls,
        subject_id: uuid.UUID,
        metric_name: str,
        current_value: float,
        historical_values: Sequence[float],
        window_days: int = BaselineWindow.THIRTY_DAY,
        unit: str = "count",
        custom_display_name: Optional[str] = None
    ) -> WearableBaselineComparison:
        """
        Deterministically calculates baseline comparison and generates standardized derived observation text.

        Example:
        Baseline: 6,200 steps/day (30-day)
        Current: 4,500 steps/day
        -> Derived observation: "Activity is ~27% below the 30-day baseline."
        """
        cur = float(current_value)
        # Filter historical values up to window_days
        window_samples = [float(v) for v in historical_values[:window_days] if v is not None]
        sample_size = len(window_samples)

        if sample_size == 0 or (sample_size == 1 and window_samples[0] == 0.0):
            baseline = cur
            pct_dev = 0.0
            pct_abs = 0.0
            direction = "at_baseline"
        else:
            baseline = sum(window_samples) / float(sample_size)
            if baseline > 0.0:
                pct_dev = ((cur - baseline) / baseline) * 100.0
                pct_abs = abs(pct_dev)
            else:
                pct_dev = 0.0
                pct_abs = 0.0

            if round(pct_dev, 1) < -1.0:
                direction = "below"
            elif round(pct_dev, 1) > 1.0:
                direction = "above"
            else:
                direction = "at_baseline"

        # Construct deterministic derived observation string
        display_name = custom_display_name or cls.METRIC_LABEL_MAP.get(metric_name.lower(), metric_name.replace("_", " ").title())
        rounded_pct = int(round(pct_abs))

        if direction == "at_baseline":
            derived_obs = f"{display_name} is consistent with the {window_days}-day baseline."
        else:
            derived_obs = f"{display_name} is ~{rounded_pct}% {direction} the {window_days}-day baseline."

        return WearableBaselineComparison(
            subject_id=subject_id,
            metric_name=metric_name,
            current_value=cur,
            baseline_value=baseline,
            window_days=window_days,
            percentage_deviation=pct_dev,
            percentage_abs=pct_abs,
            direction=direction,
            derived_observation=derived_obs,
            unit=unit,
            sample_size=sample_size
        )

    @classmethod
    def calculate_multi_window_baselines(
        cls,
        subject_id: uuid.UUID,
        metric_name: str,
        current_value: float,
        historical_values: Sequence[float],
        windows: Sequence[int] = (BaselineWindow.SEVEN_DAY, BaselineWindow.FOURTEEN_DAY, BaselineWindow.THIRTY_DAY),
        unit: str = "count",
        custom_display_name: Optional[str] = None
    ) -> Dict[int, WearableBaselineComparison]:
        """
        Calculates configurable baseline comparisons across 7-day, 14-day, and 30-day windows simultaneously.
        """
        results: Dict[int, WearableBaselineComparison] = {}
        for w in windows:
            results[w] = cls.compare_to_baseline(
                subject_id=subject_id,
                metric_name=metric_name,
                current_value=current_value,
                historical_values=historical_values,
                window_days=w,
                unit=unit,
                custom_display_name=custom_display_name
            )
        return results
