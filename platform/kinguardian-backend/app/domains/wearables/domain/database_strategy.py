"""
Wearable Data Database Strategy & Analytics Projection Management.

Enforces KinGuardian's database management strategy:
1. Do NOT immediately replicate every raw wearable record into PostgreSQL.
2. Flow: Open Wearables → Query recent data on-demand → KinGuardian analytics projection.
3. Materialize projections only when:
   - Dashboard latency requires it (fast sub-millisecond query response)
   - Trend detection requires historical data (7, 14, 30-day rolling baselines)
   - Cross-source correlation requires it (correlating wearables with meds, check-ins, appointments)

This keeps the primary application PostgreSQL database compact, fast, and manageable.
"""

from enum import Enum
from typing import List, Dict, Any, Optional, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timezone
import uuid

from app.domains.wearables.domain.entities import WearableDailySummary, WearableMetric
from app.domains.wearables.domain.value_objects import DeviceProvider, WearableMetricType
from app.domains.wearables.domain.aggregation_policy import SourceProvenance


class MaterializationReason(str, Enum):
    DASHBOARD_LATENCY = "dashboard_latency"                   # Fast rendering for care circle dashboard
    TREND_DETECTION = "trend_detection"                       # 7/14/30-day rolling baseline analytics
    CROSS_SOURCE_CORRELATION = "cross_source_correlation"     # Multi-source synthesis (meds + check-ins + vitals)
    CLINICAL_PERSISTENCE = "clinical_persistence"             # FHIR promotion for clinical anomalies


class StorageTier(str, Enum):
    OPEN_WEARABLES_RAW = "open_wearables_raw"                 # External high-frequency lake / edge stream
    EPHEMERAL_BUFFER = "ephemeral_buffer"                     # In-memory query buffer
    POSTGRESQL_PROJECTION = "postgresql_projection"           # Compact materialized daily/weekly projection in DB


@dataclass
class WearableAnalyticsProjection:
    """
    Compact, materialized aggregate projection stored in PostgreSQL.
    Replaces millions of raw intraday ticks with 1 lightweight daily record (~350 bytes).
    """
    id: uuid.UUID
    subject_id: uuid.UUID
    date: str                                                 # "YYYY-MM-DD"
    steps: Optional[int] = None
    active_minutes: Optional[int] = None
    distance_meters: Optional[float] = None
    calories_kcal: Optional[float] = None
    total_sleep_hours: Optional[float] = None
    sleep_score: Optional[int] = None
    deep_sleep_hours: Optional[float] = None
    rem_sleep_hours: Optional[float] = None
    resting_heart_rate_bpm: Optional[int] = None
    hrv_rmssd_ms: Optional[float] = None
    spo2_percentage: Optional[float] = None
    materialization_reason: MaterializationReason = MaterializationReason.DASHBOARD_LATENCY
    source_provenance: Optional[Dict[str, Any]] = None
    materialized_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": str(self.id),
            "subject_id": str(self.subject_id),
            "date": self.date,
            "activity": {
                "steps": self.steps,
                "active_minutes": self.active_minutes,
                "distance_meters": self.distance_meters,
                "calories_kcal": self.calories_kcal
            },
            "sleep": {
                "total_sleep_hours": self.total_sleep_hours,
                "sleep_score": self.sleep_score,
                "deep_sleep_hours": self.deep_sleep_hours,
                "rem_sleep_hours": self.rem_sleep_hours
            },
            "recovery": {
                "resting_heart_rate_bpm": self.resting_heart_rate_bpm,
                "hrv_rmssd_ms": self.hrv_rmssd_ms,
                "spo2_percentage": self.spo2_percentage
            },
            "materialization_reason": self.materialization_reason.value,
            "source_provenance": self.source_provenance,
            "materialized_at": self.materialized_at.isoformat()
        }


