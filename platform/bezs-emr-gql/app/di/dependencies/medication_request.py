"""
FastAPI dependency bridge for MedicationRequestService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare:
    service: MedicationRequestService = Depends(get_medication_request_service)
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.medication_request_service import MedicationRequestService


@inject
def get_medication_request_service(
    service: MedicationRequestService = Depends(Provide[Container.medication_request.medication_request_service]),
) -> MedicationRequestService:
    """
    Resolve MedicationRequestService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the MedicationRequestClient
    (and its underlying FhirClient) automatically.
    """
    return service
