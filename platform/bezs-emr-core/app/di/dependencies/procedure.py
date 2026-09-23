from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.procedure_service import ProcedureService


@inject
def get_procedure_service(
    service: ProcedureService = Depends(Provide[Container.procedure.procedure_service]),
) -> ProcedureService:
    return service
