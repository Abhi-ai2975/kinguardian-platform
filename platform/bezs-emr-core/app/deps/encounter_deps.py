from fastapi import Depends, HTTPException, Path, status

from app.models.encounter.encounter import EncounterModel
from app.services.encounter_service import EncounterService
from app.di.dependencies.encounter import get_encounter_service


async def resolve_encounter(
    encounter_id: int = Path(..., ge=1, description="Public encounter identifier."),
    encounter_service: EncounterService = Depends(get_encounter_service),
) -> EncounterModel:
    """Load encounter by public id or raise 404."""
    encounter = await encounter_service.get_raw_by_encounter_id(encounter_id)
    if not encounter:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Encounter not found"
        )
    return encounter
