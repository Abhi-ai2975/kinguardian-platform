from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.immunization import get_immunization_service
from app.models.immunization.immunization import ImmunizationModel
from app.services.immunization_service import ImmunizationService


async def resolve_immunization(
    immunization_id: int = Path(..., ge=1, description="Public Immunization identifier."),
    service: ImmunizationService = Depends(get_immunization_service),
) -> ImmunizationModel:
    imm = await service.get_immunization(immunization_id)
    if imm is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Immunization not found")
    return imm
