from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.coverage_service import CoverageService


@inject
def get_coverage_service(
    service: CoverageService = Depends(Provide[Container.coverage.coverage_service]),
) -> CoverageService:
    return service
