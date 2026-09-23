"""
Wearable Domain Policies Module.
Encapsulates domain rules for baseline deviation detection, multi-metric correlation,
and consent-gated access policies.
"""

from typing import List, Optional
import uuid

from app.domains.wearables.domain.value_objects import (
    ActivityMetrics,
    SleepArchitecture,
    RecoveryVitals,
    AnomalySeverity,
    AnomalyThreshold
)
from app.domains.wearables.domain.entities import (
    WearableAnomalyDiagnostic,
    WearableDailySummary
)


class ActivityAnomalyPolicy:
    """
    Evaluates whether a care subject's daily physical activity has plummeted
    significantly below their rolling historical baseline (e.g. Ramesh in Chennai).
    """

    @classmethod
    def evaluate(
        cls,
        subject_id: uuid.UUID,
        current_activity: ActivityMetrics,
        baseline_steps: int,
        threshold: AnomalyThreshold = AnomalyThreshold()
    ) -> Optional[WearableAnomalyDiagnostic]:
        if baseline_steps <= 0:
            return None

        # Check percentage drop
        if current_activity.steps < baseline_steps:
            drop_pct = ((baseline_steps - current_activity.steps) / float(baseline_steps)) * 100.0
            if drop_pct >= threshold.activity_drop_percentage:
                severity = AnomalySeverity.WARNING if drop_pct >= 60.0 else AnomalySeverity.ATTENTION
                return WearableAnomalyDiagnostic(
                    id=uuid.uuid4(),
                    subject_id=subject_id,
                    metric_name="daily_steps",
                    observed_value=float(current_activity.steps),
                    baseline_value=float(baseline_steps),
                    percentage_deviation=drop_pct,
                    severity=severity,
                    description=(
                        f"Daily step count ({current_activity.steps:,}) dropped by {drop_pct:.0f}% "
                        f"compared to the baseline of {baseline_steps:,} steps."
                    )
                )
        return None


class SleepDisruptionPolicy:
    """
    Evaluates whether sleep quality or duration has dropped into an alertable zone.
    """

    @classmethod
    def evaluate(
        cls,
        subject_id: uuid.UUID,
        current_sleep: SleepArchitecture,
        baseline_sleep_hours: float = 7.0,
        threshold: AnomalyThreshold = AnomalyThreshold()
    ) -> Optional[WearableAnomalyDiagnostic]:
        observed_hours = current_sleep.total_sleep_hours
        if baseline_sleep_hours <= 0.0:
            return None

        if observed_hours < baseline_sleep_hours:
            drop_pct = ((baseline_sleep_hours - observed_hours) / baseline_sleep_hours) * 100.0
            if drop_pct >= threshold.sleep_drop_percentage or current_sleep.is_deprived:
                severity = AnomalySeverity.WARNING if observed_hours < 4.0 else AnomalySeverity.ATTENTION
                return WearableAnomalyDiagnostic(
                    id=uuid.uuid4(),
                    subject_id=subject_id,
                    metric_name="sleep_duration_hours",
                    observed_value=observed_hours,
                    baseline_value=baseline_sleep_hours,
                    percentage_deviation=drop_pct,
                    severity=severity,
                    description=(
                        f"Nocturnal sleep duration ({observed_hours:.1f} hrs) dropped by {drop_pct:.0f}% "
                        f"below baseline ({baseline_sleep_hours:.1f} hrs)."
                    )
                )
        return None


class AutonomicRecoveryPolicy:
    """
    Evaluates autonomic stress / cardiovascular recovery indicators (elevated resting HR, depressed HRV).
    """

    @classmethod
    def evaluate(
        cls,
        subject_id: uuid.UUID,
        current_recovery: RecoveryVitals,
        baseline_resting_hr: int = 65,
        threshold: AnomalyThreshold = AnomalyThreshold()
    ) -> Optional[WearableAnomalyDiagnostic]:
        if current_recovery.resting_heart_rate_bpm is not None and baseline_resting_hr > 0:
            elevation = current_recovery.resting_heart_rate_bpm - baseline_resting_hr
            if elevation >= threshold.resting_hr_elevation_bpm:
                return WearableAnomalyDiagnostic(
                    id=uuid.uuid4(),
                    subject_id=subject_id,
                    metric_name="resting_heart_rate_bpm",
                    observed_value=float(current_recovery.resting_heart_rate_bpm),
                    baseline_value=float(baseline_resting_hr),
                    percentage_deviation=(elevation / float(baseline_resting_hr)) * 100.0,
                    severity=AnomalySeverity.WARNING,
                    description=(
                        f"Resting heart rate elevated by +{elevation} bpm "
                        f"({current_recovery.resting_heart_rate_bpm} bpm vs baseline {baseline_resting_hr} bpm)."
                    )
                )

        # SpO2 hypoxia check
        if current_recovery.is_hypoxemic and current_recovery.spo2_percentage is not None:
            return WearableAnomalyDiagnostic(
                id=uuid.uuid4(),
                subject_id=subject_id,
                metric_name="spo2_percentage",
                observed_value=current_recovery.spo2_percentage,
                baseline_value=98.0,
                percentage_deviation=98.0 - current_recovery.spo2_percentage,
                severity=AnomalySeverity.CRITICAL,
                description=f"Nocturnal blood oxygen saturation dropped to {current_recovery.spo2_percentage:.1f}% (desaturation warning)."
            )

        return None


