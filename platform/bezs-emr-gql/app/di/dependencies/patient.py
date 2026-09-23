"""
FastAPI dependency factory for PatientService.

Bridges the dependency-injector container with FastAPI's Depends() system.
Route handlers use `Depends(get_patient_service)` to receive a fully-wired
PatientService instance without knowing how it is constructed.
"""

from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.patient_service import PatientService


@inject
def get_patient_service(
    service: PatientService = Depends(Provide[Container.patient.patient_service]),
) -> PatientService:
    """
    Resolve PatientService from the DI container for use in route handlers.

    The @inject decorator tells dependency-injector to replace the Provide[]
    sentinel with the actual PatientService instance from the container at
    call time. FastAPI's Depends() wraps this function so each request gets
    a fresh Factory-created instance.

    Returns:
        A fully-wired PatientService ready for use in a route handler.
    """
    return service
