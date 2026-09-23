from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.medication import get_medication_service
from app.models.medication.medication import MedicationModel
from app.services.medication_service import MedicationService


async def resolve_medication(
    medication_id: int = Path(..., ge=1, description="Public medication identifier."),
    medication_service: MedicationService = Depends(get_medication_service),
) -> MedicationModel:
    """Load medication by public id or raise 404."""
    medication = await medication_service.get_raw_by_medication_id(medication_id)
    if not medication:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Medication not found"
        )
    return medication