from dataclasses import dataclass, field
from typing import Set, Dict, Any
from app.domains.wearables.domain.value_objects import DeviceProvider, WearableMetricType
from app.domains.wearables.domain.entities import WearableMetric


@dataclass
class FHIRMappingRules:
    """
    Configurable rules determining when wearable telemetry is eligible for FHIR mapping.
    Ensures that high-frequency raw telemetry remains in the analytics layer unless
    clinically warranted.
    """
    # Exclude routine high-frequency minute-by-minute streaming telemetry
    exclude_high_frequency_telemetry: bool = True

    # Allow mapping when an explicit anomaly is diagnosed by the Guardian AI / Insight Engine
    allow_anomaly_triggered: bool = True

    # Allow mapping for daily summarized aggregates (e.g. daily resting HR, daily step aggregate)
    allow_daily_clinical_summary: bool = True

    # Vital sign clinical threshold boundaries that trigger FHIR Observation creation
    tachycardia_threshold_bpm: int = 100
    bradycardia_threshold_bpm: int = 45
    hypoxemia_spo2_threshold_pct: float = 90.0
    fever_threshold_celsius: float = 38.0

    # Whitelisted metric types eligible for FHIR clinical mapping
    clinically_relevant_metric_types: Set[WearableMetricType] = field(default_factory=lambda: {
        WearableMetricType.RESTING_HEART_RATE,
        WearableMetricType.HEART_RATE,
        WearableMetricType.BLOOD_OXYGEN,
        WearableMetricType.BODY_TEMPERATURE,
        WearableMetricType.RESPIRATORY_RATE,
        WearableMetricType.WEIGHT,
        WearableMetricType.HEART_RATE_VARIABILITY,
        WearableMetricType.STEPS,
        WearableMetricType.SLEEP_DURATION
    })


