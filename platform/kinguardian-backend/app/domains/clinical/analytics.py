import uuid
import time
from typing import List, Dict, Any, Optional, Tuple

from datetime import datetime, timedelta
from pydantic import BaseModel, Field

from app.core.logging import get_logger
from app.domains.clinical.gateway import ClinicalRecordGateway
from app.domains.insights.baseline import BaselineService, DataPoint, MetricBaselineResult

logger = get_logger(__name__)


# ==========================================
# Derived Projection Schema
# ==========================================

class HealthMetricSnapshot(BaseModel):
    """
    health_metric_snapshots projection model.
    Derived on-demand from the FHIR source rather than redundantly duplicating raw observations.
    """
    id: uuid.UUID = Field(default_factory=uuid.uuid4)
    subject_id: uuid.UUID
    metric: str
    timestamp: datetime
    value: float
    unit: str
    source: str = "fhir_observation"
    baseline_value: Optional[float] = None
    created_at: datetime = Field(default_factory=datetime.now)


class MetricSeriesResponse(BaseModel):
    subject_id: uuid.UUID
    metric: str
    timeframe_days: int
    data_points: List[HealthMetricSnapshot]
    baseline_7d: Optional[MetricBaselineResult] = None
    baseline_14d: Optional[MetricBaselineResult] = None
    baseline_30d: Optional[MetricBaselineResult] = None


# ==========================================
# LOINC & FHIR Code Normalization Mapping
# ==========================================

LOINC_CODE_MAP = {
    # Blood Pressure Systolic
    "8480-6": ("blood_pressure_systolic", "mmHg"),
    "85354-9": ("blood_pressure_systolic", "mmHg"),
    "systolic_bp": ("blood_pressure_systolic", "mmHg"),
    "blood_pressure": ("blood_pressure_systolic", "mmHg"),

    # Blood Pressure Diastolic
    "8462-4": ("blood_pressure_diastolic", "mmHg"),
    "diastolic_bp": ("blood_pressure_diastolic", "mmHg"),

    # Heart Rate
    "8867-4": ("heart_rate", "bpm"),
    "heart_rate": ("heart_rate", "bpm"),

    # Body Weight
    "29463-7": ("weight", "kg"),
    "weight": ("weight", "kg"),

    # Blood Glucose
    "2339-0": ("glucose", "mg/dL"),
    "glucose": ("glucose", "mg/dL"),
    "fasting_glucose": ("glucose", "mg/dL"),

    # Physical Activity / Steps
    "55423-8": ("steps", "steps"),
    "steps": ("steps", "steps"),
    "step_count": ("steps", "steps"),
}


# ==========================================
# Health Analytics Service (Read Layer)
# ==========================================

