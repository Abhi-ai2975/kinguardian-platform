from typing import List, Optional, Tuple

from app.fhir.mappers.claim import to_fhir_claim, to_plain_claim
from app.models.claim.claim import ClaimModel
from app.repository.claim_repository import ClaimRepository
from app.schemas.claim.input import ClaimCreateSchema, ClaimPatchSchema


class ClaimService:
    def __init__(self, repository: ClaimRepository):
        self.repository = repository

    def _to_fhir(self, claim: ClaimModel) -> dict:
        return to_fhir_claim(claim)

    def _to_plain(self, claim: ClaimModel) -> dict:
        return to_plain_claim(claim)

    async def get_raw_by_claim_id(self, claim_id: int) -> Optional[ClaimModel]:
        return await self.repository.get_by_claim_id(claim_id)

    async def get_claim(self, claim_id: int) -> Optional[ClaimModel]:
        return await self.repository.get_by_claim_id(claim_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        claim_status: Optional[str] = None,
        use: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimModel], int]:
        return await self.repository.get_me(
            user_id,
            org_id,
            claim_status=claim_status,
            claim_use=use,
            limit=limit,
            offset=offset,
        )

    async def list_claims(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        claim_status: Optional[str] = None,
        use: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            claim_status=claim_status,
            claim_use=use,
            limit=limit,
            offset=offset,
        )

    async def create_claim(
        self,
        data: ClaimCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ClaimModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_claim(
        self,
        claim_id: int,
        data: ClaimPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ClaimModel]:
        return await self.repository.patch(claim_id, data, updated_by)

    async def delete_claim(self, claim_id: int) -> None:
        await self.repository.delete(claim_id)
