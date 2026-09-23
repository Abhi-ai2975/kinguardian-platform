from typing import List, Optional, Tuple

from app.fhir.mappers.organization import to_fhir_organization, to_plain_organization
from app.models.organization.organization import OrganizationModel
from app.repository.organization_repository import OrganizationRepository
from app.schemas.organization import OrganizationCreateSchema, OrganizationPatchSchema


class OrganizationService:
    def __init__(self, repository: OrganizationRepository):
        self.repository = repository

    def _to_fhir(self, org: OrganizationModel) -> dict:
        return to_fhir_organization(org)

    def _to_plain(self, org: OrganizationModel) -> dict:
        return to_plain_organization(org)

    async def get_raw_by_organization_id(self, organization_id: int) -> Optional[OrganizationModel]:
        return await self.repository.get_by_organization_id(organization_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[OrganizationModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            active=active,
            name=name,
            limit=limit,
            offset=offset,
        )

    async def list_organizations(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        active: Optional[bool] = None,
        name: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[OrganizationModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            active=active,
            name=name,
            limit=limit,
            offset=offset,
        )

    async def create_organization(
        self,
        payload: OrganizationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> OrganizationModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_organization(
        self,
        organization_id: int,
        payload: OrganizationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[OrganizationModel]:
        return await self.repository.patch(organization_id, payload, updated_by)

    async def delete_organization(self, organization_id: int) -> None:
        await self.repository.delete(organization_id)
