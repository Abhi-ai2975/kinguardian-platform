from fastapi import Depends, HTTPException, Path, status
from app.models.practitioner import PractitionerModel
from app.services.practitioner_service import PractitionerService
from app.di.dependencies.practitioner import get_practitioner_service


async def resolve_practitioner(
    practitioner_id: int = Path(..., ge=1, description="Public practitioner identifier."),
    practitioner_service: PractitionerService = Depends(get_practitioner_service),
) -> PractitionerModel:
    """Load practitioner by public id or raise 404."""
    practitioner = await practitioner_service.get_raw_by_practitioner_id(practitioner_id)
    if not practitioner:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Practitioner not found")
    return practitioner
