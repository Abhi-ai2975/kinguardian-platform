import pytest
from app.core.config import settings
from app.core.adapters import (
    FHIRGateway,
    FileNestGateway,
    AgentGateway,
    ObservabilityGateway,
    MockFHIRGateway,
    MockFileStorageGateway,
    MockAgentGateway,
    MockObservabilityGateway,
    MockNotificationProvider,
    AdapterContainer,
    get_fhir_gateway,
    get_filenest_gateway,
    get_agent_gateway,
    get_notification_provider,
    get_observability_gateway,
)
from app.domains.notifications.providers import InAppNotificationProvider


def test_production_adapters_instantiation():
    """
    Verifies that all production gateway classes instantiate correctly
    with configured platform service URLs and options.
    """
    fhir = FHIRGateway(emr_gql_url="http://gql.example.com", emr_core_url="http://core.example.com")
    assert fhir.emr_gql_url == "http://gql.example.com"
    assert fhir.emr_core_url == "http://core.example.com"

    filenest = FileNestGateway(base_url="http://filenest.example.com", api_key="test-key", project_id="proj-123")
    assert filenest.base_url == "http://filenest.example.com"
    assert filenest.api_key == "test-key"
    assert filenest.project_id == "proj-123"

    agent = AgentGateway(base_url="http://agent.example.com", timeout=20.0)
    assert agent.base_url == "http://agent.example.com"
    assert agent.timeout == 20.0

    obs = ObservabilityGateway(endpoint_url="http://obs.example.com:4318", timeout=5.0)
    assert obs.endpoint_url == "http://obs.example.com:4318"
    assert obs.timeout == 5.0


def test_dependency_injection_selection_in_development(monkeypatch):
    """
    Verifies that AdapterContainer selects mock fallbacks in development/testing mode.
    """
    AdapterContainer.reset_overrides()
    monkeypatch.setattr(settings, "ENVIRONMENT", "development")

    assert isinstance(get_fhir_gateway(), MockFHIRGateway)
    assert isinstance(get_filenest_gateway(), MockFileStorageGateway)
    assert isinstance(get_agent_gateway(), MockAgentGateway)
    assert isinstance(get_notification_provider(), MockNotificationProvider)
    assert isinstance(get_observability_gateway(), MockObservabilityGateway)


def test_dependency_injection_selection_in_production(monkeypatch):
    """
    Verifies that AdapterContainer selects real production adapters in production mode.
    """
    AdapterContainer.reset_overrides()
    monkeypatch.setattr(settings, "ENVIRONMENT", "production")

    assert isinstance(get_fhir_gateway(), FHIRGateway)
    assert isinstance(get_filenest_gateway(), FileNestGateway)
    assert isinstance(get_agent_gateway(), AgentGateway)
    assert isinstance(get_notification_provider(), InAppNotificationProvider)
    assert isinstance(get_observability_gateway(), ObservabilityGateway)


def test_dependency_injection_runtime_overrides():
    """
    Verifies that test-specific overrides take precedence regardless of ENVIRONMENT.
    """
    custom_mock_fhir = MockFHIRGateway()
    custom_mock_filenest = MockFileStorageGateway()

    AdapterContainer.set_overrides(fhir=custom_mock_fhir, filenest=custom_mock_filenest)

    assert get_fhir_gateway() is custom_mock_fhir
    assert get_filenest_gateway() is custom_mock_filenest

    AdapterContainer.reset_overrides()
