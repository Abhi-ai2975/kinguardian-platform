from datetime import datetime
from typing import Optional, List, Tuple

from app.models.appointment.appointment import AppointmentModel
from app.repository.appointment_repository import AppointmentRepository
from app.schemas.appointment import AppointmentCreateSchema, AppointmentPatchSchema
from app.fhir.mappers.appointment import to_fhir_appointment, to_plain_appointment


class AppointmentService:
    def __init__(self, repository: AppointmentRepository):
        self.repository = repository

    # ── Formatters (called by route layer after content negotiation) ──────

    def _to_fhir(self, appointment: AppointmentModel) -> dict:
        return to_fhir_appointment(appointment)

    def _to_plain(self, appointment: AppointmentModel) -> dict:
        return to_plain_appointment(appointment)

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_raw_by_appointment_id(
        self, appointment_id: int
    ) -> Optional[AppointmentModel]:
        """Raw ORM model — used by the auth ownership dependency."""
        return await self.repository.get_by_appointment_id(appointment_id)

    async def get_appointment(self, appointment_id: int) -> Optional[AppointmentModel]:
        return await self.repository.get_by_appointment_id(appointment_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        start_from: Optional[datetime] = None,
        start_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AppointmentModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            status=status, patient_id=patient_id,
            start_from=start_from, start_to=start_to,
            limit=limit, offset=offset,
        )

    async def list_appointments(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        practitioner_id: Optional[int] = None,
        start_from: Optional[datetime] = None,
        start_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[AppointmentModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id, status=status, patient_id=patient_id,
            practitioner_id=practitioner_id,
            start_from=start_from, start_to=start_to, limit=limit, offset=offset,
        )

    # ── Write ─────────────────────────────────────────────────────────────

    async def create_appointment(
        self,
        payload: AppointmentCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> AppointmentModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_appointment(
        self, appointment_id: int, payload: AppointmentPatchSchema, updated_by: Optional[str] = None
    ) -> Optional[AppointmentModel]:
        return await self.repository.patch(appointment_id, payload, updated_by)

    async def delete_appointment(self, appointment_id: int) -> bool:
        return await self.repository.delete(appointment_id)
