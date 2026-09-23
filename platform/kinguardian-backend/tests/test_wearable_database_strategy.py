"""
Wearable Data Database Strategy & Analytics Projection Test Suite.

Verifies:
1. Ingestion Flow:
   Open Wearables -> Query recent data -> KinGuardian analytics projection
2. Materializes projections when:
   - dashboard latency requires it
   - trend detection requires historical data
   - cross-source correlation requires it
3. Routine high-frequency telemetry is NOT replicated raw into PostgreSQL.
4. Database footprint reduction calculation (>99% reduction).
"""

import uuid
from datetime import datetime, timezone
import pytest

from app.domains.wearables.domain.entities import WearableDailySummary
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals
)
from app.domains.wearables.domain.database_strategy import (
    MaterializationReason,
    StorageTier,
    WearableAnalyticsProjection,
    ProjectionMaterializationPolicy,
    WearableDatabaseStrategyManager
)


def test_routine_telemetry_not_immediately_replicated_to_postgresql():
    """
    Scenario:
    Continuous minute-by-minute heart rate / step stream arrives from Open Wearables.
    No dashboard request, no trend computation, no cross-source correlation active.

    Invariant:
    - Does NOT materialize into PostgreSQL.
    - Tier: OPEN_WEARABLES_RAW
    - Keeps primary PostgreSQL DB manageable.
    """
    should_mat, reason, tier, rationale = ProjectionMaterializationPolicy.evaluate_materialization_need(
        is_dashboard_request=False,
        is_trend_detection_needed=False,
        is_cross_source_correlation_needed=False,
        is_clinical_anomaly=False
    )

    assert should_mat is False
    assert reason is None
    assert tier == StorageTier.OPEN_WEARABLES_RAW
    assert "Do NOT materialize" in rationale


def test_materialization_triggered_by_dashboard_latency():
    """
    Scenario:
    Coordinator opens the KinGuardian mobile dashboard.
    Sub-second latency requires compact daily projection.
    """
    should_mat, reason, tier, rationale = ProjectionMaterializationPolicy.evaluate_materialization_need(
        is_dashboard_request=True
    )

    assert should_mat is True
    assert reason == MaterializationReason.DASHBOARD_LATENCY
    assert tier == StorageTier.POSTGRESQL_PROJECTION


def test_materialization_triggered_by_trend_detection():
    """
    Scenario:
    KinGuardian Baseline Engine runs 30-day activity trend calculation for Dad.
    """
    should_mat, reason, tier, rationale = ProjectionMaterializationPolicy.evaluate_materialization_need(
        is_trend_detection_needed=True
    )

    assert should_mat is True
    assert reason == MaterializationReason.TREND_DETECTION
    assert tier == StorageTier.POSTGRESQL_PROJECTION


def test_materialization_triggered_by_cross_source_correlation():
    """
    Scenario:
    KinGuardian AI evaluates multi-source correlation:
    Wearables (Activity & Sleep) + Medication Adherence + Parent Check-in.
    """
    should_mat, reason, tier, rationale = ProjectionMaterializationPolicy.evaluate_materialization_need(
        is_cross_source_correlation_needed=True
    )

    assert should_mat is True
    assert reason == MaterializationReason.CROSS_SOURCE_CORRELATION
    assert tier == StorageTier.POSTGRESQL_PROJECTION


def test_create_and_serialize_analytics_projection():
    """
    Verifies that a compact projection is correctly synthesized from a daily summary.
    """
    subject_id = uuid.uuid4()
    summary = WearableDailySummary(
        date="2026-08-22",
        activity=ActivityMetrics(steps=6200, active_minutes=45, distance_meters=4900.0, calories_kcal=2100.0),
        sleep=SleepArchitecture(total_sleep_minutes=468, sleep_score=88, deep_sleep_minutes=96, rem_sleep_minutes=110),
        recovery=RecoveryVitals(resting_heart_rate_bpm=58, hrv_rmssd_ms=44.0, spo2_percentage=98.0),
        source_provider=DeviceProvider.GARMIN
    )

    proj = WearableDatabaseStrategyManager.create_projection_from_daily_summary(
        subject_id=subject_id,
        summary=summary,
        reason=MaterializationReason.DASHBOARD_LATENCY,
        provenance={"primary_source": "garmin", "devices": ["Garmin Venu"]}
    )

    assert proj.date == "2026-08-22"
    assert proj.steps == 6200
    assert proj.total_sleep_hours == 7.8
    assert proj.deep_sleep_hours == 1.6
    assert proj.resting_heart_rate_bpm == 58
    assert proj.materialization_reason == MaterializationReason.DASHBOARD_LATENCY

    proj_dict = proj.to_dict()
    assert proj_dict["activity"]["steps"] == 6200
    assert proj_dict["recovery"]["resting_heart_rate_bpm"] == 58
    assert proj_dict["materialization_reason"] == "dashboard_latency"


def test_storage_footprint_reduction_calculation():
    """
    Verifies that storing projections instead of raw high-frequency telemetry
    achieves >99% storage optimization.
    """
    savings = WearableDatabaseStrategyManager.calculate_footprint_reduction(raw_intraday_data_points_per_day=1440)

    assert savings["storage_reduction_percentage"] > 99.0
    assert savings["is_database_optimized"] is True
