from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.healthcare_service import get_healthcare_service_service
from app.models.healthcare_service.healthcare_service import HealthcareServiceModel
from app.services.healthcare_service_service import HealthcareServiceService


async def resolve_healthcare_service(
    healthcare_service_id: int = Path(..., ge=1, description="Public healthcare service identifier."),
    hs_service: HealthcareServiceService = Depends(get_healthcare_service_service),
) -> HealthcareServiceModel:
    """Load healthcare service by public id or raise 404."""
    hs = await hs_service.get_raw_by_healthcare_service_id(healthcare_service_id)
    if not hs:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="HealthcareService not found"
        )
    return hs
