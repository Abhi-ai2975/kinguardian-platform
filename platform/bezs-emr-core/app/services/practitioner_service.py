from typing import List, Optional, Tuple

from app.models.practitioner import PractitionerModel
from app.repository.practitioner_repository import PractitionerRepository
from app.schemas.practitioner import (
    PractitionerCreateSchema,
    PractitionerPatchSchema,
    PractitionerFullCreateSchema,
    PractitionerFullPatchSchema,
    PractitionerNameCreate,
    PractitionerNamePatch,
    PractitionerIdentifierCreate,
    PractitionerIdentifierPatch,
    PractitionerTelecomCreate,
    PractitionerTelecomPatch,
    PractitionerAddressCreate,
    PractitionerAddressPatch,
    PractitionerPhotoCreate,
    PractitionerPhotoPatch,
    PractitionerQualificationCreate,
    PractitionerQualificationPatch,
    PractitionerCommunicationCreate,
    PractitionerCommunicationPatch,
)
from app.fhir.mappers.practitioner import to_fhir_practitioner, to_plain_practitioner


class PractitionerService:
    def __init__(self, repository: PractitionerRepository):
        self.repository = repository

    # ── Formatters ────────────────────────────────────────────────────────

    def _to_fhir(self, practitioner: PractitionerModel) -> dict:
        return to_fhir_practitioner(practitioner)

    def _to_plain(self, practitioner: PractitionerModel) -> dict:
        return to_plain_practitioner(practitioner)

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_raw_by_practitioner_id(self, practitioner_id: int) -> Optional[PractitionerModel]:
        return await self.repository.get_by_practitioner_id(practitioner_id)

    async def get_raw_by_user_id(self, user_id: str) -> Optional[PractitionerModel]:
        return await self.repository.get_by_user_id(user_id)

    async def get_practitioner(self, practitioner_id: int) -> Optional[PractitionerModel]:
        return await self.repository.get_by_practitioner_id(practitioner_id)

    async def get_me(self, user_id: str, org_id: str) -> Optional[PractitionerModel]:
        return await self.repository.get_me(user_id, org_id)

    async def list_practitioners(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        family_name: Optional[str] = None,
        given_name: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PractitionerModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id, family_name=family_name,
            given_name=given_name, active=active,
            limit=limit, offset=offset,
        )

    # ── Write ─────────────────────────────────────────────────────────────

    async def create_practitioner(
        self,
        payload: PractitionerCreateSchema,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PractitionerModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def create_practitioner_full(
        self,
        payload: PractitionerFullCreateSchema,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PractitionerModel:
        return await self.repository.create_full(payload, user_id, org_id, created_by)

    async def patch_practitioner(
        self,
        practitioner_id: int,
        payload: PractitionerPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[PractitionerModel]:
        return await self.repository.patch(practitioner_id, payload, updated_by)

    async def patch_practitioner_full(
        self,
        practitioner_id: int,
        payload: PractitionerFullPatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[PractitionerModel]:
        return await self.repository.patch_full(practitioner_id, payload, updated_by)

    async def delete_practitioner(self, practitioner_id: int) -> bool:
        return await self.repository.delete(practitioner_id)

    # ── Sub-resources ─────────────────────────────────────────────────────

    async def add_name(
        self, practitioner_id: int, payload: PractitionerNameCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_name(practitioner_id, payload)

    async def add_identifier(
        self, practitioner_id: int, payload: PractitionerIdentifierCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_identifier(practitioner_id, payload)

    async def add_telecom(
        self, practitioner_id: int, payload: PractitionerTelecomCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_telecom(practitioner_id, payload)

    async def add_address(
        self, practitioner_id: int, payload: PractitionerAddressCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_address(practitioner_id, payload)

    async def add_photo(
        self, practitioner_id: int, payload: PractitionerPhotoCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_photo(practitioner_id, payload)

    async def add_qualification(
        self, practitioner_id: int, payload: PractitionerQualificationCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_qualification(practitioner_id, payload)

    async def add_communication(
        self, practitioner_id: int, payload: PractitionerCommunicationCreate
    ) -> Optional[PractitionerModel]:
        return await self.repository.add_communication(practitioner_id, payload)

    # ── Sub-resource reads ────────────────────────────────────────────────────

    async def get_names(self, practitioner_id: int) -> list:
        return await self.repository.get_names(practitioner_id)

    async def get_identifiers(self, practitioner_id: int) -> list:
        return await self.repository.get_identifiers(practitioner_id)

    async def get_telecoms(self, practitioner_id: int) -> list:
        return await self.repository.get_telecoms(practitioner_id)

    async def get_addresses(self, practitioner_id: int) -> list:
        return await self.repository.get_addresses(practitioner_id)

    async def get_photos(self, practitioner_id: int) -> list:
        return await self.repository.get_photos(practitioner_id)

    async def get_qualifications(self, practitioner_id: int) -> list:
        return await self.repository.get_qualifications(practitioner_id)

    async def get_communications(self, practitioner_id: int) -> list:
        return await self.repository.get_communications(practitioner_id)

    # ── Sub-resource deletes ──────────────────────────────────────────────────

    async def delete_name(self, practitioner_id: int, name_id: int) -> bool:
        return await self.repository.delete_name(practitioner_id, name_id)

    async def delete_identifier(self, practitioner_id: int, identifier_id: int) -> bool:
        return await self.repository.delete_identifier(practitioner_id, identifier_id)

    async def delete_telecom(self, practitioner_id: int, telecom_id: int) -> bool:
        return await self.repository.delete_telecom(practitioner_id, telecom_id)

    async def delete_address(self, practitioner_id: int, address_id: int) -> bool:
        return await self.repository.delete_address(practitioner_id, address_id)

    async def delete_photo(self, practitioner_id: int, photo_id: int) -> bool:
        return await self.repository.delete_photo(practitioner_id, photo_id)

    async def delete_qualification(self, practitioner_id: int, qualification_id: int) -> bool:
        return await self.repository.delete_qualification(practitioner_id, qualification_id)

    async def delete_communication(self, practitioner_id: int, comm_id: int) -> bool:
        return await self.repository.delete_communication(practitioner_id, comm_id)

    # ── Sub-resource patch ────────────────────────────────────────────────────

    async def patch_name(self, practitioner_id: int, name_id: int, payload: PractitionerNamePatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_name(practitioner_id, name_id, payload)

    async def patch_identifier(self, practitioner_id: int, identifier_id: int, payload: PractitionerIdentifierPatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_identifier(practitioner_id, identifier_id, payload)

    async def patch_telecom(self, practitioner_id: int, telecom_id: int, payload: PractitionerTelecomPatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_telecom(practitioner_id, telecom_id, payload)

    async def patch_address(self, practitioner_id: int, address_id: int, payload: PractitionerAddressPatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_address(practitioner_id, address_id, payload)

    async def patch_photo(self, practitioner_id: int, photo_id: int, payload: PractitionerPhotoPatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_photo(practitioner_id, photo_id, payload)

    async def patch_qualification(self, practitioner_id: int, qualification_id: int, payload: PractitionerQualificationPatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_qualification(practitioner_id, qualification_id, payload)

    async def patch_communication(self, practitioner_id: int, comm_id: int, payload: PractitionerCommunicationPatch) -> Optional[PractitionerModel]:
        return await self.repository.patch_communication(practitioner_id, comm_id, payload)
