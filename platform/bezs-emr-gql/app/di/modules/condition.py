"""
Dependency-injection sub-container for the Condition domain.

Wires ConditionClient and ConditionService as Factory providers so each request
receives a fresh, stateless instance.
"""

from dependency_injector import containers, providers

from app.fhir_client.condition import ConditionClient
from app.services.condition_service import ConditionService


class ConditionContainer(containers.DeclarativeContainer):
    """
    DI sub-container for Condition resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client`.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for Condition endpoints on the fhir-server.
    condition_client = providers.Factory(
        ConditionClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and ConditionClient.
    condition_service = providers.Factory(
        ConditionService,
        client=condition_client,
    )
