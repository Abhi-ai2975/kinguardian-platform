"""
Wearable Health Data Normalizer Module.

Provides WearableMetricNormalizer to standardize multi-vendor wearable telemetry
across:
- units (count, bpm, meters, minutes, kg, %, celsius, ms)
- timestamps (epoch ms/sec, ISO 8601 strings, dates -> UTC datetime)
- provider names (Garmin, Apple Health, Fitbit, Oura, Whoop, etc. -> DeviceProvider)
- metric names (Vendor-specific keys -> WearableMetricType)
- missing values (Graceful fallback, sanitization, missingness flags)
- device identifiers (Model names, hardware identifiers, serials)
"""

import re
import uuid
from typing import Dict, Any, Optional, Tuple, List, Union
from datetime import datetime, timezone, date

from app.domains.wearables.domain.value_objects import (
    DeviceProvider,
    WearableMetricType,
    METRIC_UNIT_MAP
)
from app.domains.wearables.domain.entities import WearableMetric
from app.domains.wearables.domain.units import HealthUnitConverter, StandardUnit



class WearableMetricNormalizer:
    """
    Standardizes heterogeneous wearable telemetry into normalized KinGuardian domain models.
    Acts as an Anti-Corruption Layer (ACL) across Apple Health, Garmin, Fitbit, Oura, Whoop, and FHIR.
    """

    # Provider normalization patterns
    PROVIDER_MAP: Dict[str, DeviceProvider] = {
        "garmin": DeviceProvider.GARMIN,
        "garmin_connect": DeviceProvider.GARMIN,
        "garmin_health": DeviceProvider.GARMIN,
        "apple": DeviceProvider.APPLE_HEALTH,
        "apple_health": DeviceProvider.APPLE_HEALTH,
        "apple_watch": DeviceProvider.APPLE_HEALTH,
        "healthkit": DeviceProvider.APPLE_HEALTH,
        "fitbit": DeviceProvider.FITBIT,
        "fitbit_oauth": DeviceProvider.FITBIT,
        "oura": DeviceProvider.OURA,
        "oura_ring": DeviceProvider.OURA,
        "whoop": DeviceProvider.WHOOP,
        "whoop_4": DeviceProvider.WHOOP,
        "suunto": DeviceProvider.SUUNTO,
        "polar": DeviceProvider.POLAR,
        "ultrahuman": DeviceProvider.ULTRAHUMAN,
        "strava": DeviceProvider.STRAVA,
        "google_fit": DeviceProvider.HEALTH_CONNECT,
        "health_connect": DeviceProvider.HEALTH_CONNECT,
        "google_health_connect": DeviceProvider.HEALTH_CONNECT,
        "samsung": DeviceProvider.SAMSUNG_HEALTH,
        "samsung_health": DeviceProvider.SAMSUNG_HEALTH,
    }

    # Vendor-specific metric name patterns
    METRIC_NAME_MAP: Dict[str, WearableMetricType] = {
        # Steps
        "steps": WearableMetricType.STEPS,
        "step": WearableMetricType.STEPS,
        "step_count": WearableMetricType.STEPS,
        "daily_steps": WearableMetricType.STEPS,
        "hkquantitytypeidentifierstepcount": WearableMetricType.STEPS,
        "activities_steps": WearableMetricType.STEPS,
        "activities-steps": WearableMetricType.STEPS,
        # Distance
        "distance": WearableMetricType.DISTANCE,
        "distance_meters": WearableMetricType.DISTANCE,
        "distance_km": WearableMetricType.DISTANCE,
        "distance_miles": WearableMetricType.DISTANCE,
        "hkquantitytypeidentifierdistancewalkingrunning": WearableMetricType.DISTANCE,
        "activities_distance": WearableMetricType.DISTANCE,
        "activities-distance": WearableMetricType.DISTANCE,
        # Active Minutes
        "active_minutes": WearableMetricType.ACTIVE_MINUTES,
        "active_duration": WearableMetricType.ACTIVE_MINUTES,
        "active_duration_minutes": WearableMetricType.ACTIVE_MINUTES,
        "fairly_active_minutes": WearableMetricType.ACTIVE_MINUTES,
        "very_active_minutes": WearableMetricType.ACTIVE_MINUTES,
        "hkquantitytypeidentifierappleexercise_time": WearableMetricType.ACTIVE_MINUTES,
        "appleexercise_time": WearableMetricType.ACTIVE_MINUTES,
        # Calories
        "calories": WearableMetricType.CALORIES,
        "calories_burned": WearableMetricType.CALORIES,
        "calories_burned_kcal": WearableMetricType.CALORIES,
        "active_calories": WearableMetricType.CALORIES,
        "total_calories": WearableMetricType.CALORIES,
        "hkquantitytypeidentifieractiveenergyburned": WearableMetricType.CALORIES,
        "activeenergyburned": WearableMetricType.CALORIES,
        "activities_calories": WearableMetricType.CALORIES,
        "activities-calories": WearableMetricType.CALORIES,
        # Heart Rate
        "heart_rate": WearableMetricType.HEART_RATE,
        "hr": WearableMetricType.HEART_RATE,
        "pulse": WearableMetricType.HEART_RATE,
        "hkquantitytypeidentifierheartrate": WearableMetricType.HEART_RATE,
        "heartrate": WearableMetricType.HEART_RATE,
        "activities_heart": WearableMetricType.HEART_RATE,
        "activities-heart": WearableMetricType.HEART_RATE,
        # Resting Heart Rate
        "resting_heart_rate": WearableMetricType.RESTING_HEART_RATE,
        "resting_heart_rate_bpm": WearableMetricType.RESTING_HEART_RATE,
        "restingheartrate": WearableMetricType.RESTING_HEART_RATE,
        "rhr": WearableMetricType.RESTING_HEART_RATE,
        "hkquantitytypeidentifierrestingheartrate": WearableMetricType.RESTING_HEART_RATE,

        # Heart Rate Variability
        "hrv": WearableMetricType.HEART_RATE_VARIABILITY,
        "heart_rate_variability": WearableMetricType.HEART_RATE_VARIABILITY,
        "hrv_ms": WearableMetricType.HEART_RATE_VARIABILITY,
        "rmssd": WearableMetricType.HEART_RATE_VARIABILITY,
        "sdnn": WearableMetricType.HEART_RATE_VARIABILITY,
        "hkquantitytypeidentifierheartratevariabilitysdnn": WearableMetricType.HEART_RATE_VARIABILITY,
        # Sleep
        "sleep": WearableMetricType.SLEEP_DURATION,
        "sleep_duration": WearableMetricType.SLEEP_DURATION,
        "total_sleep_minutes": WearableMetricType.SLEEP_DURATION,
        "timeinbed": WearableMetricType.SLEEP_DURATION,
        "sleep-duration": WearableMetricType.SLEEP_DURATION,
        "sleep_score": WearableMetricType.SLEEP_SCORE,
        "sleep_quality_score": WearableMetricType.SLEEP_SCORE,
        "sleep_stages": WearableMetricType.SLEEP_STAGES,
        # Recovery & Vitals
        "spo2": WearableMetricType.BLOOD_OXYGEN,
        "spo2_percentage": WearableMetricType.BLOOD_OXYGEN,
        "blood_oxygen": WearableMetricType.BLOOD_OXYGEN,
        "oxygen_saturation": WearableMetricType.BLOOD_OXYGEN,
        "hkquantitytypeidentifieroxygensaturation": WearableMetricType.BLOOD_OXYGEN,
        "respiratory_rate": WearableMetricType.RESPIRATORY_RATE,
        "respiratory_rate_bpm": WearableMetricType.RESPIRATORY_RATE,
        "breaths_per_minute": WearableMetricType.RESPIRATORY_RATE,
        "hkquantitytypeidentifierrespiratoryrate": WearableMetricType.RESPIRATORY_RATE,
        "body_temperature": WearableMetricType.BODY_TEMPERATURE,
        "skin_temperature": WearableMetricType.BODY_TEMPERATURE,
        "skin_temperature_celsius": WearableMetricType.BODY_TEMPERATURE,
        "temperature": WearableMetricType.BODY_TEMPERATURE,
        "hkquantitytypeidentifierbodytemperature": WearableMetricType.BODY_TEMPERATURE,
        "stress": WearableMetricType.STRESS,
        "stress_score": WearableMetricType.STRESS,
        "weight": WearableMetricType.WEIGHT,
        "body_mass": WearableMetricType.WEIGHT,
        "hkquantitytypeidentifierbodymass": WearableMetricType.WEIGHT,
        "workout": WearableMetricType.WORKOUT,
        "activity_level": WearableMetricType.ACTIVITY_LEVEL
    }

    @classmethod
    def normalize_provider(cls, provider_raw: Optional[Union[str, DeviceProvider]]) -> DeviceProvider:
        """Normalizes heterogeneous vendor identifiers into standard DeviceProvider enum."""
        if not provider_raw:
            return DeviceProvider.UNKNOWN
        if isinstance(provider_raw, DeviceProvider):
            return provider_raw

        cleaned = str(provider_raw).lower().strip().replace("-", "_").replace(" ", "_")
        return cls.PROVIDER_MAP.get(cleaned, DeviceProvider.UNKNOWN)

    @classmethod
    def normalize_metric_type(cls, metric_raw: Union[str, WearableMetricType]) -> WearableMetricType:
        """Normalizes vendor-specific metric names/identifiers into standard WearableMetricType."""
        if isinstance(metric_raw, WearableMetricType):
            return metric_raw

        cleaned = str(metric_raw).lower().strip().replace("-", "_").replace(" ", "_")
        if cleaned in cls.METRIC_NAME_MAP:
            return cls.METRIC_NAME_MAP[cleaned]

        # Regex fallback for Apple HealthKit identifiers
        hk_clean = cleaned.replace("hkquantitytypeidentifier", "").replace("hkcategorytypeidentifier", "")
        if hk_clean in cls.METRIC_NAME_MAP:
            return cls.METRIC_NAME_MAP[hk_clean]

        for member in WearableMetricType:
            if member.value == cleaned:
                return member

        raise ValueError(f"Unsupported wearable metric name: '{metric_raw}'")

    @classmethod
    def normalize_timestamp(
        cls,
        timestamp_raw: Any,
        local_timezone: Optional[str] = None
    ) -> Tuple[datetime, str]:
        """
        Normalizes various timestamp representations (Epoch sec, ms, ISO strings, dates)
        to a strictly UTC timezone-aware datetime, while retaining local_timezone for client conversion.

        Returns:
            Tuple[datetime, str]: (measured_at_utc, local_timezone)
        """
        resolved_tz = local_timezone or "UTC"

        if timestamp_raw is None:
            return (datetime.now(timezone.utc), resolved_tz)

        if isinstance(timestamp_raw, datetime):
            if timestamp_raw.tzinfo is None:
                utc_dt = timestamp_raw.replace(tzinfo=timezone.utc)
            else:
                utc_dt = timestamp_raw.astimezone(timezone.utc)
            return (utc_dt, resolved_tz)

        if isinstance(timestamp_raw, date):
            utc_dt = datetime(timestamp_raw.year, timestamp_raw.month, timestamp_raw.day, tzinfo=timezone.utc)
            return (utc_dt, resolved_tz)

        # Numeric epoch timestamp
        if isinstance(timestamp_raw, (int, float)):
            # Distinguish milliseconds vs seconds (ms > 1e11)
            if timestamp_raw > 1e11:
                utc_dt = datetime.fromtimestamp(timestamp_raw / 1000.0, tz=timezone.utc)
            else:
                utc_dt = datetime.fromtimestamp(timestamp_raw, tz=timezone.utc)
            return (utc_dt, resolved_tz)

        # String representation
        ts_str = str(timestamp_raw).strip()
        # Handle pure numeric strings
        if ts_str.isdigit():
            val = int(ts_str)
            if val > 1e11:
                utc_dt = datetime.fromtimestamp(val / 1000.0, tz=timezone.utc)
            else:
                utc_dt = datetime.fromtimestamp(val, tz=timezone.utc)
            return (utc_dt, resolved_tz)

        # Handle Date only (YYYY-MM-DD)
        if re.match(r"^\d{4}-\d{2}-\d{2}$", ts_str):
            d = datetime.strptime(ts_str, "%Y-%m-%d")
            return (d.replace(tzinfo=timezone.utc), resolved_tz)

        # Handle ISO-8601 with trailing Z or timezone offsets
        try:
            # Replace Z with +00:00 for fromisoformat compatibility in Python 3.10
            clean_iso = ts_str.replace("Z", "+00:00")
            dt = datetime.fromisoformat(clean_iso)
            if dt.tzinfo is None:
                utc_dt = dt.replace(tzinfo=timezone.utc)
            else:
                utc_dt = dt.astimezone(timezone.utc)
            return (utc_dt, resolved_tz)
        except Exception:
            pass

        return (datetime.now(timezone.utc), resolved_tz)

    @classmethod
    def normalize_unit(cls, metric_type: WearableMetricType, unit_raw: Optional[str] = None) -> str:
        """
        Returns the standardized measurement unit for the normalized metric type.
        Example: Steps -> 'count'
        """
        standard_unit = METRIC_UNIT_MAP.get(metric_type, "unit")
        if not unit_raw:
            return standard_unit

        u_lower = unit_raw.lower().strip()
        if metric_type == WearableMetricType.STEPS:
            return "count"
        if metric_type == WearableMetricType.DISTANCE:
            return "meters"
        if metric_type in (WearableMetricType.HEART_RATE, WearableMetricType.RESTING_HEART_RATE):
            return "bpm"
        if metric_type == WearableMetricType.HEART_RATE_VARIABILITY:
            return "ms"
        if metric_type == WearableMetricType.BLOOD_OXYGEN:
            return "percentage"
        if metric_type == WearableMetricType.BODY_TEMPERATURE:
            return "celsius"
        if metric_type == WearableMetricType.WEIGHT:
            return "kg"
        if metric_type in (WearableMetricType.ACTIVE_MINUTES, WearableMetricType.SLEEP_DURATION):
            return "minutes" if "min" in u_lower else standard_unit

        return standard_unit

    @classmethod
    def normalize_value(
        cls,
        metric_type: WearableMetricType,
        value_raw: Any,
        source_unit: Optional[str] = None
    ) -> Any:
        """
        Normalizes numeric values using HealthUnitConverter as the centralized conversion engine.
        Handles missing values, unit scaling, and conversions consistently across all providers.
        """
        if value_raw is None or value_raw == "" or str(value_raw).lower() in ("null", "none", "nan"):
            return 0 if metric_type in (WearableMetricType.STEPS, WearableMetricType.ACTIVE_MINUTES) else None

        # 1. Discrete Counts
        if metric_type == WearableMetricType.STEPS:
            return HealthUnitConverter.to_count(value_raw)

        # 2. Distance
        if metric_type == WearableMetricType.DISTANCE:
            return HealthUnitConverter.to_meters(value_raw, source_unit=source_unit)

        # 3. Weight / Mass
        if metric_type == WearableMetricType.WEIGHT:
            return HealthUnitConverter.to_kilograms(value_raw, source_unit=source_unit)

        # 4. Temperature
        if metric_type == WearableMetricType.BODY_TEMPERATURE:
            return HealthUnitConverter.to_celsius(value_raw, source_unit=source_unit)

        # 5. Blood Oxygen (SpO2)
        if metric_type == WearableMetricType.BLOOD_OXYGEN:
            return HealthUnitConverter.to_percentage(value_raw, source_unit=source_unit)

        # 6. Cardiovascular Vitals
        if metric_type in (WearableMetricType.HEART_RATE, WearableMetricType.RESTING_HEART_RATE):
            return HealthUnitConverter.to_bpm(value_raw, source_unit=source_unit)

        if metric_type == WearableMetricType.HEART_RATE_VARIABILITY:
            return HealthUnitConverter.to_hrv_ms(value_raw, source_unit=source_unit)

        # 7. Duration / Active Minutes / Sleep
        if metric_type in (WearableMetricType.ACTIVE_MINUTES, WearableMetricType.SLEEP_DURATION):
            return HealthUnitConverter.to_minutes(value_raw, source_unit=source_unit)

        # 8. Energy / Calories
        if metric_type == WearableMetricType.CALORIES:
            return HealthUnitConverter.to_kcal(value_raw, source_unit=source_unit)

        # General scalar fallback
        try:
            return float(value_raw)
        except (ValueError, TypeError):
            return value_raw

    @classmethod
    def normalize_device_info(
        cls,
        device_raw: Any,
        provider: Optional[DeviceProvider] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Extracts sanitized (device_name, device_id) from raw vendor hardware strings or dictionaries.
        Examples:
        - "Garmin Venu 3 (006-B4254-00)" -> ("Garmin Venu 3", "006-B4254-00")
        - "Apple Watch Series 9 (Watch7,5)" -> ("Apple Watch Series 9", "Watch7,5")
        - {"model": "Fitbit Charge 6", "id": "FB423"} -> ("Fitbit Charge 6", "FB423")
        """
        if not device_raw:
            fallback_name = provider.value.replace("_", " ").title() if provider and provider != DeviceProvider.UNKNOWN else None
            return (fallback_name, None)

        if isinstance(device_raw, dict):
            name = device_raw.get("name") or device_raw.get("model") or device_raw.get("device_name")
            dev_id = device_raw.get("id") or device_raw.get("device_id") or device_raw.get("serial_number")
            return (str(name).strip() if name else None, str(dev_id).strip() if dev_id else None)

        dev_str = str(device_raw).strip()
        # Parse "Model Name (Identifier)" pattern
        match = re.match(r"^(.*?)\s*\((.*?)\)$", dev_str)
        if match:
            return (match.group(1).strip(), match.group(2).strip())

        return (dev_str, None)

    @classmethod
    def normalize(
        cls,
        subject_id: uuid.UUID,
        raw_measurement: Dict[str, Any],
        local_timezone: Optional[str] = None
    ) -> WearableMetric:
        """
        Normalizes a single vendor measurement into a standard KinGuardian WearableMetric domain model.
        Guarantees measured_at_utc in UTC and preserves local_timezone.
        """
        # 1. Normalize Provider
        raw_provider = raw_measurement.get("provider") or raw_measurement.get("source_provider") or raw_measurement.get("source")
        provider = cls.normalize_provider(raw_provider)

        # 2. Normalize Metric Type
        raw_metric = raw_measurement.get("metric") or raw_measurement.get("metric_type") or raw_measurement.get("type") or raw_measurement.get("name")
        metric_type = cls.normalize_metric_type(str(raw_metric))

        # 3. Normalize Unit
        raw_unit = raw_measurement.get("unit") or raw_measurement.get("units")
        unit = cls.normalize_unit(metric_type, raw_unit)

        # 4. Normalize Value with conversion & missing value handling
        raw_val = raw_measurement.get("value") if "value" in raw_measurement else raw_measurement.get("val")
        if raw_val is None:
            # Check if key itself matches metric name
            raw_val = raw_measurement.get(metric_type.value)
        value = cls.normalize_value(metric_type, raw_val, source_unit=raw_unit)

        # 5. Normalize Timestamp strictly to UTC while retaining local timezone
        raw_tz = raw_measurement.get("local_timezone") or raw_measurement.get("timezone") or local_timezone or "UTC"
        raw_time = (
            raw_measurement.get("measured_at_utc")
            or raw_measurement.get("measured_at")
            or raw_measurement.get("timestamp")
            or raw_measurement.get("date")
            or raw_measurement.get("time")
        )
        measured_at_utc, resolved_tz = cls.normalize_timestamp(raw_time, local_timezone=raw_tz)

        # 6. Normalize Device Information
        raw_device = raw_measurement.get("device") or raw_measurement.get("source_device") or raw_measurement.get("device_name")
        device_name, device_id = cls.normalize_device_info(raw_device, provider=provider)

        # 7. Source Reference
        source_ref = raw_measurement.get("source_reference") or raw_measurement.get("id") or raw_measurement.get("reference")

        metadata = raw_measurement.get("metadata", {})
        if device_id:
            metadata["device_id"] = device_id

        return WearableMetric(
            subject_id=subject_id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            measured_at_utc=measured_at_utc,
            local_timezone=resolved_tz,
            source_provider=provider,
            source_device=device_name,
            source_reference=str(source_ref) if source_ref else None,
            metadata=metadata
        )

    @classmethod
    def normalize_batch(
        cls,
        subject_id: uuid.UUID,
        raw_measurements: List[Dict[str, Any]],
        local_timezone: Optional[str] = None
    ) -> List[WearableMetric]:
        """Normalizes an entire batch of heterogeneous telemetry records."""
        return [cls.normalize(subject_id, m, local_timezone=local_timezone) for m in raw_measurements]

