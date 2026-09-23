"""
Dependency-injection sub-container for the Encounter domain.

Wires EncounterClient and EncounterService as Factory providers so each request
receives a fresh, stateless instance. The shared FhirClient Singleton (in
CoreContainer) is reused across all domain containers — no extra HTTP connections
are opened.
"""

from dependency_injector import containers, providers

from app.fhir_client.encounter import EncounterClient
from app.services.encounter_service import EncounterService


class EncounterContainer(containers.DeclarativeContainer):
    """
    DI sub-container for Encounter resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client` (the Singleton HTTP client).

    All providers are Factory (not Singleton) — EncounterClient and EncounterService
    are stateless, so per-injection creation is safe and avoids cross-request
    state leakage.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for Encounter endpoints on the fhir-server.
    encounter_client = providers.Factory(
        EncounterClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and EncounterClient.
    encounter_service = providers.Factory(
        EncounterService,
        client=encounter_client,
    )
