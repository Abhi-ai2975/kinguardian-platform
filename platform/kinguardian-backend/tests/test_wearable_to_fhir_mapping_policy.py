"""
Wearable to FHIR Mapping Policy Test Suite.

Verifies:
1. Routine high-frequency wearable telemetry is NOT automatically copied into FHIR.
2. Clinical relevance criteria for mapping to FHIR:
   - Anomaly-triggered events (Guardian AI diagnosis)
   - Vital sign threshold violations (Tachycardia, Hypoxemia, Fever)
   - Daily clinical summary aggregates (Daily resting HR, daily mobility aggregate)
   - Doctor / clinical care plan orders
3. Proper generation of FHIR R4 resources:
   - Observation (LOINC coded, UTC effectiveDateTime, standard valueQuantity)
   - Device (Hardware model, manufacturer, patient reference, UDI)
   - DeviceMetric (Metric capability, Device source reference, category measurement)
"""

import uuid
from datetime import datetime, timezone

from app.domains.wearables.domain.policies import (
    WearableToFHIRMappingPolicy,
    FHIRMappingRules
)
from app.domains.wearables.domain.entities import (
    WearableMetric,
    WearableAnomalyDiagnostic
)
from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType,
    AnomalySeverity
)


def test_high_frequency_routine_telemetry_excluded_from_fhir():
    """
    Verifies that routine high-frequency wearable telemetry
    remains strictly in the analytics layer and is NOT mapped to FHIR.
    """
    subject_id = uuid.uuid4()
    policy = WearableToFHIRMappingPolicy()

    # Routine minute-by-minute step count reading (e.g. 45 steps in a 1-minute window)
    minute_steps = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=45,
        unit="count",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.GARMIN
    )
    assert policy.should_map_to_fhir(minute_steps, is_daily_summary=False) is False

    # Routine normal heart rate reading (72 bpm, not an anomaly, not a summary)
    routine_hr = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.HEART_RATE,
        value=72,
        unit="bpm",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.APPLE_HEALTH
    )
    assert policy.should_map_to_fhir(routine_hr, is_daily_summary=False) is False


def test_clinical_anomaly_triggers_fhir_promotion():
    """
    Verifies that a Guardian AI / Insight Engine diagnosed anomaly
    promotes the metric to FHIR Observation.
    """
    subject_id = uuid.uuid4()
    policy = WearableToFHIRMappingPolicy()

    # Activity drop anomaly for Ramesh in Chennai
    ramesh_drop_metric = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.STEPS,
        value=1200,
        unit="count",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.GARMIN
    )

    anomaly = WearableAnomalyDiagnostic(
        id=uuid.uuid4(),
        subject_id=subject_id,
        metric_name="daily_steps",
        observed_value=1200.0,
        baseline_value=6000.0,
        percentage_deviation=80.0,
        severity=AnomalySeverity.WARNING,
        description="Daily steps plummeted by 80% compared to 6000 baseline."
    )

    assert policy.should_map_to_fhir(ramesh_drop_metric, anomaly=anomaly) is True


def test_vital_sign_threshold_violation_triggers_fhir():
    """
    Verifies that clinical vital sign boundary violations (tachycardia, hypoxia, fever)
    automatically trigger FHIR mapping.
    """
    subject_id = uuid.uuid4()
    policy = WearableToFHIRMappingPolicy()

    # 1. Tachycardia (135 bpm resting)
    tachycardia = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.RESTING_HEART_RATE,
        value=135,
        unit="bpm",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.GARMIN
    )
    assert policy.should_map_to_fhir(tachycardia) is True

    # 2. Severe nocturnal hypoxemia (86.5% SpO2)
    hypoxia = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.BLOOD_OXYGEN,
        value=86.5,
        unit="percentage",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.OURA
    )
    assert policy.should_map_to_fhir(hypoxia) is True

    # 3. High Fever (39.2 °C)
    fever = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.BODY_TEMPERATURE,
        value=39.2,
        unit="celsius",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.APPLE_HEALTH
    )
    assert policy.should_map_to_fhir(fever) is True


def test_daily_clinical_summary_and_doctor_orders():
    """
    Verifies daily summarized aggregates and doctor-ordered metrics map to FHIR.
    """
    subject_id = uuid.uuid4()
    policy = WearableToFHIRMappingPolicy()

    # Daily resting heart rate summary
    daily_rhr = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.RESTING_HEART_RATE,
        value=64,
        unit="bpm",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.GARMIN
    )
    assert policy.should_map_to_fhir(daily_rhr, is_daily_summary=True) is True

    # Doctor-ordered metric tracking
    doctor_ordered_sleep = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.SLEEP_DURATION,
        value=360,
        unit="minutes",
        measured_at_utc=datetime.now(timezone.utc),
        source_provider=DeviceProvider.OURA
    )
    assert policy.should_map_to_fhir(doctor_ordered_sleep, doctor_ordered=True) is True


def test_fhir_resource_generation_observation_device_metric():
    """
    Verifies accurate construction of FHIR Observation, Device, and DeviceMetric resources.
    """
    subject_id = uuid.uuid4()
    fhir_patient_id = "synthetic-pat-ramesh-001"
    policy = WearableToFHIRMappingPolicy()

    # 1. Device Resource
    device_res = policy.map_to_fhir_device(
        provider=DeviceProvider.GARMIN,
        device_name="Garmin Venu 3",
        device_id="006-B4254-00",
        fhir_patient_id=fhir_patient_id
    )
    assert device_res["resourceType"] == "Device"
    assert device_res["status"] == "active"
    assert device_res["manufacturer"] == "Garmin"
    assert device_res["patient"]["reference"] == f"Patient/{fhir_patient_id}"
    assert device_res["deviceName"][0]["name"] == "Garmin Venu 3"
    device_fhir_id = device_res["id"]

    # 2. DeviceMetric Resource
    dev_metric_res = policy.map_to_fhir_device_metric(
        metric_type=WearableMetricType.RESTING_HEART_RATE,
        device_fhir_id=device_fhir_id
    )
    assert dev_metric_res["resourceType"] == "DeviceMetric"
    assert dev_metric_res["source"]["reference"] == f"Device/{device_fhir_id}"
    assert dev_metric_res["type"]["coding"][0]["code"] == "40443-4"

    # 3. Observation Resource
    metric = WearableMetric(
        subject_id=subject_id,
        metric_type=WearableMetricType.RESTING_HEART_RATE,
        value=68,
        unit="bpm",
        measured_at_utc=datetime(2026, 8, 27, 8, 30, tzinfo=timezone.utc),
        source_provider=DeviceProvider.GARMIN,
        source_device="Garmin Venu 3"
    )

    obs_res = policy.map_to_fhir_observation(
        metric=metric,
        fhir_patient_id=fhir_patient_id,
        device_fhir_id=device_fhir_id
    )
    assert obs_res["resourceType"] == "Observation"
    assert obs_res["status"] == "final"
    assert obs_res["subject"]["reference"] == f"Patient/{fhir_patient_id}"
    assert obs_res["code"]["coding"][0]["code"] == "40443-4"
    assert obs_res["code"]["coding"][0]["system"] == "http://loinc.org"
    assert obs_res["valueQuantity"]["value"] == 68
    assert obs_res["valueQuantity"]["unit"] == "bpm"
    assert obs_res["effectiveDateTime"] == "2026-08-27T08:30:00+00:00"
    assert obs_res["device"]["reference"] == f"Device/{device_fhir_id}"
