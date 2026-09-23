from typing import List, Optional, Tuple

from app.fhir.mappers.healthcare_service import (
    to_fhir_healthcare_service,
    to_plain_healthcare_service,
)
from app.models.healthcare_service.healthcare_service import HealthcareServiceModel
from app.repository.healthcare_service_repository import HealthcareServiceRepository
from app.schemas.healthcare_service import (
    HealthcareServiceCreateSchema,
    HealthcareServicePatchSchema,
)


class HealthcareServiceService:
    def __init__(self, repository: HealthcareServiceRepository):
        self.repository = repository

    def _to_fhir(self, hs: HealthcareServiceModel) -> dict:
        return to_fhir_healthcare_service(hs)

    def _to_plain(self, hs: HealthcareServiceModel) -> dict:
        return to_plain_healthcare_service(hs)

    async def get_raw_by_healthcare_service_id(
        self, healthcare_service_id: int
    ) -> Optional[HealthcareServiceModel]:
        return await self.repository.get_by_healthcare_service_id(healthcare_service_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[HealthcareServiceModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            active=active, name=name,
            limit=limit, offset=offset,
        )

    async def list_healthcare_services(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[HealthcareServiceModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id,
            active=active, name=name,
            limit=limit, offset=offset,
        )

    async def create_healthcare_service(
        self,
        payload: HealthcareServiceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> HealthcareServiceModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_healthcare_service(
        self,
        healthcare_service_id: int,
        payload: HealthcareServicePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[HealthcareServiceModel]:
        return await self.repository.patch(healthcare_service_id, payload, updated_by)

    async def delete_healthcare_service(self, healthcare_service_id: int) -> None:
        await self.repository.delete(healthcare_service_id)
