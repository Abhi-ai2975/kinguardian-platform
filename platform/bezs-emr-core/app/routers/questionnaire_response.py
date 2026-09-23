from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status

from app.deps.questionnaire_response_deps import resolve_questionnaire_response
from app.core.content_negotiation import format_response, format_paginated_response
from app.core.schema_utils import inline_schema
from app.di.dependencies.questionnaire_response import get_questionnaire_response_service
from app.models.questionnaire_response.questionnaire_response import QuestionnaireResponseModel
from app.schemas.fhir import (
    FHIRQuestionnaireResponseSchema,
    FHIRQuestionnaireResponseBundle,
    PaginatedQuestionnaireResponseResponse,
    PlainQuestionnaireResponse,
)
from app.schemas.questionnaire_response import (
    QuestionnaireResponseCreateSchema,
    QuestionnaireResponsePatchSchema,
)
from app.services.questionnaire_response_service import QuestionnaireResponseService

router = APIRouter()

_CONTENT_NEG = (
    "Set `Accept: application/fhir+json` to receive the full FHIR R4 representation; "
    "omit or use `Accept: application/json` for the simplified plain-JSON form."
)

_ERR_NOT_FOUND = {404: {"description": "QuestionnaireResponse not found"}}
_ERR_VALIDATION = {422: {"description": "Validation error — request body failed schema validation"}}

# Pre-computed inline schemas (evaluated once at import time)
_SINGLE_200 = {
    200: {
        "content": {
            "application/json": {"schema": inline_schema(PlainQuestionnaireResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRQuestionnaireResponseSchema.model_json_schema())},
        }
    }
}
_SINGLE_201 = {201: _SINGLE_200[200]}
_LIST_200 = {
    200: {
        "description": "Paginated list of questionnaire responses",
        "content": {
            "application/json": {"schema": inline_schema(PaginatedQuestionnaireResponseResponse.model_json_schema())},
            "application/fhir+json": {"schema": inline_schema(FHIRQuestionnaireResponseBundle.model_json_schema())},
        },
    }
}


# ── Create QuestionnaireResponse ───────────────────────────────────────────


@router.post(
    "/",
    status_code=status.HTTP_201_CREATED,
    operation_id="create_questionnaire_response",
    summary="Create a new QuestionnaireResponse resource",
    description=(
        "Records a completed set of answers to a Questionnaire (FHIR R4 QuestionnaireResponse). "
        "Supports nested item groups, repeating items, and all FHIR R4 answer value types "
        "(string, integer, decimal, boolean, date, dateTime, time, url, Coding, Quantity, Attachment, Reference). "
        "Link to source context using public IDs: `Patient/10001`, `Encounter/20001`, `Practitioner/30001`. "
        "The `questionnaire` field should be a canonical URL or resource reference identifying the Questionnaire being answered. "
        "The caller's `sub` and `activeOrganizationId` JWT claims are automatically bound to the record. "
        + _CONTENT_NEG
    ),
    response_description="The newly created QuestionnaireResponse resource",
    responses={**_SINGLE_201, **_ERR_VALIDATION},
)
async def create_questionnaire_response(
    payload: QuestionnaireResponseCreateSchema,
    request: Request,
    qr_service: QuestionnaireResponseService = Depends(get_questionnaire_response_service),
):
    created_by = payload.created_by
    qr = await qr_service.create_questionnaire_response(payload, payload.user_id, payload.org_id, created_by)
    return format_response(
        qr_service._to_fhir(qr),
        qr_service._to_plain(qr),
        request,
    )


# Declared before /{questionnaire_response_id} to avoid routing conflicts.



