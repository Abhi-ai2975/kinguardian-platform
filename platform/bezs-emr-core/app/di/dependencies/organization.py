from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.organization_service import OrganizationService


@inject
def get_organization_service(
    service: OrganizationService = Depends(Provide[Container.organization.organization_service]),
) -> OrganizationService:
    return service