class ProjectionMaterializationPolicy:
    """
    Determines whether incoming or queried wearable telemetry should be materialized
    into PostgreSQL or left as an on-demand ephemeral query from Open Wearables.
    """

    @classmethod
    def evaluate_materialization_need(
        cls,
        is_dashboard_request: bool = False,
        is_trend_detection_needed: bool = False,
        is_cross_source_correlation_needed: bool = False,
        is_clinical_anomaly: bool = False,
        raw_telemetry_density: str = "high_frequency"
    ) -> Tuple[bool, Optional[MaterializationReason], StorageTier, str]:
        """
        Evaluates storage tier. Returns:
        (should_materialize, materialization_reason, storage_tier, rationale)
        """
        # 1. Clinical anomaly promotion (e.g. severe arrhythmia / desaturation)
        if is_clinical_anomaly:
            return (
                True,
                MaterializationReason.CLINICAL_PERSISTENCE,
                StorageTier.POSTGRESQL_PROJECTION,
                "Materialize: Clinical anomaly requires persistent audit record and FHIR synchronization."
            )

        # 2. Cross-Source Correlation (e.g. correlating Dad's steps + sleep with medication adherence)
        if is_cross_source_correlation_needed:
            return (
                True,
                MaterializationReason.CROSS_SOURCE_CORRELATION,
                StorageTier.POSTGRESQL_PROJECTION,
                "Materialize: Multi-source correlation engine requires unified daily projection."
            )

        # 3. Trend Detection (e.g. 7-day, 14-day, 30-day baseline engine)
        if is_trend_detection_needed:
            return (
                True,
                MaterializationReason.TREND_DETECTION,
                StorageTier.POSTGRESQL_PROJECTION,
                "Materialize: Trend/Baseline engine requires historical rollups to calculate baseline deviations."
            )

        # 4. Dashboard Latency Requirement
        if is_dashboard_request:
            return (
                True,
                MaterializationReason.DASHBOARD_LATENCY,
                StorageTier.POSTGRESQL_PROJECTION,
                "Materialize: Sub-second care circle dashboard rendering requires cached projection."
            )

        # Default: High-frequency routine streaming telemetry stays in Open Wearables without polluting PostgreSQL
        return (
            False,
            None,
            StorageTier.OPEN_WEARABLES_RAW,
            "Do NOT materialize: Routine high-frequency telemetry remains in Open Wearables to keep PostgreSQL manageable."
        )


class WearableDatabaseStrategyManager:
    """
    Orchestrates the ingestion lifecycle, transforming Open Wearables raw data
    into compact materialized projections only when required.
    """

    @classmethod
    def create_projection_from_daily_summary(
        cls,
        subject_id: uuid.UUID,
        summary: WearableDailySummary,
        reason: MaterializationReason,
        provenance: Optional[Dict[str, Any]] = None
    ) -> WearableAnalyticsProjection:
        """Transforms a domain daily summary into a compact PostgreSQL projection record."""
        return WearableAnalyticsProjection(
            id=uuid.uuid4(),
            subject_id=subject_id,
            date=summary.date,
            steps=summary.activity.steps if summary.activity else None,
            active_minutes=summary.activity.active_minutes if summary.activity else None,
            distance_meters=summary.activity.distance_meters if summary.activity else None,
            calories_kcal=summary.activity.calories_kcal if summary.activity else None,
            total_sleep_hours=summary.sleep.total_sleep_hours if summary.sleep else None,
            sleep_score=summary.sleep.sleep_score if summary.sleep else None,
            deep_sleep_hours=round(summary.sleep.deep_sleep_minutes / 60.0, 2) if (summary.sleep and summary.sleep.deep_sleep_minutes) else None,
            rem_sleep_hours=round(summary.sleep.rem_sleep_minutes / 60.0, 2) if (summary.sleep and summary.sleep.rem_sleep_minutes) else None,
            resting_heart_rate_bpm=summary.recovery.resting_heart_rate_bpm if summary.recovery else None,
            hrv_rmssd_ms=summary.recovery.hrv_rmssd_ms if summary.recovery else None,
            spo2_percentage=summary.recovery.spo2_percentage if summary.recovery else None,
            materialization_reason=reason,
            source_provenance=provenance or {"source_provider": summary.source_provider.value}
        )

    @classmethod
    def calculate_footprint_reduction(
        cls,
        raw_intraday_data_points_per_day: int = 1440  # 1 sample/minute for HR + steps + sensor data
    ) -> Dict[str, Any]:
        """Calculates storage efficiency gained by storing projections instead of raw time-series."""
        # 1,440 raw points * 150 bytes ~= 216 KB / day / user
        # 1 materialized daily projection ~= 350 bytes / day / user
        raw_bytes_per_day = raw_intraday_data_points_per_day * 150
        projection_bytes_per_day = 350
        reduction_percentage = ((raw_bytes_per_day - projection_bytes_per_day) / float(raw_bytes_per_day)) * 100.0

        return {
            "raw_intraday_points": raw_intraday_data_points_per_day,
            "estimated_raw_bytes_per_day": raw_bytes_per_day,
            "projection_bytes_per_day": projection_bytes_per_day,
            "storage_reduction_percentage": round(reduction_percentage, 2),
            "is_database_optimized": True
        }
