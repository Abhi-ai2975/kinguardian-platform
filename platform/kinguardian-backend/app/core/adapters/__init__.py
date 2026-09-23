"""
Adapters Package for KinGuardian Platform.
Contains both Production Gateways and Mock Fallbacks:
- Production: FHIRGateway, FileNestGateway, AgentGateway, ObservabilityGateway
- Fallbacks: MockFHIRGateway, MockFileStorageGateway, MockAgentGateway, MockNotificationProvider, MockObservabilityGateway
"""

from app.domains.clinical.gateway import FHIRClinicalRecordGateway as FHIRGateway
from app.core.adapters.prod_filenest import FileNestGateway
from app.core.adapters.prod_agent import AgentGateway
from app.core.adapters.prod_observability import ObservabilityGateway

from app.core.adapters.mock_fhir import MockFHIRGateway
from app.core.adapters.mock_filenest import MockFileStorageGateway
from app.core.adapters.mock_agent import MockAgentGateway
from app.core.adapters.mock_notifications import MockNotificationProvider
from app.core.adapters.mock_observability import MockObservabilityGateway

from app.core.container import (
    AdapterContainer,
    get_fhir_gateway,
    get_filenest_gateway,
    get_agent_gateway,
    get_notification_provider,
    get_observability_gateway,
)

__all__ = [
    "FHIRGateway",
    "FileNestGateway",
    "AgentGateway",
    "ObservabilityGateway",
    "MockFHIRGateway",
    "MockFileStorageGateway",
    "MockAgentGateway",
    "MockNotificationProvider",
    "MockObservabilityGateway",
    "AdapterContainer",
    "get_fhir_gateway",
    "get_filenest_gateway",
    "get_agent_gateway",
    "get_notification_provider",
    "get_observability_gateway",
]
