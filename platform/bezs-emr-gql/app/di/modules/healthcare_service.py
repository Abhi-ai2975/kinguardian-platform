"""
DI sub-container for the HealthcareService domain.

Declares the dependency graph for everything related to FHIR HealthcareService resources:
  HealthcareServiceClient  ← depends on → FhirClient   (from CoreContainer via `core`)
  HealthcareServiceService ← depends on → HealthcareServiceClient

Both providers use Factory (not Singleton) because:
  - HealthcareServiceClient is a thin stateless wrapper; creating one per-injection is cheap.
  - HealthcareServiceService holds no state; a fresh instance per request keeps
    the service layer free of cross-request leakage.
  - The underlying FhirClient (held by CoreContainer as Singleton) is shared regardless,
    so there is no connection-pool cost to using Factory here.

This container is wired into the root Container (app.di.container) as `healthcare_service`.
"""

from dependency_injector import containers, providers

from app.fhir_client.healthcare_service import HealthcareServiceClient
from app.services.healthcare_service_service import HealthcareServiceService


class HealthcareServiceContainer(containers.DeclarativeContainer):
    """
    Assembles the dependency graph for HealthcareService CRUD operations.

    `core` is a DependenciesContainer placeholder that the root Container fills in
    when it creates this sub-container via:
        providers.Container(HealthcareServiceContainer, core=core)
    This allows HealthcareServiceContainer to reference `core.fhir_client` without
    importing CoreContainer directly, keeping the domain module decoupled from
    infrastructure wiring details.
    """

    # Placeholder replaced with the actual CoreContainer instance by the root Container
    # at wiring time. Declared as DependenciesContainer so dependency-injector knows
    # to resolve its providers from the injected object.
    core = providers.DependenciesContainer()

    # Factory provider for HealthcareServiceClient.
    # Receives the shared FhirClient singleton from CoreContainer so all
    # HealthcareService HTTP calls flow through the same connection pool.
    healthcare_service_client = providers.Factory(
        HealthcareServiceClient,
        fhir=core.fhir_client,  # resolved from the injected CoreContainer
    )

    # Factory provider for HealthcareServiceService.
    # Receives a fresh HealthcareServiceClient instance (backed by the singleton
    # FhirClient) each time the service is resolved.
    healthcare_service_service = providers.Factory(
        HealthcareServiceService,
        client=healthcare_service_client,
    )