class HealthAnalyticsService:
    """
    Read/Analytics Layer for Health Trends:
    Directly queries the authoritative FHIR source on-demand.
    Normalizes observations and derives statistical baselines in memory without redundantly
    persisting raw FHIR observations in the application database.
    """

    def __init__(
        self,
        gateway: ClinicalRecordGateway,
        baseline_service: Optional[BaselineService] = None,
        cache_ttl_seconds: int = 300
    ):
        self.gateway = gateway
        self.baseline_service = baseline_service or BaselineService()
        self.cache_ttl_seconds = cache_ttl_seconds
        self._cache: Dict[str, Tuple[float, List[Dict[str, Any]]]] = {}

    def _get_cached_observations(self, cache_key: str) -> Optional[List[Dict[str, Any]]]:
        if cache_key in self._cache:
            cached_time, data = self._cache[cache_key]
            if time.time() - cached_time < self.cache_ttl_seconds:
                return data
        return None

    def _set_cached_observations(self, cache_key: str, data: List[Dict[str, Any]]) -> None:
        self._cache[cache_key] = (time.time(), data)

    async def get_patient_metric_snapshots(
        self,
        fhir_patient_id: str,
        subject_id: uuid.UUID,
        metric: Optional[str] = None,
        timeframe_days: int = 30,
        auth_token: Optional[str] = None
    ) -> List[HealthMetricSnapshot]:
        """
        Fetches observations from FHIR source, normalizes into HealthMetricSnapshot models,
        and enriches with deterministic baseline values on-demand.
        """
        cache_key = f"{fhir_patient_id}:vitals"
        raw_obs = self._get_cached_observations(cache_key)

        if raw_obs is None:
            raw_obs = await self.gateway.get_observations(fhir_patient_id, auth_token=auth_token)
            self._set_cached_observations(cache_key, raw_obs)

        # 1. Parse and normalize observations
        cutoff_date = datetime.now() - timedelta(days=timeframe_days)
        snapshots: List[HealthMetricSnapshot] = []

        for obs in raw_obs:
            code = obs.get("code") or obs.get("type", "")
            mapping = LOINC_CODE_MAP.get(str(code).lower())
            if not mapping:
                continue

            normalized_metric, unit = mapping
            if metric and normalized_metric != metric:
                continue

            # Parse value
            val_raw = obs.get("value")
            val_float = None
            if isinstance(val_raw, (int, float)):
                val_float = float(val_raw)
            elif isinstance(val_raw, str):
                try:
                    if "/" in val_raw:
                        # Systolic / Diastolic
                        parts = val_raw.split("/")
                        val_float = float(parts[0]) if normalized_metric == "blood_pressure_systolic" else float(parts[1])
                    else:
                        val_float = float(val_raw)
                except (ValueError, IndexError):
                    continue

            if val_float is None:
                continue

            # Parse timestamp
            date_str = obs.get("date") or obs.get("effectiveDateTime")
            try:
                ts = datetime.fromisoformat(date_str.replace("Z", "+00:00")) if date_str else datetime.now()
            except (ValueError, AttributeError):
                ts = datetime.now()

            # Timezone-naive conversion for consistent calculation
            if ts.tzinfo is not None:
                ts = ts.replace(tzinfo=None)

            if ts < cutoff_date:
                continue

            snapshots.append(
                HealthMetricSnapshot(
                    subject_id=subject_id,
                    metric=normalized_metric,
                    timestamp=ts,
                    value=val_float,
                    unit=obs.get("unit") or unit,
                    source="fhir_observation"
                )
            )

        # Sort chronologically
        snapshots.sort(key=lambda s: s.timestamp)

        # 2. Derive baseline and attach baseline_value to each snapshot
        if snapshots:
            points = [DataPoint(timestamp=s.timestamp, value=s.value) for s in snapshots]
            baseline_res = self.baseline_service.calculate_baseline_from_points(
                metric_name=metric or "composite",
                points=points,
                timeframe_days=timeframe_days
            )
            for s in snapshots:
                s.baseline_value = baseline_res.mean

        return snapshots

    async def get_metric_series_with_baselines(
        self,
        fhir_patient_id: str,
        subject_id: uuid.UUID,
        metric: str,
        auth_token: Optional[str] = None
    ) -> MetricSeriesResponse:
        """
        Returns metric time series along with deterministic 7-day, 14-day, and 30-day baselines.
        """
        snapshots = await self.get_patient_metric_snapshots(
            fhir_patient_id=fhir_patient_id,
            subject_id=subject_id,
            metric=metric,
            timeframe_days=30,
            auth_token=auth_token
        )

        points = [DataPoint(timestamp=s.timestamp, value=s.value) for s in snapshots]
        multi_baselines = self.baseline_service.calculate_multi_window_baselines(metric, points)

        return MetricSeriesResponse(
            subject_id=subject_id,
            metric=metric,
            timeframe_days=30,
            data_points=snapshots,
            baseline_7d=multi_baselines.get("7_day"),
            baseline_14d=multi_baselines.get("14_day"),
            baseline_30d=multi_baselines.get("30_day")
        )
