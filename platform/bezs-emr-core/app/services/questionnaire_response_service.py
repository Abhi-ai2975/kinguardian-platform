from datetime import datetime
from typing import Optional, List, Tuple

from app.models.questionnaire_response.questionnaire_response import (
    QuestionnaireResponseModel,
)
from app.repository.questionnaire_response_repository import (
    QuestionnaireResponseRepository,
)
from app.schemas.questionnaire_response import (
    QuestionnaireResponseCreateSchema,
    QuestionnaireResponsePatchSchema,
)
from app.fhir.mappers.questionnaire_response import (
    to_fhir_questionnaire_response,
    to_plain_questionnaire_response,
)


class QuestionnaireResponseService:
    def __init__(self, repository: QuestionnaireResponseRepository):
        self.repository = repository

    # ── Formatters (called by route layer after content negotiation) ──────

    def _to_fhir(self, qr: QuestionnaireResponseModel) -> dict:
        return to_fhir_questionnaire_response(qr)

    def _to_plain(self, qr: QuestionnaireResponseModel) -> dict:
        return to_plain_questionnaire_response(qr)

    # ── Read ──────────────────────────────────────────────────────────────

    async def get_raw_by_qr_id(
        self, questionnaire_response_id: int
    ) -> Optional[QuestionnaireResponseModel]:
        """Raw ORM model — used by the auth ownership dependency."""
        return await self.repository.get_by_qr_id(questionnaire_response_id)

    async def get_questionnaire_response(
        self, questionnaire_response_id: int
    ) -> Optional[QuestionnaireResponseModel]:
        return await self.repository.get_by_qr_id(questionnaire_response_id)

    async def get_me(
        self,
        user_id: str,
        org_id: str,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        questionnaire: Optional[str] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[QuestionnaireResponseModel], int]:
        return await self.repository.get_me(
            user_id, org_id,
            status=status, patient_id=patient_id, questionnaire=questionnaire,
            authored_from=authored_from, authored_to=authored_to,
            limit=limit, offset=offset,
        )

    async def list_questionnaire_responses(
        self,
        user_id: Optional[str] = None,
        org_id: Optional[str] = None,
        status: Optional[str] = None,
        patient_id: Optional[int] = None,
        questionnaire: Optional[str] = None,
        authored_from: Optional[datetime] = None,
        authored_to: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
    ) -> Tuple[List[QuestionnaireResponseModel], int]:
        return await self.repository.list(
            user_id=user_id, org_id=org_id, status=status, patient_id=patient_id,
            questionnaire=questionnaire, authored_from=authored_from,
            authored_to=authored_to, limit=limit, offset=offset,
        )

    # ── Write ─────────────────────────────────────────────────────────────

    async def create_questionnaire_response(
        self,
        payload: QuestionnaireResponseCreateSchema,
        user_id: Optional[str],
        org_id: Optional[str] = None,
        created_by: Optional[str] = None,
    ) -> QuestionnaireResponseModel:
        return await self.repository.create(payload, user_id, org_id, created_by)

    async def patch_questionnaire_response(
        self,
        questionnaire_response_id: int,
        payload: QuestionnaireResponsePatchSchema,
        updated_by: Optional[str] = None,
    ) -> Optional[QuestionnaireResponseModel]:
        return await self.repository.patch(questionnaire_response_id, payload, updated_by)

    async def delete_questionnaire_response(
        self, questionnaire_response_id: int
    ) -> bool:
        return await self.repository.delete(questionnaire_response_id)
