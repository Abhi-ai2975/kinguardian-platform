"""
FastAPI dependency bridge for the PractitionerRole domain.

Connects dependency-injector's Container to FastAPI's Depends() system.
Route handlers use `Depends(get_practitioner_role_service)` to receive a
wired PractitionerRoleService without knowing how it was constructed.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.practitioner_role_service import PractitionerRoleService


@inject
def get_practitioner_role_service(
    service: PractitionerRoleService = Depends(
        Provide[Container.practitioner_role.practitioner_role_service]
    ),
) -> PractitionerRoleService:
    """
    Resolve a PractitionerRoleService instance from the DI container.

    Used as a FastAPI dependency via `Depends(get_practitioner_role_service)`.
    dependency-injector replaces the default parameter with a Factory-built
    PractitionerRoleService at request time.

    Returns:
        A fully initialised PractitionerRoleService ready to handle the request.
    """
    return service
