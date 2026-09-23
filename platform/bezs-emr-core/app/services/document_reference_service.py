from typing import List, Optional, Tuple

from app.fhir.mappers.document_reference import to_fhir_document_reference, to_plain_document_reference
from app.models.document_reference.document_reference import DocumentReferenceModel
from app.repository.document_reference_repository import DocumentReferenceRepository
from app.schemas.document_reference.input import DocumentReferenceCreateSchema, DocumentReferencePatchSchema


class DocumentReferenceService:
    def __init__(self, repository: DocumentReferenceRepository):
        self.repository = repository

    def _to_fhir(self, model: DocumentReferenceModel) -> dict:
        return to_fhir_document_reference(model)

    def _to_plain(self, model: DocumentReferenceModel) -> dict:
        return to_plain_document_reference(model)

    async def get_document_reference(self, document_reference_id: int) -> Optional[DocumentReferenceModel]:
        return await self.repository.get_by_document_reference_id(document_reference_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DocumentReferenceModel], int]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_document_references(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[DocumentReferenceModel], int]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_document_reference(
        self,
        data: DocumentReferenceCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str],
        created_by: Optional[str],
    ) -> DocumentReferenceModel:
        return await self.repository.create(data, user_id, org_id, created_by)

    async def patch_document_reference(
        self,
        document_reference_id: int,
        data: DocumentReferencePatchSchema,
        updated_by: Optional[str],
    ) -> Optional[DocumentReferenceModel]:
        return await self.repository.patch(document_reference_id, data, updated_by)

    async def delete_document_reference(self, document_reference_id: int) -> bool:
        return await self.repository.delete(document_reference_id)
