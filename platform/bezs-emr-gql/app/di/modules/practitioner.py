"""
DI sub-container for the Practitioner domain.

Factory providers are used (not Singleton) because PractitionerClient and
PractitionerService are stateless — a new instance per injection is safe and
avoids cross-request state leakage. The underlying FhirClient is a Singleton
provided by CoreContainer so all resource types share one HTTP connection pool.
"""

from dependency_injector import containers, providers

from app.fhir_client.practitioner import PractitionerClient
from app.services.practitioner_service import PractitionerService


class PractitionerContainer(containers.DeclarativeContainer):
    """
    Dependency-injection sub-container for the Practitioner resource domain.

    Provides:
      - practitioner_client:  PractitionerClient wrapping the shared FhirClient.
      - practitioner_service: PractitionerService containing all Practitioner business logic.
    """

    # Placeholder wired to root Container's `core` sub-container at startup.
    core = providers.DependenciesContainer()

    # PractitionerClient — thin HTTP wrapper; shares FhirClient singleton via core.
    practitioner_client = providers.Factory(
        PractitionerClient,
        fhir=core.fhir_client,
    )

    # PractitionerService — business logic layer; receives the client injected above.
    practitioner_service = providers.Factory(
        PractitionerService,
        client=practitioner_client,
    )
