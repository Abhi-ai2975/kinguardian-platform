"""
DI sub-container for the Organisation domain.

Declares the dependency graph for everything related to FHIR Organisation resources:
  OrganizationClient  ← depends on → FhirClient   (from CoreContainer via `core`)
  OrganizationsService ← depends on → OrganizationClient

Both providers use Factory (not Singleton) because:
  - OrganizationClient is a thin stateless wrapper; creating one per-injection is cheap.
  - OrganizationsService holds no state either; a fresh instance per request keeps
    the service layer free of cross-request leakage.
  - The underlying FhirClient (held by CoreContainer as Singleton) is shared regardless,
    so there is no connection-pool cost to using Factory here.

This container is wired into the root Container (app.di.container) as `organization`.
"""

from dependency_injector import containers, providers

from app.fhir_client.organization import OrganizationClient
from app.services.organization_service import OrganizationsService


class OrganizationContainer(containers.DeclarativeContainer):
    """
    Assembles the dependency graph for Organisation CRUD operations.

    `core` is a DependenciesContainer placeholder that the root Container fills in
    when it creates this sub-container via:
        providers.Container(OrganizationContainer, core=core)
    This allows OrganizationContainer to reference `core.fhir_client` without
    importing CoreContainer directly, keeping the domain module decoupled from
    infrastructure wiring details.
    """

    # Placeholder that is replaced with the actual CoreContainer instance by the
    # root Container at wiring time. Declared as DependenciesContainer so
    # dependency-injector knows to resolve its providers from the injected object.
    core = providers.DependenciesContainer()

    # Factory provider for OrganizationClient.
    # Receives the shared FhirClient singleton from CoreContainer so all
    # Organisation HTTP calls flow through the same connection pool.
    organization_client = providers.Factory(
        OrganizationClient,
        fhir=core.fhir_client,  # resolved from the injected CoreContainer
    )

    # Factory provider for OrganizationsService.
    # Receives a fresh OrganizationClient instance (itself backed by the singleton
    # FhirClient) each time the service is resolved.
    organization_service = providers.Factory(
        OrganizationsService,
        client=organization_client,
    )
