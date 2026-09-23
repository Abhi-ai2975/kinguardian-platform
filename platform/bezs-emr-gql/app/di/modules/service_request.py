"""
Dependency-injection sub-container for the ServiceRequest domain.

Wires ServiceRequestClient and ServiceRequestService as Factory providers so
each request receives a fresh, stateless instance. The shared FhirClient
Singleton (in CoreContainer) is reused across all domain containers — no extra
HTTP connections are opened.
"""

from dependency_injector import containers, providers

from app.fhir_client.service_request import ServiceRequestClient
from app.services.service_request_service import ServiceRequestService


class ServiceRequestContainer(containers.DeclarativeContainer):
    """
    DI sub-container for ServiceRequest resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client` (the Singleton HTTP client).

    All providers are Factory (not Singleton) — ServiceRequestClient and
    ServiceRequestService are stateless, so per-injection creation is safe
    and avoids cross-request state leakage.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for ServiceRequest endpoints on the fhir-server.
    service_request_client = providers.Factory(
        ServiceRequestClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and ServiceRequestClient.
    service_request_service = providers.Factory(
        ServiceRequestService,
        client=service_request_client,
    )
