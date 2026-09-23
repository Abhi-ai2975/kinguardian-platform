"""
FastAPI dependency bridge for AppointmentService.

Translates the dependency-injector provider into a FastAPI Depends()-compatible
callable so route handlers can declare `service: AppointmentService = Depends(get_appointment_service)`.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.appointment_service import AppointmentService


@inject
def get_appointment_service(
    service: AppointmentService = Depends(Provide[Container.appointment.appointment_service]),
) -> AppointmentService:
    """
    Resolve AppointmentService from the DI container for use in route handlers.

    dependency-injector handles instantiation and wires the AppointmentClient
    (and its underlying FhirClient) automatically.
    """
    return service
