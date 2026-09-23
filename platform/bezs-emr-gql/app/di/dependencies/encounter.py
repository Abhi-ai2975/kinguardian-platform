"""
FastAPI dependency bridge for EncounterService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: EncounterService = Depends(get_encounter_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.encounter_service import EncounterService


@inject
def get_encounter_service(
    service: EncounterService = Depends(Provide[Container.encounter.encounter_service]),
) -> EncounterService:
    """
    Resolve EncounterService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the EncounterClient
    (and its underlying FhirClient) automatically.
    """
    return service
