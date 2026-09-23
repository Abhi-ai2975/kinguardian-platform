from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.claim_service import ClaimService


@inject
def get_claim_service(
    service: ClaimService = Depends(Provide[Container.claim.claim_service]),
) -> ClaimService:
    return service
