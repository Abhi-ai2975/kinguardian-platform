from typing import List, Optional, Tuple

from app.models.patient.patient import PatientModel
from app.repository.patient_repository import PatientRepository
from app.schemas.resources import (
    AddressCreate,
    AddressPatch,
    CommunicationCreate,
    CommunicationPatch,
    ContactCreate,
    ContactPatch,
    GeneralPractitionerCreate,
    GeneralPractitionerPatch,
    IdentifierCreate,
    IdentifierPatch,
    LinkCreate,
    LinkPatch,
    NameCreate,
    NamePatch,
    PatientCreateSchema,
    PatientFullCreateSchema,
    PatientPatchSchema,
    PatientFullPatchSchema,
    PhotoCreate,
    PhotoPatch,
    TelecomCreate,
    TelecomPatch,
)
from app.fhir.mappers.patient import to_fhir_patient, to_plain_patient


class PatientService:
    def __init__(self, repository: PatientRepository):
        self.repository = repository

    # ── Formatters ────────────────────────────────────────────────────────────

    def _to_fhir(self, patient: PatientModel) -> dict:
        return to_fhir_patient(patient)

    def _to_plain(self, patient: PatientModel) -> dict:
        return to_plain_patient(patient)

    # ── Read ──────────────────────────────────────────────────────────────────

    async def get_raw_by_patient_id(self, patient_id: int) -> Optional[PatientModel]:
        return await self.repository.get_by_patient_id(patient_id)

    async def get_raw_by_user_id(self, user_id: str) -> Optional[PatientModel]:
        return await self.repository.get_by_user_id(user_id)

    async def get_patient(self, patient_id: int) -> Optional[PatientModel]:
        return await self.repository.get_by_patient_id(patient_id)

    async def get_patient_in_org(
        self, patient_id: int, user_id: str, org_id: str
    ) -> Optional[PatientModel]:
        return await self.repository.get_by_patient_id_in_org(patient_id, user_id, org_id)

    async def get_me(self, user_id: str, org_id: str) -> Optional[PatientModel]:
        return await self.repository.get_me(user_id, org_id)

    async def list_patients(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        family_name: Optional[str] = None,
        given_name: Optional[str] = None,
        gender: Optional[str] = None,
        active: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[PatientModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id, family_name=family_name,
            given_name=given_name, gender=gender, active=active,
            limit=limit, offset=offset,
        )

    # ── Write ─────────────────────────────────────────────────────────────────

    async def create_patient(
        self,
        payload: PatientCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PatientModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def create_patient_full(
        self,
        payload: PatientFullCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> PatientModel:
        return await self.repository.create_full(payload, user_id, org_id, created_by)

    async def patch_patient(
        self, patient_id: int, payload: PatientPatchSchema, updated_by: Optional[str] = None
    ) -> Optional[PatientModel]:
        return await self.repository.patch(patient_id, payload, updated_by)

    async def patch_patient_full(
        self, patient_id: int, payload: PatientFullPatchSchema, updated_by: Optional[str] = None
    ) -> Optional[PatientModel]:
        return await self.repository.patch_full(patient_id, payload, updated_by)

    async def delete_patient(self, patient_id: int) -> bool:
        return await self.repository.delete(patient_id)

    # ── Sub-resources ─────────────────────────────────────────────────────────

    async def add_name(self, patient_id: int, payload: NameCreate) -> Optional[PatientModel]:
        return await self.repository.add_name(patient_id, payload)

    async def add_identifier(self, patient_id: int, payload: IdentifierCreate) -> Optional[PatientModel]:
        return await self.repository.add_identifier(patient_id, payload)

    async def add_telecom(self, patient_id: int, payload: TelecomCreate) -> Optional[PatientModel]:
        return await self.repository.add_telecom(patient_id, payload)

    async def add_address(self, patient_id: int, payload: AddressCreate) -> Optional[PatientModel]:
        return await self.repository.add_address(patient_id, payload)

    async def add_photo(self, patient_id: int, payload: PhotoCreate) -> Optional[PatientModel]:
        return await self.repository.add_photo(patient_id, payload)

    async def add_contact(self, patient_id: int, payload: ContactCreate) -> Optional[PatientModel]:
        return await self.repository.add_contact(patient_id, payload)

    async def add_communication(
        self, patient_id: int, payload: CommunicationCreate
    ) -> Optional[PatientModel]:
        return await self.repository.add_communication(patient_id, payload)

    async def add_general_practitioner(
        self, patient_id: int, payload: GeneralPractitionerCreate
    ) -> Optional[PatientModel]:
        return await self.repository.add_general_practitioner(patient_id, payload)

    async def add_link(self, patient_id: int, payload: LinkCreate) -> Optional[PatientModel]:
        return await self.repository.add_link(patient_id, payload)

    # ── Sub-resource reads ────────────────────────────────────────────────────

    async def get_names(self, patient_id: int) -> list:
        return await self.repository.get_names(patient_id)

    async def get_identifiers(self, patient_id: int) -> list:
        return await self.repository.get_identifiers(patient_id)

    async def get_telecoms(self, patient_id: int) -> list:
        return await self.repository.get_telecoms(patient_id)

    async def get_addresses(self, patient_id: int) -> list:
        return await self.repository.get_addresses(patient_id)

    async def get_photos(self, patient_id: int) -> list:
        return await self.repository.get_photos(patient_id)

    async def get_contacts(self, patient_id: int) -> list:
        return await self.repository.get_contacts(patient_id)

    async def get_communications(self, patient_id: int) -> list:
        return await self.repository.get_communications(patient_id)

    async def get_general_practitioners(self, patient_id: int) -> list:
        return await self.repository.get_general_practitioners(patient_id)

    async def get_links(self, patient_id: int) -> list:
        return await self.repository.get_links(patient_id)

    # ── Sub-resource deletes ──────────────────────────────────────────────────

    async def delete_name(self, patient_id: int, name_id: int) -> bool:
        return await self.repository.delete_name(patient_id, name_id)

    async def delete_identifier(self, patient_id: int, identifier_id: int) -> bool:
        return await self.repository.delete_identifier(patient_id, identifier_id)

    async def delete_telecom(self, patient_id: int, telecom_id: int) -> bool:
        return await self.repository.delete_telecom(patient_id, telecom_id)

    async def delete_address(self, patient_id: int, address_id: int) -> bool:
        return await self.repository.delete_address(patient_id, address_id)

    async def delete_photo(self, patient_id: int, photo_id: int) -> bool:
        return await self.repository.delete_photo(patient_id, photo_id)

    async def delete_contact(self, patient_id: int, contact_id: int) -> bool:
        return await self.repository.delete_contact(patient_id, contact_id)

    async def delete_communication(self, patient_id: int, comm_id: int) -> bool:
        return await self.repository.delete_communication(patient_id, comm_id)

    async def delete_general_practitioner(self, patient_id: int, gp_id: int) -> bool:
        return await self.repository.delete_general_practitioner(patient_id, gp_id)

    async def delete_link(self, patient_id: int, link_id: int) -> bool:
        return await self.repository.delete_link(patient_id, link_id)

    # ── Sub-resource patch ────────────────────────────────────────────────────

    async def patch_name(self, patient_id: int, name_id: int, payload: NamePatch) -> Optional[PatientModel]:
        return await self.repository.patch_name(patient_id, name_id, payload)

    async def patch_identifier(self, patient_id: int, identifier_id: int, payload: IdentifierPatch) -> Optional[PatientModel]:
        return await self.repository.patch_identifier(patient_id, identifier_id, payload)

    async def patch_telecom(self, patient_id: int, telecom_id: int, payload: TelecomPatch) -> Optional[PatientModel]:
        return await self.repository.patch_telecom(patient_id, telecom_id, payload)

    async def patch_address(self, patient_id: int, address_id: int, payload: AddressPatch) -> Optional[PatientModel]:
        return await self.repository.patch_address(patient_id, address_id, payload)

    async def patch_photo(self, patient_id: int, photo_id: int, payload: PhotoPatch) -> Optional[PatientModel]:
        return await self.repository.patch_photo(patient_id, photo_id, payload)

    async def patch_contact(self, patient_id: int, contact_id: int, payload: ContactPatch) -> Optional[PatientModel]:
        return await self.repository.patch_contact(patient_id, contact_id, payload)

    async def patch_communication(self, patient_id: int, comm_id: int, payload: CommunicationPatch) -> Optional[PatientModel]:
        return await self.repository.patch_communication(patient_id, comm_id, payload)

    async def patch_general_practitioner(self, patient_id: int, gp_id: int, payload: GeneralPractitionerPatch) -> Optional[PatientModel]:
        return await self.repository.patch_general_practitioner(patient_id, gp_id, payload)

    async def patch_link(self, patient_id: int, link_id: int, payload: LinkPatch) -> Optional[PatientModel]:
        return await self.repository.patch_link(patient_id, link_id, payload)
