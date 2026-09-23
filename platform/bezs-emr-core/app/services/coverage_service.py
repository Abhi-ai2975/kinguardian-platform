from typing import List, Optional, Tuple

from app.fhir.mappers.coverage import to_fhir_coverage, to_plain_coverage
from app.models.coverage.coverage import CoverageModel
from app.repository.coverage_repository import CoverageRepository
from app.schemas.coverage.input import CoverageCreateSchema, CoveragePatchSchema


class CoverageService:
    def __init__(self, repository: CoverageRepository):
        self.repository = repository

    def _to_fhir(self, coverage: CoverageModel) -> dict:
        return to_fhir_coverage(coverage)

    def _to_plain(self, coverage: CoverageModel) -> dict:
        return to_plain_coverage(coverage)

    async def get_raw_by_coverage_id(self, coverage_id: int) -> Optional[CoverageModel]:
        return await self.repository.get_by_coverage_id(coverage_id)

    async def get_coverage(self, coverage_id: int) -> Optional[CoverageModel]:
        return await self.repository.get_by_coverage_id(coverage_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        coverage_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CoverageModel], int]:
        return await self.repository.get_me(
            user_id, org_id, coverage_status=coverage_status, limit=limit, offset=offset
        )

    async def list_coverages(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        coverage_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[CoverageModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            coverage_status=coverage_status,
            limit=limit,
            offset=offset,
        )

    async def create_coverage(
        self,
        data: CoverageCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> CoverageModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_coverage(
        self,
        coverage_id: int,
        data: CoveragePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[CoverageModel]:
        return await self.repository.patch(coverage_id, data, updated_by)

    async def delete_coverage(self, coverage_id: int) -> None:
        await self.repository.delete(coverage_id)
