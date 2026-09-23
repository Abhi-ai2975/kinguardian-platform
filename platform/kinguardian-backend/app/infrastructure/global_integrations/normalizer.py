"""
Observation Normalizer:
Transforms disparate vendor telemetry (Apple Health, Fitbit, Garmin, Oura, Google Health Connect,
and International SMART on FHIR Portals) into canonical NormalizedHealthObservation objects.
"""

from typing import Dict, Any, List, Optional
import uuid
from datetime import datetime, timezone

from app.infrastructure.global_integrations.models import (
    NormalizedHealthObservation,
    WearableProvider,
    HealthPortalProvider,
    ObservationCategory
)


LOINC_CODE_REGISTRY = {
    "heart_rate": ("8867-4", "Heart Rate", "bpm", ObservationCategory.VITAL_SIGNS),
    "resting_heart_rate": ("40443-4", "Resting Heart Rate", "bpm", ObservationCategory.VITAL_SIGNS),
    "hrv": ("80404-7", "Heart Rate Variability (SDNN/RMSSD)", "ms", ObservationCategory.RECOVERY),
    "spo2": ("2708-6", "Oxygen Saturation (SpO2)", "%", ObservationCategory.VITAL_SIGNS),
    "systolic_bp": ("8480-6", "Systolic Blood Pressure", "mmHg", ObservationCategory.VITAL_SIGNS),
    "diastolic_bp": ("8462-4", "Diastolic Blood Pressure", "mmHg", ObservationCategory.VITAL_SIGNS),
    "body_temperature": ("8310-5", "Body Temperature", "degC", ObservationCategory.VITAL_SIGNS),
    "steps": ("55423-8", "Daily Step Count", "steps", ObservationCategory.ACTIVITY),
    "sleep_duration": ("93832-4", "Sleep Duration", "minutes", ObservationCategory.SLEEP),
    "deep_sleep_duration": ("93831-6", "Deep Sleep Duration", "minutes", ObservationCategory.SLEEP),
    "respiratory_rate": ("9279-1", "Respiratory Rate", "breaths/min", ObservationCategory.VITAL_SIGNS)
}


