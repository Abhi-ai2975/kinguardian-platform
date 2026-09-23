"""
Dependency Injection Container & Adapter Registry.
Dynamically provides production gateways or mock adapter fallbacks based on
the active environment (ENVIRONMENT == "production" vs "development" / "testing").
"""

from typing import Union
from app.core.config import settings
from app.domains.clinical.gateway import FHIRClinicalRecordGateway
from app.domains.notifications.providers import NotificationProvider, InAppNotificationProvider
from app.core.adapters.prod_filenest import FileNestGateway
from app.core.adapters.prod_agent import AgentGateway
from app.core.adapters.prod_observability import ObservabilityGateway
from app.core.adapters.mock_fhir import MockFHIRGateway
from app.core.adapters.mock_filenest import MockFileStorageGateway
from app.core.adapters.mock_agent import MockAgentGateway
from app.core.adapters.mock_notifications import MockNotificationProvider
from app.core.adapters.mock_observability import MockObservabilityGateway

# Production Gateway Aliases
FHIRGateway = FHIRClinicalRecordGateway


class AdapterContainer:
    """
    Central dependency injection provider for external platform adapters.
    """

    _fhir_override = None
    _filenest_override = None
    _agent_override = None
    _notification_override = None
    _observability_override = None

    @classmethod
    def set_overrides(
        cls,
        fhir=None,
        filenest=None,
        agent=None,
        notification=None,
        observability=None
    ):
        cls._fhir_override = fhir
        cls._filenest_override = filenest
        cls._agent_override = agent
        cls._notification_override = notification
        cls._observability_override = observability

    @classmethod
    def reset_overrides(cls):
        cls._fhir_override = None
        cls._filenest_override = None
        cls._agent_override = None
        cls._notification_override = None
        cls._observability_override = None

    @classmethod
    def get_fhir_gateway(cls) -> Union[FHIRGateway, MockFHIRGateway]:
        if cls._fhir_override is not None:
            return cls._fhir_override
        if settings.ENVIRONMENT == "production":
            return FHIRGateway()
        return MockFHIRGateway()

    @classmethod
    def get_filenest_gateway(cls) -> Union[FileNestGateway, MockFileStorageGateway]:
        if cls._filenest_override is not None:
            return cls._filenest_override
        if settings.ENVIRONMENT == "production":
            return FileNestGateway()
        return MockFileStorageGateway()

    @classmethod
    def get_agent_gateway(cls) -> Union[AgentGateway, MockAgentGateway]:
        if cls._agent_override is not None:
            return cls._agent_override
        if settings.ENVIRONMENT == "production":
            return AgentGateway()
        return MockAgentGateway()

    @classmethod
    def get_notification_provider(cls) -> Union[NotificationProvider, MockNotificationProvider]:
        if cls._notification_override is not None:
            return cls._notification_override
        if settings.ENVIRONMENT == "production":
            return InAppNotificationProvider()
        return MockNotificationProvider()

    @classmethod
    def get_observability_gateway(cls) -> Union[ObservabilityGateway, MockObservabilityGateway]:
        if cls._observability_override is not None:
            return cls._observability_override
        if settings.ENVIRONMENT == "production":
            return ObservabilityGateway()
        return MockObservabilityGateway()


# FastAPI Dependency Providers
def get_fhir_gateway():
    return AdapterContainer.get_fhir_gateway()


def get_filenest_gateway():
    return AdapterContainer.get_filenest_gateway()


def get_agent_gateway():
    return AdapterContainer.get_agent_gateway()


def get_notification_provider():
    return AdapterContainer.get_notification_provider()


def get_observability_gateway():
    return AdapterContainer.get_observability_gateway()
