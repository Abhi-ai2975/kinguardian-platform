from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.specimen import get_specimen_service
from app.models.specimen.specimen import SpecimenModel
from app.services.specimen_service import SpecimenService


async def resolve_specimen(
    specimen_id: int = Path(..., ge=1, description="Public Specimen identifier."),
    service: SpecimenService = Depends(get_specimen_service),
) -> SpecimenModel:
    sp = await service.get_specimen(specimen_id)
    if sp is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Specimen not found")
    return sp
