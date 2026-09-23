from dependency_injector.wiring import Provide, inject
from fastapi import Depends

from app.di.container import Container
from app.services.provenance_service import ProvenanceService


@inject
def get_provenance_service(
    service: ProvenanceService = Depends(
        Provide[Container.provenance.provenance_service]
    ),
) -> ProvenanceService:
    return service
