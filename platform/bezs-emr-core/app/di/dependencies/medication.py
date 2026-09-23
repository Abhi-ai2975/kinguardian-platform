from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.medication_service import MedicationService


@inject
def get_medication_service(
    service: MedicationService = Depends(Provide[Container.medication.medication_service]),
) -> MedicationService:
    return service
