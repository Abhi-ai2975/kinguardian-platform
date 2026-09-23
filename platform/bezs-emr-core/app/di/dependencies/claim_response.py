from dependency_injector.wiring import inject, Provide
from fastapi import Depends

from app.di.container import Container
from app.services.claim_response_service import ClaimResponseService


@inject
def get_claim_response_service(
    service: ClaimResponseService = Depends(Provide[Container.claim_response.claim_response_service]),
) -> ClaimResponseService:
    return service
