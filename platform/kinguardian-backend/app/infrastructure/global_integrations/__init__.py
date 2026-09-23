"""
Global Integrations Package:
Unified data models, connectors, LOINC normalizers, and normalized observation pipelines for:
- Apple HealthKit
- Google Health Connect / Google Fit
- Fitbit Web API
- Garmin Health API
- Oura Ring API
- International Healthcare Portals (SMART on FHIR, Epic MyChart, Cerner, NHS App)
"""

from app.infrastructure.global_integrations.models import (
    WearableProvider,
    HealthPortalProvider,
    ObservationCategory,
    NormalizedHealthObservation
)
from app.infrastructure.global_integrations.connectors import (
    IWearableConnector,
    IHealthPortalConnector
)
from app.infrastructure.global_integrations.normalizer import (
    LOINC_CODE_REGISTRY,
    ObservationNormalizer
)
from app.infrastructure.global_integrations.pipeline import (
    NormalizedObservationPipeline
)

__all__ = [
    "WearableProvider",
    "HealthPortalProvider",
    "ObservationCategory",
    "NormalizedHealthObservation",
    "IWearableConnector",
    "IHealthPortalConnector",
    "LOINC_CODE_REGISTRY",
    "ObservationNormalizer",
    "NormalizedObservationPipeline"
]
