from typing import List, Optional, Tuple

from app.fhir.mappers.location import to_fhir_location, to_plain_location
from app.models.location.location import LocationModel
from app.repository.location_repository import LocationRepository
from app.schemas.location.input import LocationCreateSchema, LocationPatchSchema


class LocationService:
    def __init__(self, repository: LocationRepository):
        self.repository = repository

    def _to_fhir(self, location: LocationModel) -> dict:
        return to_fhir_location(location)

    def _to_plain(self, location: LocationModel) -> dict:
        return to_plain_location(location)

    async def get_raw_by_location_id(self, location_id: int) -> Optional[LocationModel]:
        return await self.repository.get_by_location_id(location_id)

    async def get_location(self, location_id: int) -> Optional[LocationModel]:
        return await self.repository.get_by_location_id(location_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        location_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[LocationModel], int]:
        return await self.repository.get_me(
            user_id, org_id, location_status=location_status, limit=limit, offset=offset
        )

    async def list_locations(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        location_status: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[LocationModel], int]:
        return await self.repository.list(
            user_id=user_id,
            org_id=org_id,
            location_status=location_status,
            limit=limit,
            offset=offset,
        )

    async def create_location(
        self,
        data: LocationCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> LocationModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_location(
        self,
        location_id: int,
        data: LocationPatchSchema,
        updated_by: Optional[str],
    ) -> Optional[LocationModel]:
        return await self.repository.patch(location_id, data, updated_by)

    async def delete_location(self, location_id: int) -> None:
        await self.repository.delete(location_id)
