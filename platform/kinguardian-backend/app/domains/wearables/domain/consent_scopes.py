"""
Wearable Consent Scopes & Unbundled Granular Authorization.

Defines granular consent scopes:
- view_wearable_summary
- view_wearable_activity
- view_wearable_sleep
- view_wearable_heart_rate
- view_wearable_raw_metrics
- manage_wearable_connections

CORE PRIVACY INVARIANT:
Do NOT bundle all wearable permissions into one monolithic scope.
Each permission scope is independently granted, evaluated, and revocable.
"""

from enum import Enum
from typing import Set, Dict, Any, List, Optional, Tuple
from dataclasses import dataclass, field


class WearableConsentScope(str, Enum):
    VIEW_WEARABLE_SUMMARY = "view_wearable_summary"                  # Health scores, summary badges, Guardian Moments
    VIEW_WEARABLE_ACTIVITY = "view_wearable_activity"                # Steps, active minutes, walking distance, calories
    VIEW_WEARABLE_SLEEP = "view_wearable_sleep"                      # Total sleep duration, sleep score, sleep stages
    VIEW_WEARABLE_HEART_RATE = "view_wearable_heart_rate"            # Resting heart rate, pulse range, HRV recovery
    VIEW_WEARABLE_RAW_METRICS = "view_wearable_raw_metrics"          # High-frequency continuous PPG, sub-minute epochs
    MANAGE_WEARABLE_CONNECTIONS = "manage_wearable_connections"      # Connect, pair, configure, disconnect wearable providers


class ScopeSensitivityLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass(frozen=True)
class ConsentScopeDefinition:
    """Metadata and user disclosure definition for a granular consent scope."""
    scope: WearableConsentScope
    name: str
    label: str
    description: str
    sensitivity: ScopeSensitivityLevel
    disclosed_data_types: List[str]


WEARABLE_CONSENT_SCOPE_REGISTRY: Dict[WearableConsentScope, ConsentScopeDefinition] = {
    WearableConsentScope.VIEW_WEARABLE_SUMMARY: ConsentScopeDefinition(
        scope=WearableConsentScope.VIEW_WEARABLE_SUMMARY,
        name="view_wearable_summary",
        label="Health Summary & Highlights",
        description="Allows viewing high-level wellness summaries, daily activity badges, and Guardian Moments.",
        sensitivity=ScopeSensitivityLevel.LOW,
        disclosed_data_types=["daily_wellness_score", "guardian_moment_highlights", "activity_level_badge"]
    ),
    WearableConsentScope.VIEW_WEARABLE_ACTIVITY: ConsentScopeDefinition(
        scope=WearableConsentScope.VIEW_WEARABLE_ACTIVITY,
        name="view_wearable_activity",
        label="Physical Activity & Movement",
        description="Allows viewing daily step counts, active duration, walking distance, and calorie expenditure.",
        sensitivity=ScopeSensitivityLevel.MEDIUM,
        disclosed_data_types=["steps", "active_minutes", "distance_meters", "calories_burned"]
    ),
    WearableConsentScope.VIEW_WEARABLE_SLEEP: ConsentScopeDefinition(
        scope=WearableConsentScope.VIEW_WEARABLE_SLEEP,
        name="view_wearable_sleep",
        label="Sleep Architecture & Quality",
        description="Allows viewing sleep duration, sleep efficiency scores, and sleep stage breakdowns (Deep, REM, Light).",
        sensitivity=ScopeSensitivityLevel.HIGH,
        disclosed_data_types=["total_sleep_hours", "sleep_score", "deep_sleep_minutes", "rem_sleep_minutes"]
    ),
    WearableConsentScope.VIEW_WEARABLE_HEART_RATE: ConsentScopeDefinition(
        scope=WearableConsentScope.VIEW_WEARABLE_HEART_RATE,
        name="view_wearable_heart_rate",
        label="Cardiovascular & Recovery Vitals",
        description="Allows viewing resting heart rate averages, daily pulse ranges, and heart rate variability (HRV RMSSD).",
        sensitivity=ScopeSensitivityLevel.HIGH,
        disclosed_data_types=["resting_heart_rate_bpm", "hrv_rmssd_ms", "pulse_min_max"]
    ),
    WearableConsentScope.VIEW_WEARABLE_RAW_METRICS: ConsentScopeDefinition(
        scope=WearableConsentScope.VIEW_WEARABLE_RAW_METRICS,
        name="view_wearable_raw_metrics",
        label="High-Frequency Raw Biometrics",
        description="Allows viewing high-resolution continuous telemetry, second-by-second PPG, and intraday sensor epochs.",
        sensitivity=ScopeSensitivityLevel.CRITICAL,
        disclosed_data_types=["raw_ppg_stream", "beat_to_beat_intervals", "intraday_accelerometer_epochs"]
    ),
    WearableConsentScope.MANAGE_WEARABLE_CONNECTIONS: ConsentScopeDefinition(
        scope=WearableConsentScope.MANAGE_WEARABLE_CONNECTIONS,
        name="manage_wearable_connections",
        label="Device Connection Management",
        description="Allows pairing, authenticating OAuth links, managing data sources, and disconnecting wearable devices.",
        sensitivity=ScopeSensitivityLevel.CRITICAL,
        disclosed_data_types=["oauth_credentials", "device_pairing_tokens", "hardware_serial_numbers"]
    )
}


class ConsentScopeAuthorizer:
    """
    Evaluates fine-grained unbundled consent scopes.
    Guarantees that having one scope (e.g. view_wearable_summary) does NOT
    implicitly confer access to other unbundled scopes (e.g. view_wearable_raw_metrics).
    """

    @classmethod
    def is_scope_granted(
        cls,
        granted_scopes: Set[str],
        required_scope: WearableConsentScope
    ) -> Tuple[bool, str]:
        """Checks whether the exact required unbundled scope is present in granted_scopes."""
        req_val = required_scope.value if isinstance(required_scope, WearableConsentScope) else str(required_scope)

        # Normalize set
        norm_granted = {s.lower().strip() for s in granted_scopes}

        if req_val in norm_granted:
            scope_def = WEARABLE_CONSENT_SCOPE_REGISTRY.get(
                WearableConsentScope(req_val) if req_val in WearableConsentScope._value2member_map_ else required_scope
            )
            label = scope_def.label if scope_def else req_val
            return (True, f"Authorized: Consent scope '{req_val}' ({label}) is granted.")

        # Granular rejection messages
        scope_def = WEARABLE_CONSENT_SCOPE_REGISTRY.get(
            WearableConsentScope(req_val) if req_val in WearableConsentScope._value2member_map_ else required_scope
        )
        label = scope_def.label if scope_def else req_val

        return (
            False,
            f"Access Denied: Missing required consent scope '{req_val}' ({label}). "
            f"Granted scopes: [{', '.join(sorted(norm_granted)) or 'None'}]."
        )

    @classmethod
    def get_all_scope_definitions(cls) -> List[Dict[str, Any]]:
        """Returns structured disclosure list of all available unbundled consent scopes."""
        return [
            {
                "scope": defn.scope.value,
                "label": defn.label,
                "description": defn.description,
                "sensitivity": defn.sensitivity.value,
                "disclosed_data_types": defn.disclosed_data_types
            }
            for defn in WEARABLE_CONSENT_SCOPE_REGISTRY.values()
        ]
