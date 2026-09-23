"""
Dependency-injection sub-container for the Patient domain.

Wires PatientClient and PatientService together and exposes them to the root
Container. Both are declared as Factory providers (not Singleton) because the
client and service are stateless — a new instance per injection avoids any
cross-request state leakage. The shared FhirClient singleton is passed in from
the CoreContainer via the `core` DependenciesContainer placeholder.
"""

from dependency_injector import containers, providers

from app.fhir_client.patient import PatientClient
from app.services.patient_service import PatientService


class PatientContainer(containers.DeclarativeContainer):
    """
    DI sub-container for the Patient resource domain.

    Receives the CoreContainer instance via the `core` placeholder so it can
    reference the shared FhirClient singleton without creating a second HTTP
    session. Wired into the root Container in app.di.container.
    """

    # Placeholder replaced by the root Container at wiring time with the actual
    # CoreContainer instance — allows PatientClient to depend on core.fhir_client.
    core = providers.DependenciesContainer()

    # PatientClient wraps FhirClient with Patient-specific paths and sub-resource methods.
    # Factory ensures a fresh instance per injection (stateless, safe to recreate).
    patient_client = providers.Factory(
        PatientClient,
        fhir=core.fhir_client,
    )

    # PatientService owns all business logic for Patient CRUD and sub-resource operations.
    # Depends on patient_client — also Factory so both are recreated together per request.
    patient_service = providers.Factory(
        PatientService,
        client=patient_client,
    )
