from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.service_request import to_fhir_service_request, to_plain_service_request
from app.models.service_request.service_request import ServiceRequestModel
from app.repository.service_request_repository import ServiceRequestRepository
from app.schemas.service_request import ServiceRequestCreateSchema, ServiceRequestPatchSchema


class ServiceRequestService:
    def __init__(self, repository: ServiceRequestRepository):
        self.repository = repository

    def _to_fhir(self, sr: ServiceRequestModel) -> dict:
        return to_fhir_service_request(sr)

    def _to_plain(self, sr: ServiceRequestModel) -> dict:
        return to_plain_service_request(sr)

    async def get_raw_by_service_request_id(self, service_request_id: int) -> Optional[ServiceRequestModel]:
        """Raw ORM model — used by the auth ownership dependency."""
        return await self.repository.get_by_service_request_id(service_request_id)

    async def get_service_request(self, service_request_id: int) -> Optional[ServiceRequestModel]:
        return await self.repository.get_by_service_request_id(service_request_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        sr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ServiceRequestModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            sr_status=sr_status,
            patient_id=patient_id,
            authored_from=authored_from,
            authored_to=authored_to,
            limit=limit,
            offset=offset,
        )

    async def list_service_requests(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        sr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        encounter_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ServiceRequestModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            sr_status=sr_status,
            patient_id=patient_id,
            encounter_id=encounter_id,
            authored_from=authored_from,
            authored_to=authored_to,
            limit=limit,
            offset=offset,
        )

    async def create_service_request(
        self,
        payload: ServiceRequestCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> ServiceRequestModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_service_request(
        self,
        service_request_id: int,
        payload: ServiceRequestPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[ServiceRequestModel]:
        return await self.repository.patch(service_request_id, payload, updated_by)

    async def delete_service_request(self, service_request_id: int) -> bool:
        return await self.repository.delete(service_request_id)
