from dependency_injector.wiring import inject, Provide
from fastapi import Depends
from app.services.appointment_service import AppointmentService
from app.di.container import Container


@inject
def get_appointment_service(
    service: AppointmentService = Depends(Provide[Container.appointment.appointment_service]),
) -> AppointmentService:
    return service