class WearableToFHIRMappingPolicy:
    """
    Governs the Wearable -> FHIR Anti-Corruption Boundary.
    Enforces that high-frequency, noisy wearable streams stay in Open Wearables / KinGuardian analytics,
    while mapping clinically significant events into FHIR Observation, Device, and DeviceMetric resources.
    """

    LOINC_CODES: Dict[WearableMetricType, Dict[str, str]] = {
        WearableMetricType.HEART_RATE: {"code": "8867-4", "display": "Heart rate", "system": "http://loinc.org"},
        WearableMetricType.RESTING_HEART_RATE: {"code": "40443-4", "display": "Heart rate --resting", "system": "http://loinc.org"},
        WearableMetricType.BLOOD_OXYGEN: {"code": "2708-6", "display": "Oxygen saturation in Arterial blood by Pulse oximetry", "system": "http://loinc.org"},
        WearableMetricType.BODY_TEMPERATURE: {"code": "8310-5", "display": "Body temperature", "system": "http://loinc.org"},
        WearableMetricType.RESPIRATORY_RATE: {"code": "9279-1", "display": "Respiratory rate", "system": "http://loinc.org"},
        WearableMetricType.WEIGHT: {"code": "29463-7", "display": "Body weight", "system": "http://loinc.org"},
        WearableMetricType.HEART_RATE_VARIABILITY: {"code": "80404-7", "display": "R-R interval.standard deviation (Heart rate variability)", "system": "http://loinc.org"},
        WearableMetricType.STEPS: {"code": "55423-8", "display": "Number of steps in 24 hour Measured", "system": "http://loinc.org"},
        WearableMetricType.SLEEP_DURATION: {"code": "93832-4", "display": "Sleep duration", "system": "http://loinc.org"},
    }

    def __init__(self, rules: Optional[FHIRMappingRules] = None):
        self.rules = rules or FHIRMappingRules()

    def should_map_to_fhir(
        self,
        metric: WearableMetric,
        anomaly: Optional[WearableAnomalyDiagnostic] = None,
        is_daily_summary: bool = False,
        doctor_ordered: bool = False
    ) -> bool:
        """
        Evaluates whether a metric satisfies the clinical relevance policy.
        Returns False for raw, unsummarized, non-anomalous streaming records.
        """
        # Rule 1: Always map if ordered by a doctor / clinical care plan
        if doctor_ordered:
            return True

        # Rule 2: Metric must be in clinically relevant types
        if metric.metric_type not in self.rules.clinically_relevant_metric_types:
            return False

        # Rule 3: Anomaly-triggered promotion
        if anomaly is not None and self.rules.allow_anomaly_triggered:
            return True

        # Rule 4: Vital sign threshold violations (clinical urgency)
        if metric.value is not None:
            try:
                num_val = float(metric.value)
                if metric.metric_type in (WearableMetricType.HEART_RATE, WearableMetricType.RESTING_HEART_RATE):
                    if num_val >= self.rules.tachycardia_threshold_bpm or num_val <= self.rules.bradycardia_threshold_bpm:
                        return True
                elif metric.metric_type == WearableMetricType.BLOOD_OXYGEN:
                    if num_val <= self.rules.hypoxemia_spo2_threshold_pct:
                        return True
                elif metric.metric_type == WearableMetricType.BODY_TEMPERATURE:
                    if num_val >= self.rules.fever_threshold_celsius:
                        return True
            except (ValueError, TypeError):
                pass

        # Rule 5: Daily summary promotion (e.g. daily resting HR, daily step summary for mobility)
        if is_daily_summary and self.rules.allow_daily_clinical_summary:
            return True

        # Default: High-frequency or routine non-anomalous telemetry stays in wearable layer
        if self.rules.exclude_high_frequency_telemetry:
            return False

        return False

    def map_to_fhir_observation(
        self,
        metric: WearableMetric,
        fhir_patient_id: str,
        device_fhir_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Maps a clinically eligible WearableMetric into a FHIR R4 Observation resource.
        """
        loinc = self.LOINC_CODES.get(
            metric.metric_type,
            {"code": "custom-wearable", "display": metric.metric_type.value, "system": "http://kinguardian.org/metrics"}
        )

        category_code = "vital-signs" if metric.metric_type in (
            WearableMetricType.HEART_RATE,
            WearableMetricType.RESTING_HEART_RATE,
            WearableMetricType.BLOOD_OXYGEN,
            WearableMetricType.BODY_TEMPERATURE,
            WearableMetricType.RESPIRATORY_RATE,
            WearableMetricType.WEIGHT
        ) else "activity"

        obs_id = str(uuid.uuid4())
        resource: Dict[str, Any] = {
            "resourceType": "Observation",
            "id": obs_id,
            "status": "final",
            "category": [
                {
                    "coding": [
                        {
                            "system": "http://terminology.hl7.org/CodeSystem/observation-category",
                            "code": category_code,
                            "display": category_code.replace("-", " ").title()
                        }
                    ]
                }
            ],
            "code": {
                "coding": [
                    {
                        "system": loinc["system"],
                        "code": loinc["code"],
                        "display": loinc["display"]
                    }
                ],
                "text": loinc["display"]
            },
            "subject": {
                "reference": f"Patient/{fhir_patient_id}"
            },
            "effectiveDateTime": metric.measured_at_utc.isoformat(),
            "valueQuantity": {
                "value": metric.value,
                "unit": metric.unit,
                "system": "http://unitsofmeasure.org"
            }
        }

        if device_fhir_id:
            resource["device"] = {"reference": f"Device/{device_fhir_id}"}

        return resource

    def map_to_fhir_device(
        self,
        provider: DeviceProvider,
        device_name: Optional[str],
        device_id: Optional[str],
        fhir_patient_id: str
    ) -> Dict[str, Any]:
        """
        Maps connected wearable hardware into a FHIR R4 Device resource.
        """
        dev_uuid = str(uuid.uuid4())
        mfg = provider.value.replace("_", " ").title()
        model_text = device_name or f"{mfg} Device"

        return {
            "resourceType": "Device",
            "id": dev_uuid,
            "status": "active",
            "manufacturer": mfg,
            "deviceName": [
                {
                    "name": model_text,
                    "type": "model-name"
                }
            ],
            "patient": {
                "reference": f"Patient/{fhir_patient_id}"
            },
            "type": {
                "coding": [
                    {
                        "system": "http://snomed.info/sct",
                        "code": "467131000",
                        "display": "Personal health wearable device"
                    }
                ],
                "text": "Personal Health Wearable"
            },
            "identifier": [
                {
                    "system": f"http://kinguardian.org/devices/{provider.value}",
                    "value": device_id or str(uuid.uuid4())
                }
            ]
        }

    def map_to_fhir_device_metric(
        self,
        metric_type: WearableMetricType,
        device_fhir_id: str
    ) -> Dict[str, Any]:
        """
        Maps a wearable metric capability into a FHIR R4 DeviceMetric resource.
        """
        metric_uuid = str(uuid.uuid4())
        loinc = self.LOINC_CODES.get(
            metric_type,
            {"code": "custom-metric", "display": metric_type.value, "system": "http://kinguardian.org/metrics"}
        )

        return {
            "resourceType": "DeviceMetric",
            "id": metric_uuid,
            "type": {
                "coding": [
                    {
                        "system": loinc["system"],
                        "code": loinc["code"],
                        "display": loinc["display"]
                    }
                ]
            },
            "source": {
                "reference": f"Device/{device_fhir_id}"
            },
            "category": "measurement",
            "operationalStatus": "on"
        }

