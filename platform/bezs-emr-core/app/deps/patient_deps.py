from fastapi import Depends, HTTPException, Path, status
from app.models.patient.patient import PatientModel
from app.services.patient_service import PatientService
from app.di.dependencies.patient import get_patient_service


async def resolve_patient(
    patient_id: int = Path(..., ge=1, description="Public patient identifier."),
    patient_service: PatientService = Depends(get_patient_service),
) -> PatientModel:
    """Load patient by public id or raise 404."""
    patient = await patient_service.get_raw_by_patient_id(patient_id)
    if not patient:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Patient not found")
    return patient
