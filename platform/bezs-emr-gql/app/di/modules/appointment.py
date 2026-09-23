"""
Dependency-injection sub-container for the Appointment domain.

Wires AppointmentClient, SlotClient, and AppointmentService as Factory providers
so each request receives a fresh, stateless instance. The shared FhirClient
Singleton (in CoreContainer) is reused across all domain containers.

SlotClient is included here (not imported from SlotContainer) because
AppointmentService uses it only during the /book flow — injecting it directly
avoids cross-container coupling while still sharing the FhirClient singleton.
"""

from dependency_injector import containers, providers

from app.fhir_client.appointment import AppointmentClient
from app.fhir_client.slot import SlotClient
from app.services.appointment_service import AppointmentService


class AppointmentContainer(containers.DeclarativeContainer):
    """
    DI sub-container for Appointment resources.

    `core` is a DependenciesContainer placeholder replaced by the root Container
    at wiring time, giving access to `core.fhir_client` (the Singleton HTTP client).

    All providers are Factory (not Singleton) — AppointmentClient, SlotClient, and
    AppointmentService are stateless, so per-injection creation is safe and
    avoids any cross-request state leakage.
    """

    # Placeholder resolved by the root Container when this sub-container is mounted.
    core = providers.DependenciesContainer()

    # Domain-specific HTTP client for Appointment endpoints on the fhir-server.
    appointment_client = providers.Factory(
        AppointmentClient,
        fhir=core.fhir_client,
    )

    # SlotClient needed by AppointmentService.book() to validate and mark slots.
    # Shares the same FhirClient singleton — no extra HTTP connections are opened.
    slot_client = providers.Factory(
        SlotClient,
        fhir=core.fhir_client,
    )

    # Business logic service — sits between the router and the two domain clients.
    appointment_service = providers.Factory(
        AppointmentService,
        client=appointment_client,
        slot_client=slot_client,
    )
