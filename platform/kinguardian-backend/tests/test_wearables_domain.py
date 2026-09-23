"""
Wearable Domain Unit Tests.
Tests the pure domain layer for Wearables:
- Entities & WearableIdentity Aggregate Root
- Value Objects & Invariants
- Anomaly Policies (Activity, Sleep, Recovery)
- In-memory Repository
- Pure Domain Services
- Domain Events
"""

import pytest
import uuid
from datetime import datetime

from app.domains.wearable.entities import (
    WearableIdentity,
    WearableDeviceConnection,
    WearableDailySummary,
    WearableMetric
)
from app.domains.wearable.value_objects import (
    DeviceProvider,
    ConnectionStatus,
    AnomalySeverity,
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals,
    AnomalyThreshold,
    WearableMetricType
)

from app.domains.wearable.policies import (
    ActivityAnomalyPolicy,
    SleepDisruptionPolicy,
    AutonomicRecoveryPolicy
)
from app.domains.wearable.repositories import InMemoryWearableRepository
from app.domains.wearable.services import WearableDomainService
from app.domains.wearable.events import (
    WearableDeviceConnectedEvent,
    WearableDataSyncedEvent,
    WearableAnomalyDetectedEvent
)


def test_wearable_identity_aggregate_root():
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    identity = WearableIdentity(
        subject_id=subject_id,
        family_id=family_id,
        baseline_step_goal=5000,
        baseline_sleep_hours_goal=7.5
    )

    assert identity.external_wearable_user_id == f"kinguardian_subject_{subject_id}"
    assert len(identity.connections) == 0

    # Add Garmin device connection
    conn = WearableDeviceConnection(
        id="conn_garmin_01",
        provider=DeviceProvider.GARMIN,
        status=ConnectionStatus.ACTIVE,
        provider_user_id="garmin_user_123"
    )
    identity.add_or_update_connection(conn)
    assert len(identity.connections) == 1
    assert DeviceProvider.GARMIN in identity.active_providers

    # Baseline updates
    identity.update_baseline_goals(6000, 8.0)
    assert identity.baseline_step_goal == 6000
    assert identity.baseline_sleep_hours_goal == 8.0

    with pytest.raises(ValueError):
        identity.update_baseline_goals(500, 8.0)  # Too low


def test_value_objects_invariants():
    # ActivityMetrics
    act = ActivityMetrics(steps=6500, active_minutes=55, calories_kcal=2200.0)
    assert not act.is_sedentary

    sedentary = ActivityMetrics(steps=800, active_minutes=8)
    assert sedentary.is_sedentary

    with pytest.raises(ValueError):
        ActivityMetrics(steps=-10, active_minutes=10)

    # SleepArchitecture
    sleep = SleepArchitecture(total_sleep_minutes=450, sleep_score=85)
    assert sleep.total_sleep_hours == 7.5
    assert not sleep.is_deprived

    deprived = SleepArchitecture(total_sleep_minutes=240, sleep_score=45)
    assert deprived.is_deprived

    # RecoveryVitals
    rec = RecoveryVitals(resting_heart_rate_bpm=62, spo2_percentage=98.0)
    assert not rec.is_hypoxemic

    hypoxic = RecoveryVitals(resting_heart_rate_bpm=88, spo2_percentage=89.5)
    assert hypoxic.is_hypoxemic


def test_activity_anomaly_policy():
    subject_id = uuid.uuid4()
    current_act = ActivityMetrics(steps=1200, active_minutes=12)
    baseline_steps = 5000

    diag = ActivityAnomalyPolicy.evaluate(
        subject_id=subject_id,
        current_activity=current_act,
        baseline_steps=baseline_steps
    )

    assert diag is not None
    assert diag.subject_id == subject_id
    assert diag.percentage_deviation == 76.0
    assert diag.severity == AnomalySeverity.WARNING
    assert "dropped by 76%" in diag.description


def test_sleep_and_recovery_policies():
    subject_id = uuid.uuid4()

    # Sleep Policy
    sleep = SleepArchitecture(total_sleep_minutes=240)  # 4 hours
    diag_sleep = SleepDisruptionPolicy.evaluate(
        subject_id=subject_id,
        current_sleep=sleep,
        baseline_sleep_hours=7.5
    )
    assert diag_sleep is not None
    assert diag_sleep.severity == AnomalySeverity.ATTENTION

    # Recovery Policy (Elevated HR & Hypoxia)
    rec_elevated = RecoveryVitals(resting_heart_rate_bpm=82, spo2_percentage=98.0)
    diag_hr = AutonomicRecoveryPolicy.evaluate(
        subject_id=subject_id,
        current_recovery=rec_elevated,
        baseline_resting_hr=64
    )
    assert diag_hr is not None
    assert diag_hr.severity == AnomalySeverity.WARNING

    rec_hypoxia = RecoveryVitals(resting_heart_rate_bpm=65, spo2_percentage=89.0)
    diag_hypoxia = AutonomicRecoveryPolicy.evaluate(
        subject_id=subject_id,
        current_recovery=rec_hypoxia
    )
    assert diag_hypoxia is not None
    assert diag_hypoxia.severity == AnomalySeverity.CRITICAL


