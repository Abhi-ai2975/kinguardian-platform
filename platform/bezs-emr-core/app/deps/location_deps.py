from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.location import get_location_service
from app.models.location.location import LocationModel
from app.services.location_service import LocationService


async def resolve_location(
    location_id: int = Path(..., ge=1, description="Public location identifier."),
    location_service: LocationService = Depends(get_location_service),
) -> LocationModel:
    """Load location by public id or raise 404."""
    location = await location_service.get_raw_by_location_id(location_id)
    if not location:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Location not found"
        )
    return location
