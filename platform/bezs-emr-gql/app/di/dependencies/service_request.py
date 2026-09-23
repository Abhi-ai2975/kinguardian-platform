"""
FastAPI dependency bridge for ServiceRequestService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: ServiceRequestService = Depends(get_service_request_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.service_request_service import ServiceRequestService


@inject
def get_service_request_service(
    service: ServiceRequestService = Depends(Provide[Container.service_request.service_request_service]),
) -> ServiceRequestService:
    """
    Resolve ServiceRequestService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the ServiceRequestClient
    (and its underlying FhirClient) automatically.
    """
    return service
