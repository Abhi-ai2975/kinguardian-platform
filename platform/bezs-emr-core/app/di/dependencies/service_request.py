from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.service_request_service import ServiceRequestService


@inject
def get_service_request_service(
    service: ServiceRequestService = Depends(Provide[Container.service_request.service_request_service]),
) -> ServiceRequestService:
    return service
