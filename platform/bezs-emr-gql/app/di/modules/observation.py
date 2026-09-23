"""
Dependency-injection sub-container for the Observation domain.

Wires ObservationClient and ObservationService as Factory providers so each
request receives a fresh, stateless instance.
"""

from dependency_injector import containers, providers

from app.fhir_client.observation import ObservationClient
from app.services.observation_service import ObservationService


class ObservationContainer(containers.DeclarativeContainer):
    """
    DI sub-container for Observation resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client`.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for Observation endpoints on the fhir-server.
    observation_client = providers.Factory(
        ObservationClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and ObservationClient.
    observation_service = providers.Factory(
        ObservationService,
        client=observation_client,
    )
