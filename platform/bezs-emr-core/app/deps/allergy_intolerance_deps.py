from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.allergy_intolerance import get_allergy_intolerance_service
from app.models.allergy_intolerance.allergy_intolerance import AllergyIntoleranceModel
from app.services.allergy_intolerance_service import AllergyIntoleranceService


async def resolve_allergy_intolerance(
    allergy_intolerance_id: int = Path(..., ge=1, description="Public AllergyIntolerance identifier."),
    allergy_intolerance_service: AllergyIntoleranceService = Depends(get_allergy_intolerance_service),
) -> AllergyIntoleranceModel:
    """Load AllergyIntolerance by public id or raise 404."""
    ai = await allergy_intolerance_service.get_raw_by_allergy_intolerance_id(allergy_intolerance_id)
    if not ai:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="AllergyIntolerance not found"
        )
    return ai
