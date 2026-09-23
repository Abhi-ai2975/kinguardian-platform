"""
Wearable Domain Value Objects Module.
Provides immutable, self-validating Value Objects representing wearable providers,
biometric metrics, sleep architecture, recovery vitals, and anomaly thresholds.
"""

from dataclasses import dataclass
from enum import Enum
from typing import Optional, Dict, Any


class DeviceProvider(str, Enum):
    """Supported wearable device providers and health SDK aggregators."""
    GARMIN = "garmin"
    OURA = "oura"
    WHOOP = "whoop"
    SUUNTO = "suunto"
    POLAR = "polar"
    ULTRAHUMAN = "ultrahuman"
    STRAVA = "strava"
    FITBIT = "fitbit"
    APPLE_HEALTH = "apple_health"
    HEALTH_CONNECT = "health_connect"
    SAMSUNG_HEALTH = "samsung_health"
    UNKNOWN = "unknown"

    @classmethod
    def from_str(cls, value: str) -> "DeviceProvider":
        try:
            return cls(value.lower())
        except ValueError:
            return cls.UNKNOWN


class ConnectionStatus(str, Enum):
    """Lifecycle state of a wearable provider connection."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    ERROR = "error"
    REVOKED = "revoked"


class AnomalySeverity(str, Enum):
    """Clinical and alert severity of a detected biometric anomaly."""
    INFO = "info"
    ATTENTION = "attention"
    WARNING = "warning"
    CRITICAL = "critical"


@dataclass(frozen=True)
class ActivityMetrics:
    """Immutable value object representing physical movement and exertion."""
    steps: int
    active_minutes: int
    calories_kcal: Optional[float] = None
    distance_meters: Optional[float] = None
    floors_climbed: Optional[int] = None

    def __post_init__(self):
        if self.steps < 0:
            raise ValueError("Steps cannot be negative")
        if self.active_minutes < 0:
            raise ValueError("Active minutes cannot be negative")

    @property
    def is_sedentary(self) -> bool:
        return self.steps < 2000 and self.active_minutes < 15


@dataclass(frozen=True)
class SleepArchitecture:
    """Immutable value object representing nocturnal sleep stages and quality."""
    total_sleep_minutes: int
    deep_sleep_minutes: Optional[int] = None
    light_sleep_minutes: Optional[int] = None
    rem_sleep_minutes: Optional[int] = None
    awake_minutes: Optional[int] = None
    sleep_score: Optional[int] = None
    efficiency_percentage: Optional[float] = None

    def __post_init__(self):
        if self.total_sleep_minutes < 0:
            raise ValueError("Total sleep minutes cannot be negative")
        if self.sleep_score is not None and not (0 <= self.sleep_score <= 100):
            raise ValueError("Sleep score must be between 0 and 100")

    @property
    def total_sleep_hours(self) -> float:
        return round(self.total_sleep_minutes / 60.0, 1)

    @property
    def is_deprived(self) -> bool:
        return self.total_sleep_minutes < 300  # Less than 5 hours


@dataclass(frozen=True)
class RecoveryVitals:
    """Immutable value object representing autonomic recovery and cardiovascular vitals."""
    resting_heart_rate_bpm: Optional[int] = None
    hrv_rmssd_ms: Optional[float] = None
    spo2_percentage: Optional[float] = None
    skin_temp_celsius: Optional[float] = None
    recovery_score: Optional[int] = None
    respiratory_rate_bpm: Optional[float] = None

    def __post_init__(self):
        if self.resting_heart_rate_bpm is not None and self.resting_heart_rate_bpm <= 0:
            raise ValueError("Resting heart rate must be positive")
        if self.spo2_percentage is not None and not (50.0 <= self.spo2_percentage <= 100.0):
            raise ValueError("SpO2 percentage must be between 50 and 100")

    @property
    def is_hypoxemic(self) -> bool:
        return self.spo2_percentage is not None and self.spo2_percentage < 92.0


@dataclass(frozen=True)
class AnomalyThreshold:
    """Configurable threshold parameters for detecting biometric anomalies against baseline."""
    activity_drop_percentage: float = 35.0  # Alert if activity drops > 35% below baseline
    sleep_drop_percentage: float = 30.0     # Alert if sleep drops > 30% below baseline
    resting_hr_elevation_bpm: int = 12       # Alert if resting HR spikes by > 12 bpm
    min_baseline_days: int = 3              # Minimum historical days required to establish baseline


class WearableMetricType(str, Enum):
    """
    Standardized, normalized KinGuardian wearable biometric and activity metric types.
    Represents normalized measurements across all integrated hardware and aggregator providers.
    """
    STEPS = "steps"
    DISTANCE = "distance"
    ACTIVE_MINUTES = "active_minutes"
    CALORIES = "calories"
    HEART_RATE = "heart_rate"
    RESTING_HEART_RATE = "resting_heart_rate"
    HEART_RATE_VARIABILITY = "heart_rate_variability"
    SLEEP_DURATION = "sleep_duration"
    SLEEP_SCORE = "sleep_score"
    SLEEP_STAGES = "sleep_stages"
    RESPIRATORY_RATE = "respiratory_rate"
    WEIGHT = "weight"
    BLOOD_OXYGEN = "blood_oxygen"
    BODY_TEMPERATURE = "body_temperature"
    STRESS = "stress"
    WORKOUT = "workout"
    ACTIVITY_LEVEL = "activity_level"

    @classmethod
    def from_str(cls, val: str) -> "WearableMetricType":
        normalized = val.strip().lower()
        for member in cls:
            if member.value == normalized:
                return member
        raise ValueError(f"Unknown wearable metric type: {val}")


# Metric unit defaults for standard normalization
METRIC_UNIT_MAP: Dict[WearableMetricType, str] = {
    WearableMetricType.STEPS: "count",
    WearableMetricType.DISTANCE: "meters",
    WearableMetricType.ACTIVE_MINUTES: "minutes",
    WearableMetricType.CALORIES: "kcal",
    WearableMetricType.HEART_RATE: "bpm",
    WearableMetricType.RESTING_HEART_RATE: "bpm",
    WearableMetricType.HEART_RATE_VARIABILITY: "ms",
    WearableMetricType.SLEEP_DURATION: "seconds",
    WearableMetricType.SLEEP_SCORE: "score_0_100",
    WearableMetricType.SLEEP_STAGES: "json_summary",
    WearableMetricType.RESPIRATORY_RATE: "brpm",
    WearableMetricType.WEIGHT: "kg",
    WearableMetricType.BLOOD_OXYGEN: "percentage",
    WearableMetricType.BODY_TEMPERATURE: "celsius",
    WearableMetricType.STRESS: "score_0_100",
    WearableMetricType.WORKOUT: "event",
    WearableMetricType.ACTIVITY_LEVEL: "level",
}

