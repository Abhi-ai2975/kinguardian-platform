"""
FastAPI dependency bridge for the Practitioner domain.

Connects dependency-injector's Container to FastAPI's Depends() system.
Route handlers use `Depends(get_practitioner_service)` to receive a wired
PractitionerService without knowing how it was constructed.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.practitioner_service import PractitionerService


@inject
def get_practitioner_service(
    service: PractitionerService = Depends(Provide[Container.practitioner.practitioner_service]),
) -> PractitionerService:
    """
    Resolve a PractitionerService instance from the DI container.

    Used as a FastAPI dependency via `Depends(get_practitioner_service)`.
    dependency-injector replaces the default parameter with a Factory-built
    PractitionerService at request time.

    Returns:
        A fully initialised PractitionerService ready to handle the request.
    """
    return service
