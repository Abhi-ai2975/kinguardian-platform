"""
FastAPI dependency bridge for ObservationService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: ObservationService = Depends(get_observation_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.observation_service import ObservationService


@inject
def get_observation_service(
    service: ObservationService = Depends(Provide[Container.observation.observation_service]),
) -> ObservationService:
    """
    Resolve ObservationService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the ObservationClient
    (and its underlying FhirClient) automatically.
    """
    return service
