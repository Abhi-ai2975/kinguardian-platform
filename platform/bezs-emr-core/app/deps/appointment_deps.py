from fastapi import Depends, HTTPException, Path, status

from app.models.appointment.appointment import AppointmentModel
from app.services.appointment_service import AppointmentService
from app.di.dependencies.appointment import get_appointment_service


async def resolve_appointment(
    appointment_id: int = Path(..., ge=1, description="Public appointment identifier."),
    appointment_service: AppointmentService = Depends(get_appointment_service),
) -> AppointmentModel:
    """Load appointment by public id or raise 404."""
    appointment = await appointment_service.get_raw_by_appointment_id(appointment_id)
    if not appointment:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Appointment not found"
        )
    return appointment
