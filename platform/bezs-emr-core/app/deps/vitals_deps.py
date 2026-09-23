from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.vitals import get_vitals_service
from app.models.vitals.vitals import VitalsModel
from app.services.vitals_service import VitalsService


async def resolve_vitals(
    vitals_id: int = Path(..., ge=1, description="Public vitals identifier."),
    vitals_service: VitalsService = Depends(get_vitals_service),
) -> VitalsModel:
    """Load vitals entry by public id or raise 404."""
    vitals = await vitals_service.get_raw_by_vitals_id(vitals_id)
    if not vitals:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Vitals not found")
    return vitals