class ObservationNormalizer:
    """
    Normalizes any raw vendor health payload into canonical NormalizedHealthObservation.
    Eliminates special-case logic across domain handlers.
    """

    @classmethod
    def normalize_metric(
        cls,
        subject_id: uuid.UUID,
        source_provider: str,
        metric_key: str,
        value: float,
        timestamp: datetime,
        device_model: Optional[str] = None,
        raw_metadata: Optional[Dict[str, Any]] = None
    ) -> NormalizedHealthObservation:
        """
        Maps a metric key to standardized LOINC code and units.
        """
        if metric_key not in LOINC_CODE_REGISTRY:
            # Fallback custom observation
            code_loinc = "CUSTOM-OBS"
            display_name = metric_key.replace("_", " ").title()
            unit = "count"
            category = ObservationCategory.VITAL_SIGNS
        else:
            code_loinc, display_name, unit, category = LOINC_CODE_REGISTRY[metric_key]

        return NormalizedHealthObservation(
            observation_id=f"obs_{uuid.uuid4().hex}",
            subject_id=subject_id,
            source_provider=source_provider,
            category=category,
            code_loinc=code_loinc,
            code_snomed=None,
            display_name=display_name,
            value_numeric=round(value, 2),
            unit=unit,
            effective_timestamp=timestamp,
            device_model=device_model,
            raw_metadata=raw_metadata or {}
        )

    @classmethod
    def normalize_apple_health_sample(
        cls,
        subject_id: uuid.UUID,
        sample: Dict[str, Any]
    ) -> NormalizedHealthObservation:
        """
        Normalizes an Apple HealthKit HKQuantitySample / HKCategorySample.
        """
        hk_type = sample.get("type", "HKQuantityTypeIdentifierHeartRate")
        type_mapping = {
            "HKQuantityTypeIdentifierHeartRate": "heart_rate",
            "HKQuantityTypeIdentifierRestingHeartRate": "resting_heart_rate",
            "HKQuantityTypeIdentifierHeartRateVariabilitySDNN": "hrv",
            "HKQuantityTypeIdentifierOxygenSaturation": "spo2",
            "HKQuantityTypeIdentifierStepCount": "steps",
            "HKCategoryTypeIdentifierSleepAnalysis": "sleep_duration"
        }
        metric_key = type_mapping.get(hk_type, "heart_rate")
        raw_val = float(sample.get("value", 0.0))
        
        # Scale SpO2 if expressed as fraction 0.0 - 1.0
        if metric_key == "spo2" and raw_val <= 1.0:
            raw_val *= 100.0

        ts_str = sample.get("startDate")
        ts = datetime.fromisoformat(ts_str.replace("Z", "+00:00")) if ts_str else datetime.now(timezone.utc)

        return cls.normalize_metric(
            subject_id=subject_id,
            source_provider=WearableProvider.APPLE_HEALTH.value,
            metric_key=metric_key,
            value=raw_val,
            timestamp=ts,
            device_model=sample.get("sourceRevision", {}).get("productType", "Apple Watch"),
            raw_metadata=sample
        )

    @classmethod
    def normalize_fitbit_sample(
        cls,
        subject_id: uuid.UUID,
        metric_type: str,
        entry: Dict[str, Any]
    ) -> NormalizedHealthObservation:
        """
        Normalizes a Fitbit Web API telemetry entry.
        """
        val = float(entry.get("value", 0.0))
        dt_str = entry.get("dateTime", datetime.now(timezone.utc).isoformat())
        ts = datetime.fromisoformat(dt_str) if "T" in dt_str else datetime.now(timezone.utc)

        return cls.normalize_metric(
            subject_id=subject_id,
            source_provider=WearableProvider.FITBIT.value,
            metric_key=metric_type,
            value=val,
            timestamp=ts,
            device_model="Fitbit Tracker",
            raw_metadata=entry
        )

    @classmethod
    def normalize_oura_sleep_sample(
        cls,
        subject_id: uuid.UUID,
        sleep_entry: Dict[str, Any]
    ) -> List[NormalizedHealthObservation]:
        """
        Normalizes an Oura Ring daily sleep entry into total sleep, deep sleep, and HRV.
        """
        observations = []
        day_str = sleep_entry.get("day", datetime.now(timezone.utc).date().isoformat())
        ts = datetime.now(timezone.utc)

        # 1. Total Sleep (seconds -> minutes)
        total_sec = float(sleep_entry.get("total_sleep_duration", 0))
        if total_sec > 0:
            observations.append(cls.normalize_metric(
                subject_id=subject_id,
                source_provider=WearableProvider.OURA.value,
                metric_key="sleep_duration",
                value=total_sec / 60.0,
                timestamp=ts,
                device_model="Oura Ring Gen3"
            ))

        # 2. Deep Sleep (seconds -> minutes)
        deep_sec = float(sleep_entry.get("deep_sleep_duration", 0))
        if deep_sec > 0:
            observations.append(cls.normalize_metric(
                subject_id=subject_id,
                source_provider=WearableProvider.OURA.value,
                metric_key="deep_sleep_duration",
                value=deep_sec / 60.0,
                timestamp=ts,
                device_model="Oura Ring Gen3"
            ))

        # 3. Average HRV
        avg_hrv = float(sleep_entry.get("average_hrv", 0))
        if avg_hrv > 0:
            observations.append(cls.normalize_metric(
                subject_id=subject_id,
                source_provider=WearableProvider.OURA.value,
                metric_key="hrv",
                value=avg_hrv,
                timestamp=ts,
                device_model="Oura Ring Gen3"
            ))

        return observations
