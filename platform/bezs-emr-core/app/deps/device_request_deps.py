from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.device_request import get_device_request_service
from app.models.device_request.device_request import DeviceRequestModel
from app.services.device_request_service import DeviceRequestService


async def resolve_device_request(
    device_request_id: int = Path(..., ge=1, description="Public device request identifier."),
    device_request_service: DeviceRequestService = Depends(get_device_request_service),
) -> DeviceRequestModel:
    """Load device request by public id or raise 404."""
    dr = await device_request_service.get_raw_by_device_request_id(device_request_id)
    if not dr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="DeviceRequest not found"
        )
    return dr
