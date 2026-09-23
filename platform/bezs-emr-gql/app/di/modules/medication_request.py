"""
Dependency-injection sub-container for the MedicationRequest domain.

Wires MedicationRequestClient and MedicationRequestService as Factory providers
so each request receives a fresh, stateless instance.
"""

from dependency_injector import containers, providers

from app.fhir_client.medication_request import MedicationRequestClient
from app.services.medication_request_service import MedicationRequestService


class MedicationRequestContainer(containers.DeclarativeContainer):
    """
    DI sub-container for MedicationRequest resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client`.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for MedicationRequest endpoints on the fhir-server.
    medication_request_client = providers.Factory(
        MedicationRequestClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and MedicationRequestClient.
    medication_request_service = providers.Factory(
        MedicationRequestService,
        client=medication_request_client,
    )
