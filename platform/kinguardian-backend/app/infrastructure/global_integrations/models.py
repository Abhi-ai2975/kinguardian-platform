"""
Global Health & Wearables Integration Data Models:
Defines the canonical, normalized observation schema for all incoming wearable
and international healthcare portal feeds.
"""

from typing import Dict, Any, Optional, List
import uuid
from dataclasses import dataclass
from datetime import datetime
from enum import Enum


class WearableProvider(str, Enum):
    APPLE_HEALTH = "APPLE_HEALTH"
    GOOGLE_HEALTH_CONNECT = "GOOGLE_HEALTH_CONNECT"
    FITBIT = "FITBIT"
    GARMIN = "GARMIN"
    OURA = "OURA"
    GENERIC_WEARABLE = "GENERIC_WEARABLE"


class HealthPortalProvider(str, Enum):
    SMART_ON_FHIR = "SMART_ON_FHIR"
    EPIC_MYCHART = "EPIC_MYCHART"
    CERNER_HEALTHELIFE = "CERNER_HEALTHELIFE"
    NHS_APP = "NHS_APP"
    INTERNATIONAL_PORTAL = "INTERNATIONAL_PORTAL"


class ObservationCategory(str, Enum):
    VITAL_SIGNS = "vital-signs"
    ACTIVITY = "activity"
    SLEEP = "sleep"
    RECOVERY = "recovery"
    LABORATORY = "laboratory"


@dataclass(frozen=True)
class NormalizedHealthObservation:
    """
    Canonical, normalized observation representation across ALL global health sources.
    Maps directly to FHIR R4 Observation resource semantics.
    """
    observation_id: str
    subject_id: uuid.UUID
    source_provider: str  # WearableProvider or HealthPortalProvider value
    category: ObservationCategory
    code_loinc: str  # e.g., '8867-4' (Heart Rate), '2708-6' (Oxygen Saturation)
    code_snomed: Optional[str]
    display_name: str
    value_numeric: Optional[float]
    unit: str  # 'bpm', '%', 'mmHg', 'steps', 'minutes', 'degC'
    effective_timestamp: datetime
    device_model: Optional[str] = None
    raw_metadata: Optional[Dict[str, Any]] = None
