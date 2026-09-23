"""
Service Extraction Boundaries Test Suite:
Verifies that all 6 target future microservices:
1. Family Service
2. Notification Service
3. Insight Service
4. Document Service
5. Communication Service
6. AI Orchestration Service

Maintain strict boundary encapsulation, decoupled event contracts, and dedicated persistence models
while running seamlessly inside a single deployable modular monolith.
"""

import pytest
from app.main import app
from app.core.scalability.extraction_manifest import (
    FUTURE_EXTRACTION_SERVICES,
    ServiceExtractionRegistry
)


def test_all_six_future_services_registered():
    """
    Verifies that all 6 future services are defined with explicit boundary metadata.
    """
    expected_services = [
        "FamilyService",
        "NotificationService",
        "InsightService",
        "DocumentService",
        "CommunicationService",
        "AIOrchestrationService"
    ]

    services = ServiceExtractionRegistry.list_future_services()
    service_names = [s.service_name for s in services]

    for s_key in expected_services:
        defn = ServiceExtractionRegistry.get_service_definition(s_key)
        assert defn is not None
        assert defn.is_deployable_standalone is True
        assert len(defn.inbound_event_subscriptions) > 0
        assert len(defn.outbound_event_publications) > 0
        assert len(defn.database_tables) > 0


@pytest.mark.parametrize("service_key", [
    "FamilyService",
    "NotificationService",
    "InsightService",
    "DocumentService",
    "CommunicationService",
    "AIOrchestrationService"
])
def test_service_boundary_isolation_and_extraction_readiness(service_key: str):
    """
    Verifies that each service passes extraction readiness checks:
    - Dedicated router prefix
    - Event-decoupled communication
    - Isolated persistence tables
    """
    check = ServiceExtractionRegistry.validate_service_boundary_isolation(service_key)
    assert check["extraction_readiness"] == "READY"
    assert check["has_dedicated_router"] is True
    assert check["event_decoupled"] is True
    assert check["isolated_persistence"] is True


def test_monolith_hosts_all_domain_routes():
    """
    Verifies that the single deployable application (app.main:app) hosts
    the routers for all 6 future microservice domains.
    """
    paths = list(app.openapi()["paths"].keys())
    
    # Check that route prefixes for all domains are registered
    assert any("/api/v1/families" in p for p in paths)
    assert any("/api/v1/notifications" in p or "/notifications" in p for p in paths)
    assert any("/api/v1/insights" in p or "/insights" in p for p in paths)
    assert any("/api/v1/documents" in p for p in paths)
    assert any("/api/v1/conversations" in p or "/conversations" in p for p in paths)
    assert any("/api/v1/agent" in p for p in paths)


