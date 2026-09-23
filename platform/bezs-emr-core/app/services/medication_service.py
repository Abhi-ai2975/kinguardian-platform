from typing import List, Optional, Tuple

from app.fhir.mappers.medication import to_fhir_medication, to_plain_medication
from app.models.medication.medication import MedicationModel
from app.repository.medication_repository import MedicationRepository
from app.schemas.medication.input import MedicationCreateSchema, MedicationPatchSchema


class MedicationService:
    def __init__(self, repository: MedicationRepository):
        self.repository = repository

    def _to_fhir(self, medication: MedicationModel) -> dict:
        return to_fhir_medication(medication)

    def _to_plain(self, medication: MedicationModel) -> dict:
        return to_plain_medication(medication)

    async def get_raw_by_medication_id(self, medication_id: int) -> Optional[MedicationModel]:
        return await self.repository.get_by_medication_id(medication_id)

    async def get_medication(self, medication_id: int) -> Optional[MedicationModel]:
        return await self.repository.get_by_medication_id(medication_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        medication_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationModel], int]:
        return await self.repository.get_me(
            user_id, org_id, medication_status=medication_status, limit=limit, offset=offset
        )

    async def list_medications(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        medication_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            medication_status=medication_status,
            limit=limit,
            offset=offset,
        )

    async def create_medication(
        self,
        data: MedicationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> MedicationModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_medication(
        self,
        medication_id: int,
        data: MedicationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[MedicationModel]:
        return await self.repository.patch(medication_id, data, updated_by)

    async def delete_medication(self, medication_id: int) -> None:
        await self.repository.delete(medication_id)
