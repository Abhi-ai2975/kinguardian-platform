from typing import List, Optional, Tuple

from app.fhir.mappers.claim_response import to_fhir_claim_response, to_plain_claim_response
from app.models.claim_response.claim_response import ClaimResponseModel
from app.repository.claim_response_repository import ClaimResponseRepository
from app.schemas.claim_response.input import ClaimResponseCreateSchema, ClaimResponsePatchSchema


class ClaimResponseService:
    def __init__(self, repository: ClaimResponseRepository):
        self.repository = repository

    def _to_fhir(self, claim_response: ClaimResponseModel) -> dict:
        return to_fhir_claim_response(claim_response)

    def _to_plain(self, claim_response: ClaimResponseModel) -> dict:
        return to_plain_claim_response(claim_response)

    async def get_raw_by_claim_response_id(
        self, claim_response_id: int
    ) -> Optional[ClaimResponseModel]:
        return await self.repository.get_by_claim_response_id(claim_response_id)

    async def get_claim_response(
        self, claim_response_id: int
    ) -> Optional[ClaimResponseModel]:
        return await self.repository.get_by_claim_response_id(claim_response_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        cr_status: Optional[str] = None,
        use: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimResponseModel], int]:
        return await self.repository.get_me(
            user_id,
            org_id,
            cr_status=cr_status,
            use=use,
            outcome=outcome,
            limit=limit,
            offset=offset,
        )

    async def list_claim_responses(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        cr_status: Optional[str] = None,
        use: Optional[str] = None,
        outcome: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[ClaimResponseModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            cr_status=cr_status,
            use=use,
            outcome=outcome,
            limit=limit,
            offset=offset,
        )

    async def create_claim_response(
        self,
        data: ClaimResponseCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> ClaimResponseModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_claim_response(
        self,
        claim_response_id: int,
        data: ClaimResponsePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[ClaimResponseModel]:
        return await self.repository.patch(claim_response_id, data, updated_by)

    async def delete_claim_response(self, claim_response_id: int) -> None:
        await self.repository.delete(claim_response_id)