@pytest.mark.asyncio
async def test_in_memory_wearable_repository_and_domain_service():
    repo = InMemoryWearableRepository()
    subject_id = uuid.uuid4()
    family_id = uuid.uuid4()

    identity = WearableIdentity(subject_id=subject_id, family_id=family_id)
    await repo.save_identity(identity)

    fetched_id = await repo.get_identity_by_subject(subject_id)
    assert fetched_id is not None
    assert fetched_id.subject_id == subject_id

    # Add historical daily summaries
    for day in range(1, 6):
        summary = WearableDailySummary(
            date=f"2026-08-0{day}",
            activity=ActivityMetrics(steps=5000 + day * 200, active_minutes=45),
            sleep=SleepArchitecture(total_sleep_minutes=420 + day * 10, sleep_score=80),
            recovery=RecoveryVitals(resting_heart_rate_bpm=64, spo2_percentage=98.0)
        )
        await repo.save_daily_summary(subject_id, summary)

    history = await repo.get_daily_summaries(subject_id, "2026-08-01", "2026-08-05")
    assert len(history) == 5

    # Compute rolling baselines
    avg_steps = WearableDomainService.calculate_rolling_step_baseline(history)
    assert avg_steps == 5600

    avg_sleep = WearableDomainService.calculate_rolling_sleep_baseline(history)
    assert avg_sleep == 7.5

    # Evaluate multi-metric anomalies for a new day with severe activity drop
    today_sum = WearableDailySummary(
        date="2026-08-06",
        activity=ActivityMetrics(steps=1400, active_minutes=15),
        sleep=SleepArchitecture(total_sleep_minutes=430),
        recovery=RecoveryVitals(resting_heart_rate_bpm=65, spo2_percentage=98.0)
    )

    anomalies = WearableDomainService.evaluate_all_anomalies(
        subject_id=subject_id,
        today_summary=today_sum,
        historical_summaries=history
    )
    assert len(anomalies) == 1
    assert anomalies[0].metric_name == "daily_steps"
    assert anomalies[0].percentage_deviation >= 70.0


def test_wearable_metric_model_and_supported_types():
    """
    Verifies WearableMetric normalized domain model and all 17 supported metric types:
    steps, distance, active_minutes, calories, heart_rate, resting_heart_rate,
    heart_rate_variability, sleep_duration, sleep_score, sleep_stages, respiratory_rate,
    weight, blood_oxygen, body_temperature, stress, workout, activity_level.
    """
    subject_id = uuid.uuid4()
    now = datetime.utcnow()

    # 1. Test all 17 metric types
    all_metric_types = [
        WearableMetricType.STEPS,
        WearableMetricType.DISTANCE,
        WearableMetricType.ACTIVE_MINUTES,
        WearableMetricType.CALORIES,
        WearableMetricType.HEART_RATE,
        WearableMetricType.RESTING_HEART_RATE,
        WearableMetricType.HEART_RATE_VARIABILITY,
        WearableMetricType.SLEEP_DURATION,
        WearableMetricType.SLEEP_SCORE,
        WearableMetricType.SLEEP_STAGES,
        WearableMetricType.RESPIRATORY_RATE,
        WearableMetricType.WEIGHT,
        WearableMetricType.BLOOD_OXYGEN,
        WearableMetricType.BODY_TEMPERATURE,
        WearableMetricType.STRESS,
        WearableMetricType.WORKOUT,
        WearableMetricType.ACTIVITY_LEVEL
    ]
    assert len(all_metric_types) == 17

    # 2. Instantiate representative metrics from varying providers
    step_metric = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=5420,
        unit="count",
        measured_at=now,
        source_provider=DeviceProvider.GARMIN,
        source_device="Garmin Venu 3",
        source_reference="garmin_act_20260827_01"
    )
    assert step_metric.subject_id == subject_id
    assert step_metric.metric_type == WearableMetricType.STEPS
    assert step_metric.value == 5420
    assert step_metric.unit == "count"
    assert step_metric.source_provider == DeviceProvider.GARMIN
    assert step_metric.source_device == "Garmin Venu 3"

    hrv_metric = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.HEART_RATE_VARIABILITY,
        value=48.5,
        unit="ms",
        measured_at=now,
        source_provider=DeviceProvider.OURA,
        source_device="Oura Ring Gen 3",
        source_reference="oura_hrv_epoch_9901"
    )
    assert hrv_metric.metric_type == WearableMetricType.HEART_RATE_VARIABILITY
    assert hrv_metric.value == 48.5
    assert hrv_metric.unit == "ms"

    spo2_metric = WearableMetric(
        subject_id=subject_id,
        metric_type="blood_oxygen",  # test string conversion
        value=98.0,
        measured_at=now,
        source_provider="apple_health",
        source_device="Apple Watch Series 9"
    )
    assert spo2_metric.metric_type == WearableMetricType.BLOOD_OXYGEN
    assert spo2_metric.source_provider == DeviceProvider.APPLE_HEALTH
    assert spo2_metric.unit == "percentage"

    # 3. Serialization to dict
    d = step_metric.to_dict()
    assert d["subject_id"] == str(subject_id)
    assert d["metric_type"] == "steps"
    assert d["value"] == 5420
    assert d["source_provider"] == "garmin"

