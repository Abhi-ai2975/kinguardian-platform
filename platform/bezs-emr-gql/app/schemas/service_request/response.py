"""
Response schemas for ServiceRequest resources.

Two top-level schemas:
  - ServiceRequestResponse        — plain snake_case single-resource response
  - PaginatedServiceRequestResponse — paginated list wrapper

All sub-schemas mirror the fhir-server PlainServiceRequest* shapes exactly.
`extra="allow"` on every schema ensures forward-compatibility when the
fhir-server adds new fields without a coordinated fhir-gql release.
"""

from typing import List, Optional

from pydantic import BaseModel, ConfigDict


# ── Plain sub-resource response schemas ───────────────────────────────────────


class PlainServiceRequestIdentifier(BaseModel):
    """Business identifier attached to the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[str] = None
    period_end: Optional[str] = None
    assigner: Optional[str] = None


class PlainServiceRequestCategory(BaseModel):
    """Classification category for the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestOrderDetail(BaseModel):
    """Order detail / additional instruction for the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestPerformer(BaseModel):
    """Requested performer reference (Practitioner, Organization, etc.)."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestLocationCode(BaseModel):
    """Coded location where the service should be performed."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestLocationReference(BaseModel):
    """Location resource reference for the service."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestReasonCode(BaseModel):
    """Coded reason for the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestReasonReference(BaseModel):
    """Reference to a condition or observation justifying the request."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestInsurance(BaseModel):
    """Insurance coverage reference for the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestSupportingInfo(BaseModel):
    """Supporting information reference for the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestSpecimen(BaseModel):
    """Specimen reference associated with the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestBodySite(BaseModel):
    """Anatomic body site for the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainServiceRequestNote(BaseModel):
    """Annotation note attached to the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainServiceRequestRelevantHistory(BaseModel):
    """Provenance reference relevant to the ServiceRequest."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestBasedOn(BaseModel):
    """Reference to a prior order or care plan this request is based on."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainServiceRequestReplaces(BaseModel):
    """Reference to a ServiceRequest being superseded by this one."""

    model_config = ConfigDict(extra="allow")

    id: int
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


# ── Top-level response schemas ────────────────────────────────────────────────


class ServiceRequestResponse(BaseModel):
    """
    Plain snake_case response for a single ServiceRequest.

    `status` and `intent` are required by FHIR R4 (1..1); all other scalar
    fields are Optional because sub-resources may have only partial data.
    `extra="allow"` keeps the response forward-compatible with fhir-server additions.
    """

    model_config = ConfigDict(extra="allow")

    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: str
    intent: str
    priority: Optional[str] = None
    do_not_perform: Optional[bool] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    encounter_id: Optional[int] = None
    encounter_display: Optional[str] = None
    occurrence_datetime: Optional[str] = None
    occurrence_period_start: Optional[str] = None
    occurrence_period_end: Optional[str] = None
    occurrence_timing_frequency: Optional[int] = None
    occurrence_timing_period: Optional[float] = None
    occurrence_timing_period_unit: Optional[str] = None
    occurrence_timing_bounds_start: Optional[str] = None
    occurrence_timing_bounds_end: Optional[str] = None
    as_needed_boolean: Optional[bool] = None
    as_needed_system: Optional[str] = None
    as_needed_code: Optional[str] = None
    as_needed_display: Optional[str] = None
    as_needed_text: Optional[str] = None
    authored_on: Optional[str] = None
    requester_type: Optional[str] = None
    requester_id: Optional[int] = None
    requester_display: Optional[str] = None
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    quantity_ratio_numerator_value: Optional[float] = None
    quantity_ratio_numerator_unit: Optional[str] = None
    quantity_ratio_denominator_value: Optional[float] = None
    quantity_ratio_denominator_unit: Optional[str] = None
    quantity_range_low_value: Optional[float] = None
    quantity_range_low_unit: Optional[str] = None
    quantity_range_high_value: Optional[float] = None
    quantity_range_high_unit: Optional[str] = None
    requisition_use: Optional[str] = None
    requisition_type_system: Optional[str] = None
    requisition_type_code: Optional[str] = None
    requisition_type_display: Optional[str] = None
    requisition_type_text: Optional[str] = None
    requisition_system: Optional[str] = None
    requisition_value: Optional[str] = None
    requisition_period_start: Optional[str] = None
    requisition_period_end: Optional[str] = None
    requisition_assigner: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    patient_instruction: Optional[str] = None
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
    created_by: Optional[str] = None
    updated_by: Optional[str] = None
    identifier: Optional[List[PlainServiceRequestIdentifier]] = None
    category: Optional[List[PlainServiceRequestCategory]] = None
    order_detail: Optional[List[PlainServiceRequestOrderDetail]] = None
    performer: Optional[List[PlainServiceRequestPerformer]] = None
    location_code: Optional[List[PlainServiceRequestLocationCode]] = None
    location_reference: Optional[List[PlainServiceRequestLocationReference]] = None
    reason_code: Optional[List[PlainServiceRequestReasonCode]] = None
    reason_reference: Optional[List[PlainServiceRequestReasonReference]] = None
    insurance: Optional[List[PlainServiceRequestInsurance]] = None
    supporting_info: Optional[List[PlainServiceRequestSupportingInfo]] = None
    specimen: Optional[List[PlainServiceRequestSpecimen]] = None
    body_site: Optional[List[PlainServiceRequestBodySite]] = None
    note: Optional[List[PlainServiceRequestNote]] = None
    relevant_history: Optional[List[PlainServiceRequestRelevantHistory]] = None
    based_on: Optional[List[PlainServiceRequestBasedOn]] = None
    replaces: Optional[List[PlainServiceRequestReplaces]] = None


class PaginatedServiceRequestResponse(BaseModel):
    """Paginated list wrapper for ServiceRequest resources."""

    model_config = ConfigDict(extra="allow")

    total: int
    limit: int
    offset: int
    data: List[ServiceRequestResponse]
