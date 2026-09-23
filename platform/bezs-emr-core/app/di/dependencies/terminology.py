from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.terminology_service import TerminologyService


@inject
def get_terminology_service(
    service: TerminologyService = Depends(Provide[Container.terminology.terminology_service]),
) -> TerminologyService:
    return service
