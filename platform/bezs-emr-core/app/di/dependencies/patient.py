from dependency_injector.wiring import inject, Provide
from fastapi import Depends
from app.services.patient_service import PatientService
from app.di.container import Container


@inject
def get_patient_service(
    service: PatientService = Depends(Provide[Container.patient.patient_service]),
) -> PatientService:
    return service
