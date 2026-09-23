from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.device_request_service import DeviceRequestService


@inject
def get_device_request_service(
    service: DeviceRequestService = Depends(Provide[Container.device_request.device_request_service]),
) -> DeviceRequestService:
    return service
