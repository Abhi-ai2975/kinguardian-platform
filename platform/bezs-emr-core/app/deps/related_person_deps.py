from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.related_person import get_related_person_service
from app.models.related_person.related_person import RelatedPersonModel
from app.services.related_person_service import RelatedPersonService


async def resolve_related_person(
    related_person_id: int = Path(..., ge=1, description="Public RelatedPerson identifier."),
    service: RelatedPersonService = Depends(get_related_person_service),
) -> RelatedPersonModel:
    rp = await service.get_related_person(related_person_id)
    if not rp:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"RelatedPerson {related_person_id} not found.",
        )
    return rp
