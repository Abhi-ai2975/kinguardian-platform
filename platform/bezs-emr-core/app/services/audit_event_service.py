from typing import List, Optional, Tuple

from app.fhir.mappers.audit_event import to_fhir_audit_event, to_plain_audit_event
from app.models.audit_event.audit_event import AuditEventModel
from app.repository.audit_event_repository import AuditEventRepository
from app.schemas.audit_event.input import AuditEventCreateSchema, AuditEventPatchSchema


class AuditEventService:
    def __init__(self, repository: AuditEventRepository):
        self.repository = repository

    def _to_fhir(self, model: AuditEventModel) -> dict:
        return to_fhir_audit_event(model)

    def _to_plain(self, model: AuditEventModel) -> dict:
        return to_plain_audit_event(model)

    async def get_audit_event(self, audit_event_id: int) -> Optional[AuditEventModel]:
        return await self.repository.get_by_audit_event_id(audit_event_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        limit: int,
        offset: int,
    ) -> Tuple[int, List[AuditEventModel]]:
        return await self.repository.get_me(user_id, org_id, limit, offset)

    async def list_audit_events(
        self,
        user_id: Optional[str],
        org_id: Optional[str],
        limit: int,
        offset: int,
    ) -> Tuple[int, List[AuditEventModel]]:
        return await self.repository.list(user_id, org_id, limit, offset)

    async def create_audit_event(
        self,
        data: AuditEventCreateSchema,
        created_by: str,
    ) -> AuditEventModel:
        return await self.repository.create(data, created_by)

    async def patch_audit_event(
        self,
        model: AuditEventModel,
        data: AuditEventPatchSchema,
        updated_by: str,
    ) -> AuditEventModel:
        return await self.repository.patch(model, data, updated_by)

    async def delete_audit_event(self, model: AuditEventModel) -> None:
        await self.repository.delete(model)
