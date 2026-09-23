"""
FastAPI dependency bridge for the Slot domain.

Connects dependency-injector's Container to FastAPI's Depends() system.
Route handlers import `get_slot_service` and declare it as a Depends() argument
to receive a fully-wired SlotService without knowing how it was constructed.

The @inject decorator is required for dependency-injector to resolve
Provide[Container.slot.slot_service] at call time.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.slot_service import SlotService


@inject
def get_slot_service(
    service: SlotService = Depends(Provide[Container.slot.slot_service]),
) -> SlotService:
    """
    Resolve a SlotService instance from the DI container.

    This function is used as a FastAPI dependency via `Depends(get_slot_service)`.
    dependency-injector replaces the default parameter with a Factory-built
    SlotService (backed by a Singleton FhirClient) at request time.

    Returns:
        A fully initialised SlotService ready to handle the request.
    """
    return service
