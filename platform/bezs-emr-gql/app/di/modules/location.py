"""
DI sub-container for the Location domain.

Declares the dependency graph for everything related to FHIR Location resources:
  LocationClient  ← depends on → FhirClient   (from CoreContainer via `core`)
  LocationService ← depends on → LocationClient

Both providers use Factory (not Singleton) because:
  - LocationClient is a thin stateless wrapper; creating one per-injection is cheap.
  - LocationService holds no state either; a fresh instance per request keeps
    the service layer free of cross-request leakage.
  - The underlying FhirClient (held by CoreContainer as Singleton) is shared regardless,
    so there is no connection-pool cost to using Factory here.

This container is wired into the root Container (app.di.container) as `location`.
"""

from dependency_injector import containers, providers

from app.fhir_client.location import LocationClient
from app.services.location_service import LocationService


class LocationContainer(containers.DeclarativeContainer):
    """
    Assembles the dependency graph for Location CRUD operations.

    `core` is a DependenciesContainer placeholder that the root Container fills in
    when it creates this sub-container via:
        providers.Container(LocationContainer, core=core)
    This allows LocationContainer to reference `core.fhir_client` without importing
    CoreContainer directly, keeping the domain module decoupled from infrastructure
    wiring details.
    """

    # Placeholder replaced with the actual CoreContainer instance by the root Container
    # at wiring time. Declared as DependenciesContainer so dependency-injector knows
    # to resolve its providers from the injected object.
    core = providers.DependenciesContainer()

    # Factory provider for LocationClient.
    # Receives the shared FhirClient singleton from CoreContainer so all Location
    # HTTP calls flow through the same connection pool.
    location_client = providers.Factory(
        LocationClient,
        fhir=core.fhir_client,  # resolved from the injected CoreContainer
    )

    # Factory provider for LocationService.
    # Receives a fresh LocationClient instance (backed by the singleton FhirClient)
    # each time the service is resolved.
    location_service = providers.Factory(
        LocationService,
        client=location_client,
    )
