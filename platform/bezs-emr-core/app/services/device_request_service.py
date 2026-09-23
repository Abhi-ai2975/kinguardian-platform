from datetime import datetime
from typing import List, Optional, Tuple

from app.fhir.mappers.device_request import to_fhir_device_request, to_plain_device_request
from app.models.device_request.device_request import DeviceRequestModel
from app.repository.device_request_repository import DeviceRequestRepository
from app.schemas.device_request import DeviceRequestCreateSchema, DeviceRequestPatchSchema


class DeviceRequestService:
    def __init__(self, repository: DeviceRequestRepository):
        self.repository = repository

    def _to_fhir(self, dr: DeviceRequestModel) -> dict:
        return to_fhir_device_request(dr)

    def _to_plain(self, dr: DeviceRequestModel) -> dict:
        return to_plain_device_request(dr)

    async def get_raw_by_device_request_id(self, device_request_id: int) -> Optional[DeviceRequestModel]:
        """Raw ORM model — used by the auth ownership dependency."""
        return await self.repository.get_by_device_request_id(device_request_id)

    async def get_device_request(self, device_request_id: int) -> Optional[DeviceRequestModel]:
        return await self.repository.get_by_device_request_id(device_request_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DeviceRequestModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            dr_status=dr_status,
            patient_id=patient_id,
            authored_from=authored_from,
            authored_to=authored_to,
            limit=limit,
            offset=offset,
        )

    async def list_device_requests(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        dr_status: Optional[str] = None,
        patient_id: Optional[int] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DeviceRequestModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            dr_status=dr_status,
            patient_id=patient_id,
            authored_from=authored_from,
            authored_to=authored_to,
            limit=limit,
            offset=offset,
        )

    async def create_device_request(
        self,
        payload: DeviceRequestCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> DeviceRequestModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_device_request(
        self,
        device_request_id: int,
        payload: DeviceRequestPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[DeviceRequestModel]:
        return await self.repository.patch(device_request_id, payload, updated_by)

    async def delete_device_request(self, device_request_id: int) -> bool:
        return await self.repository.delete(device_request_id)
