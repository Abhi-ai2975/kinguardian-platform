"""
DI sub-container for the Schedule domain.

Declares the dependency graph for everything related to FHIR Schedule resources:
  ScheduleClient  ← depends on → FhirClient   (from CoreContainer via `core`)
  ScheduleService ← depends on → ScheduleClient

Both providers use Factory (not Singleton) because both are stateless — per-injection
creation is cheap and avoids any possibility of cross-request state leakage.
The underlying FhirClient (Singleton in CoreContainer) is shared regardless.

This container is wired into the root Container (app.di.container) as `schedule`.
"""

from dependency_injector import containers, providers

from app.fhir_client.schedule import ScheduleClient
from app.services.schedule_service import ScheduleService


class ScheduleContainer(containers.DeclarativeContainer):
    """
    Assembles the dependency graph for Schedule CRUD operations.

    `core` is a DependenciesContainer placeholder filled in by the root Container via:
        providers.Container(ScheduleContainer, core=core)
    This allows ScheduleContainer to reference `core.fhir_client` without importing
    CoreContainer directly, keeping domain modules decoupled from infrastructure.
    """

    # Placeholder replaced with the actual CoreContainer instance at wiring time.
    core = providers.DependenciesContainer()

    # Factory provider for ScheduleClient.
    # Receives the shared FhirClient singleton from CoreContainer so all
    # Schedule HTTP calls flow through the same connection pool.
    schedule_client = providers.Factory(
        ScheduleClient,
        fhir=core.fhir_client,
    )

    # Factory provider for ScheduleService.
    # Receives a fresh ScheduleClient (backed by the singleton FhirClient) each time.
    schedule_service = providers.Factory(
        ScheduleService,
        client=schedule_client,
    )
