from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.location_service import LocationService


@inject
def get_location_service(
    service: LocationService = Depends(Provide[Container.location.location_service]),
) -> LocationService:
    return service
