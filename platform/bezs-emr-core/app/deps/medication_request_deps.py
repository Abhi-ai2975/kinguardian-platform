from fastapi import Depends, HTTPException, Path, status

from app.di.dependencies.medication_request import get_medication_request_service
from app.models.medication_request.medication_request import MedicationRequestModel
from app.services.medication_request_service import MedicationRequestService


async def resolve_medication_request(
    medication_request_id: int = Path(..., ge=1, description="Public medication request identifier."),
    medication_request_service: MedicationRequestService = Depends(get_medication_request_service),
) -> MedicationRequestModel:
    """Load medication request by public id or raise 404."""
    mr = await medication_request_service.get_raw_by_medication_request_id(medication_request_id)
    if not mr:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="MedicationRequest not found"
        )
    return mr
