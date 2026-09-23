from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.medication_request_service import MedicationRequestService


@inject
def get_medication_request_service(
    service: MedicationRequestService = Depends(Provide[Container.medication_request.medication_request_service]),
) -> MedicationRequestService:
    return service
