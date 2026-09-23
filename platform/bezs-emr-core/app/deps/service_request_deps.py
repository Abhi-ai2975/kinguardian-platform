from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.service_request import get_service_request_service
from app.models.service_request.service_request import ServiceRequestModel
from app.services.service_request_service import ServiceRequestService


async def resolve_service_request(
    service_request_id: int = Path(..., ge=1, description="Public service request identifier."),
    service_request_service: ServiceRequestService = Depends(get_service_request_service),
) -> ServiceRequestModel:
    """Load service request by public id or raise 404."""
    sr = await service_request_service.get_raw_by_service_request_id(service_request_id)
    if not sr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="ServiceRequest not found"
        )
    return sr