@router.get(
    "/{questionnaire_response_id}",
    operation_id="get_questionnaire_response_by_id",
    summary="Retrieve a QuestionnaireResponse resource by public questionnaire_response_id",
    description=(
        "Fetches a single QuestionnaireResponse by its public integer `questionnaire_response_id`. "
        "Access is subject to organization-scoped authorization. "
        + _CONTENT_NEG
    ),
    response_description="The requested QuestionnaireResponse resource",
    responses={
        **_SINGLE_200,
        403: {"description": "Forbidden — caller lacks `questionnaire_response:read` permission or the resource belongs to a different organization"},
        **_ERR_NOT_FOUND,
    },
)
async def get_questionnaire_response(
    request: Request,
    qr: QuestionnaireResponseModel = Depends(resolve_questionnaire_response),
    qr_service: QuestionnaireResponseService = Depends(get_questionnaire_response_service),
):
    return format_response(
        qr_service._to_fhir(qr),
        qr_service._to_plain(qr),
        request,
    )


# ── Patch QuestionnaireResponse ────────────────────────────────────────────


@router.patch(
    "/{questionnaire_response_id}",
    operation_id="patch_questionnaire_response",
    summary="Partially update a QuestionnaireResponse resource",
    description=(
        "Only lifecycle fields are patchable: `status` (e.g. `in-progress` → `completed`), `authored`. "
        "To correct or replace item answers, delete and re-create the QuestionnaireResponse. "
        + _CONTENT_NEG
    ),
    response_description="The updated QuestionnaireResponse resource",
    responses={**_SINGLE_200, **_ERR_NOT_FOUND, **_ERR_VALIDATION},
)
async def patch_questionnaire_response(
    payload: QuestionnaireResponsePatchSchema,
    request: Request,
    qr: QuestionnaireResponseModel = Depends(resolve_questionnaire_response),
    qr_service: QuestionnaireResponseService = Depends(get_questionnaire_response_service),
):
    updated_by = payload.updated_by
    updated = await qr_service.patch_questionnaire_response(
        qr.questionnaire_response_id, payload, updated_by
    )
    if not updated:
        raise HTTPException(status_code=404, detail="QuestionnaireResponse not found")
    return format_response(
        qr_service._to_fhir(updated),
        qr_service._to_plain(updated),
        request,
    )


# ── List QuestionnaireResponses ────────────────────────────────────────────


@router.get(
    "/",
    operation_id="list_questionnaire_responses",
    summary="List all QuestionnaireResponse resources",
    description=(
        "Returns a paginated list of QuestionnaireResponse resources. "
        "Filter by `status`, `patient_id`, `questionnaire`, `authored_from`, `authored_to`, `user_id`, or `org_id`. "
        "Use `limit` and `offset` for pagination. "
        + _CONTENT_NEG
    ),
    response_description="Paginated QuestionnaireResponse resources",
    responses={**_LIST_200},
)
async def list_questionnaire_responses(
    request: Request,
    qr_status: Optional[str] = Query(None, alias="status"),
    patient_id: Optional[int] = Query(None),
    questionnaire: Optional[str] = Query(None),
    authored_from: Optional[datetime] = Query(None),
    authored_to: Optional[datetime] = Query(None),
    user_id: Optional[str] = Query(None),
    org_id: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    qr_service: QuestionnaireResponseService = Depends(get_questionnaire_response_service),
):
    responses, total = await qr_service.list_questionnaire_responses(
        user_id=user_id, org_id=org_id, status=qr_status, patient_id=patient_id,
        questionnaire=questionnaire, authored_from=authored_from,
        authored_to=authored_to, limit=limit, offset=offset,
    )
    return format_paginated_response(
        [qr_service._to_fhir(qr) for qr in responses],
        [qr_service._to_plain(qr) for qr in responses],
        total, limit, offset, request,
    )


# ── Delete QuestionnaireResponse ───────────────────────────────────────────


@router.delete(
    "/{questionnaire_response_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    operation_id="delete_questionnaire_response",
    summary="Delete a QuestionnaireResponse resource",
    description=(
        "Permanently deletes the QuestionnaireResponse and all its nested item/answer records. "
        "This operation is irreversible. Returns 204 No Content on success."
    ),
    responses={**_ERR_NOT_FOUND},
)
async def delete_questionnaire_response(
    qr: QuestionnaireResponseModel = Depends(resolve_questionnaire_response),
    qr_service: QuestionnaireResponseService = Depends(get_questionnaire_response_service),
):
    await qr_service.delete_questionnaire_response(qr.questionnaire_response_id)
    return None
