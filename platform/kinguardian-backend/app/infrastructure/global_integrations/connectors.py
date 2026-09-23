"""
Global Wearables & Healthcare Portal Connector Protocols:
Defines protocols for:
1. Apple Health (HealthKit iOS Sync)
2. Google Health Connect (Android Health Connect REST & SDK)
3. Fitbit Web API (Heart rate, sleep, activity)
4. Garmin Health API (Daily summaries, stress, pulse ox)
5. Oura Ring API (Sleep score, readiness, recovery HRV)
6. International Healthcare Portals (SMART on FHIR Patient Access, Epic, Cerner, NHS App)
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from datetime import datetime

from app.infrastructure.global_integrations.models import (
    NormalizedHealthObservation,
    WearableProvider,
    HealthPortalProvider
)


class IWearableConnector(Protocol):
    """Protocol for vendor-specific wearable data ingestion."""

    @property
    def provider(self) -> WearableProvider:
        ...

    async def authenticate_user_feed(
        self,
        subject_id: uuid.UUID,
        auth_code: str,
        redirect_uri: str
    ) -> Dict[str, Any]:
        """Exchanges OAuth token with wearable provider."""
        ...

    async def fetch_recent_telemetry(
        self,
        subject_id: uuid.UUID,
        since: datetime,
        access_token: str
    ) -> List[Dict[str, Any]]:
        """Pulls raw telemetry from provider endpoints."""
        ...


class IHealthPortalConnector(Protocol):
    """Protocol for SMART on FHIR and International Patient Access Portals."""

    @property
    def portal_type(self) -> HealthPortalProvider:
        ...

    async def authorize_patient_access(
        self,
        subject_id: uuid.UUID,
        oauth_tokens: Dict[str, Any]
    ) -> bool:
        """Establishes authenticated SMART on FHIR patient access connection."""
        ...

    async def pull_clinical_observations(
        self,
        subject_id: uuid.UUID,
        since: datetime
    ) -> List[Dict[str, Any]]:
        """Pulls FHIR Bundle of observations, conditions, and encounters from international portal."""
        ...
