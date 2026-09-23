"""
DI sub-container for the PractitionerRole domain.

Factory providers are used (not Singleton) because PractitionerRoleClient and
PractitionerRoleService are stateless — per-injection instantiation is safe and
avoids cross-request state leakage. The underlying FhirClient is a Singleton
provided by CoreContainer so all resource types share one HTTP connection pool.
"""

from dependency_injector import containers, providers

from app.fhir_client.practitioner_role import PractitionerRoleClient
from app.services.practitioner_role_service import PractitionerRoleService


class PractitionerRoleContainer(containers.DeclarativeContainer):
    """
    Dependency-injection sub-container for the PractitionerRole resource domain.

    Provides:
      - practitioner_role_client:  PractitionerRoleClient wrapping the shared FhirClient.
      - practitioner_role_service: PractitionerRoleService with all PractitionerRole logic.
    """

    # Placeholder wired to root Container's `core` sub-container at startup.
    core = providers.DependenciesContainer()

    # PractitionerRoleClient — thin HTTP wrapper; shares FhirClient singleton via core.
    practitioner_role_client = providers.Factory(
        PractitionerRoleClient,
        fhir=core.fhir_client,
    )

    # PractitionerRoleService — business logic layer; receives the client above.
    practitioner_role_service = providers.Factory(
        PractitionerRoleService,
        client=practitioner_role_client,
    )
