from typing import List, Optional, Tuple

from app.fhir.mappers.provenance import (
    to_fhir_provenance,
    to_plain_provenance,
)
from app.models.provenance.provenance import ProvenanceModel
from app.repository.provenance_repository import ProvenanceRepository
from app.schemas.provenance.input import (
    ProvenanceCreateSchema,
    ProvenancePatchSchema,
)


class ProvenanceService:
    def __init__(self, repository: ProvenanceRepository):
        self.repository = repository

    def _to_fhir(self, model: ProvenanceModel) -> dict:
        return to_fhir_provenance(model)

    def _to_plain(self, model: ProvenanceModel) -> dict:
        return to_plain_provenance(model)

    async def get_raw_by_provenance_id(self, provenance_id: int) -> Optional[ProvenanceModel]:
        return await self.repository.get_by_provenance_id(provenance_id)

    async def get_provenance(self, provenance_id: int) -> Optional[ProvenanceModel]:
        return await self.repository.get_by_provenance_id(provenance_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProvenanceModel], int]:
        return await self.repository.get_me(user_id, org_id, limit=limit, offset=offset)

    async def list_provenances(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ProvenanceModel], int]:
        return await self.repository.list(user_id=user_id, org_id=org_id, limit=limit, offset=offset)

    async def create_provenance(
        self,
        data: ProvenanceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ProvenanceModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_provenance(
        self,
        provenance_id: int,
        data: ProvenancePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ProvenanceModel]:
        return await self.repository.patch(provenance_id, data, updated_by)

    async def delete_provenance(self, provenance_id: int) -> None:
        await self.repository.delete(provenance_id)
