from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.medication_request import to_fhir_medication_request, to_plain_medication_request
from app.models.medication_request.medication_request import MedicationRequestModel
from app.repository.medication_request_repository import MedicationRequestRepository
from app.schemas.medication_request import MedicationRequestCreateSchema, MedicationRequestPatchSchema


class MedicationRequestService:
    def __init__(self, repository: MedicationRequestRepository):
        self.repository = repository

    def _to_fhir(self, mr: MedicationRequestModel) -> dict:
        return to_fhir_medication_request(mr)

    def _to_plain(self, mr: MedicationRequestModel) -> dict:
        return to_plain_medication_request(mr)

    async def get_raw_by_medication_request_id(self, medication_request_id: int) -> Optional[MedicationRequestModel]:
        return await self.repository.get_by_medication_request_id(medication_request_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        mr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationRequestModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            mr_status=mr_status,
            patient_id=patient_id,
            authored_from=authored_from,
            authored_to=authored_to,
            limit=limit,
            offset=offset,
        )

    async def list_medication_requests(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        mr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[MedicationRequestModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            mr_status=mr_status,
            patient_id=patient_id,
            encounter_id=encounter_id,
            authored_from=authored_from,
            authored_to=authored_to,
            limit=limit,
            offset=offset,
        )

    async def create_medication_request(
        self,
        payload: MedicationRequestCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> MedicationRequestModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_medication_request(
        self,
        medication_request_id: int,
        payload: MedicationRequestPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[MedicationRequestModel]:
        return await self.repository.patch(medication_request_id, payload, updated_by)

    async def delete_medication_request(self, medication_request_id: int) -> None:
        await self.repository.delete(medication_request_id)
