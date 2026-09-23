"""
DI sub-container for the Slot domain.

Declares Factory providers for SlotClient, ScheduleClient, PractitionerRoleClient,
and SlotService. Factory is used (not Singleton) because all classes are stateless —
a new instance per injection is safe and avoids cross-request state leakage. The
underlying FhirClient is a Singleton (provided by CoreContainer) so all resource
types share the same HTTP connection pool.

ScheduleClient and PractitionerRoleClient are wired into SlotService so the
generate() method can fetch Schedule/PractitionerRole data for auto-inheriting
service_category, service_type, and specialty when generating slots.

The `core` DependenciesContainer is a placeholder replaced by the root Container
at wiring time, giving this child container access to the shared FhirClient.
"""

from dependency_injector import containers, providers

from app.fhir_client.practitioner_role import PractitionerRoleClient
from app.fhir_client.schedule import ScheduleClient
from app.fhir_client.slot import SlotClient
from app.services.slot_service import SlotService


class SlotContainer(containers.DeclarativeContainer):
    """
    Dependency-injection sub-container for the Slot resource domain.

    Provides:
      - slot_client:     SlotClient — CRUD operations for Slot resources.
      - schedule_client: ScheduleClient — used by generate() to fetch the
                         target Schedule and read planningHorizon + actors.
      - pr_client:       PractitionerRoleClient — used by generate() to read
                         specialty[] when the Schedule does not carry its own.
      - slot_service:    SlotService — all Slot business logic including bulk
                         auto-generation.

    All are Factory providers — instantiated fresh per injection, correct for
    stateless service/client objects.
    """

    # Placeholder wired to the root Container's `core` sub-container at startup.
    # Gives access to core.fhir_client without creating a second FhirClient instance.
    core = providers.DependenciesContainer()

    # SlotClient — thin HTTP wrapper for Slot CRUD; shares the FhirClient singleton.
    slot_client = providers.Factory(
        SlotClient,
        fhir=core.fhir_client,
    )

    # ScheduleClient — used by SlotService.generate() to fetch the target Schedule.
    # Reuses the same FhirClient singleton — no extra connection overhead.
    schedule_client = providers.Factory(
        ScheduleClient,
        fhir=core.fhir_client,
    )

    # PractitionerRoleClient — used by SlotService.generate() to resolve specialty
    # from a PractitionerRole actor when the Schedule has no specialty of its own.
    pr_client = providers.Factory(
        PractitionerRoleClient,
        fhir=core.fhir_client,
    )

    # SlotService — business logic layer; receives all three clients above.
    slot_service = providers.Factory(
        SlotService,
        client=slot_client,
        schedule_client=schedule_client,
        pr_client=pr_client,
    )
