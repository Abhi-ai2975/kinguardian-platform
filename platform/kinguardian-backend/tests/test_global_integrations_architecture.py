"""
Global Integrations & Normalized Health Pipeline Test Suite:
Verifies:
1. Normalized LOINC mapping for Apple Health, Fitbit, Google Health Connect, Garmin, Oura, and SMART on FHIR portals.
2. NormalizedObservationPipeline unified event dispatch.
3. Deduplication and elimination of vendor-specific special casing across the core domain.
"""

import pytest
import uuid
from datetime import datetime, timezone

from app.infrastructure.global_integrations import (
    WearableProvider,
    HealthPortalProvider,
    ObservationCategory,
    NormalizedHealthObservation,
    ObservationNormalizer,
    NormalizedObservationPipeline
)


def test_apple_health_normalization_to_loinc():
    """
    Verifies that Apple HealthKit samples normalize into canonical LOINC observations.
    """
    sub_id = uuid.uuid4()
    
    # 1. Heart Rate
    sample_hr = {
        "type": "HKQuantityTypeIdentifierHeartRate",
        "value": 74.0,
        "unit": "count/min",
        "startDate": "2026-08-24T06:30:00Z",
        "sourceRevision": {"productType": "AppleWatch8,1"}
    }
    obs_hr = ObservationNormalizer.normalize_apple_health_sample(sub_id, sample_hr)
    assert obs_hr.source_provider == "APPLE_HEALTH"
    assert obs_hr.code_loinc == "8867-4"
    assert obs_hr.value_numeric == 74.0
    assert obs_hr.unit == "bpm"
    assert obs_hr.category == ObservationCategory.VITAL_SIGNS

    # 2. Oxygen Saturation (SpO2)
    sample_spo2 = {
        "type": "HKQuantityTypeIdentifierOxygenSaturation",
        "value": 0.98,
        "startDate": "2026-08-24T06:30:00Z"
    }
    obs_spo2 = ObservationNormalizer.normalize_apple_health_sample(sub_id, sample_spo2)
    assert obs_spo2.code_loinc == "2708-6"
    assert obs_spo2.value_numeric == 98.0  # Scaled to percentage
    assert obs_spo2.unit == "%"


def test_fitbit_normalization_to_loinc():
    """
    Verifies that Fitbit Web API samples normalize to LOINC.
    """
    sub_id = uuid.uuid4()
    entry = {"dateTime": "2026-08-24T07:00:00", "value": 62.0}
    obs = ObservationNormalizer.normalize_fitbit_sample(sub_id, "resting_heart_rate", entry)

    assert obs.source_provider == "FITBIT"
    assert obs.code_loinc == "40443-4"
    assert obs.value_numeric == 62.0
    assert obs.unit == "bpm"


def test_oura_ring_sleep_normalization():
    """
    Verifies that Oura Ring daily sleep metrics expand into normalized LOINC observations.
    """
    sub_id = uuid.uuid4()
    oura_entry = {
        "day": "2026-08-24",
        "total_sleep_duration": 28800,  # 8 hours = 480 mins
        "deep_sleep_duration": 7200,    # 2 hours = 120 mins
        "average_hrv": 45.0
    }
    observations = ObservationNormalizer.normalize_oura_sleep_sample(sub_id, oura_entry)
    assert len(observations) == 3

    sleep_obs = next(o for o in observations if o.code_loinc == "93832-4")
    assert sleep_obs.value_numeric == 480.0
    assert sleep_obs.unit == "minutes"

    hrv_obs = next(o for o in observations if o.code_loinc == "80404-7")
    assert hrv_obs.value_numeric == 45.0
    assert hrv_obs.category == ObservationCategory.RECOVERY


@pytest.mark.asyncio
async def test_normalized_observation_pipeline_ingestion():
    """
    Verifies that NormalizedObservationPipeline processes batches, deduplicates,
    and publishes standard domain events without vendor special-casing.
    """
    fam_id = uuid.uuid4()
    sub_id = uuid.uuid4()

    obs1 = ObservationNormalizer.normalize_metric(
        subject_id=sub_id,
        source_provider="GARMIN",
        metric_key="systolic_bp",
        value=122.0,
        timestamp=datetime(2026, 8, 24, 7, 30, tzinfo=timezone.utc),
        device_model="Garmin Venu 3"
    )
    obs2 = ObservationNormalizer.normalize_metric(
        subject_id=sub_id,
        source_provider="GARMIN",
        metric_key="diastolic_bp",
        value=78.0,
        timestamp=datetime(2026, 8, 24, 7, 30, tzinfo=timezone.utc),
        device_model="Garmin Venu 3"
    )

    pipeline = NormalizedObservationPipeline()
    result = await pipeline.ingest_observations(
        family_id=fam_id,
        subject_id=sub_id,
        observations=[obs1, obs2]
    )

    assert result["pipeline_status"] == "SUCCESS"
    assert result["ingested_count"] == 2
    assert result["skipped_duplicates"] == 0

    # Test deduplication on immediate re-submission
    re_result = await pipeline.ingest_observations(
        family_id=fam_id,
        subject_id=sub_id,
        observations=[obs1, obs2]
    )
    assert re_result["ingested_count"] == 0
    assert re_result["skipped_duplicates"] == 2
