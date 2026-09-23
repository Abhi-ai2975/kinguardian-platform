"""
Input schemas for ServiceRequest resource endpoints.

Three schemas cover the write/query surfaces:
  - ServiceRequestCreateSchema  — POST /service-requests body (all child arrays inline)
  - ServiceRequestPatchSchema   — PATCH /service-requests/{id} body (scalar fields only)
  - ListServiceRequestsSchema   — GET /service-requests query parameters

Design notes:
  - Mirrors the fhir-server ServiceRequestCreateSchema / ServiceRequestPatchSchema
    exactly to avoid silent failures at the fhir-server boundary.
  - `created_by` / `updated_by` are NOT here — FhirClient injects from actor.sub.
  - All child arrays live in the POST body — the fhir-server has no separate
    sub-resource routes for ServiceRequest.
  - List filters: status, patient_id, encounter_id, authored_from, authored_to,
    user_id, org_id, limit, offset (matching the fhir-server /service-requests GET).
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Sub-resource input schemas ────────────────────────────────────────────────


class ServiceRequestIdentifierInput(BaseModel):
    """Business identifier for the ServiceRequest."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: str = Field(..., description="Identifier value — required.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class ServiceRequestCategoryInput(BaseModel):
    """Classification code for the request (e.g. SNOMED, HL7)."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ServiceRequestOrderDetailInput(BaseModel):
    """Additional details and instruction about the service requested."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ServiceRequestPerformerInput(BaseModel):
    """Requested performer for the service — Practitioner, Organization, etc."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Practitioner/30001' or 'Organization/190001'.",
    )
    reference_display: Optional[str] = None


class ServiceRequestLocationCodeInput(BaseModel):
    """Coded location where the service is requested to be performed."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ServiceRequestLocationReferenceInput(BaseModel):
    """Location resource reference where the service is to be performed."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to a Location e.g. 'Location/10001'.")
    reference_display: Optional[str] = None


class ServiceRequestReasonCodeInput(BaseModel):
    """Coded reason why the service is requested."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ServiceRequestReasonReferenceInput(BaseModel):
    """Reference to a condition or observation justifying the request."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Condition/120001' or 'Observation/160001'.",
    )
    reference_display: Optional[str] = None


class ServiceRequestInsuranceInput(BaseModel):
    """Insurance coverage reference for the requested service."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'Coverage/10001' or 'ClaimResponse/180001'.",
    )
    reference_display: Optional[str] = None


class ServiceRequestSupportingInfoInput(BaseModel):
    """Additional clinical information supporting the order."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Any FHIR resource reference e.g. 'Observation/160001'.")
    reference_display: Optional[str] = None


class ServiceRequestSpecimenInput(BaseModel):
    """Specimen reference if the service involves a specimen."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to a Specimen e.g. 'Specimen/10001'.")
    reference_display: Optional[str] = None


class ServiceRequestBodySiteInput(BaseModel):
    """Anatomic body site for the service."""

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ServiceRequestNoteInput(BaseModel):
    """Annotation / note associated with the service request."""

    model_config = ConfigDict(extra="forbid")

    text: str = Field(..., description="Annotation text (markdown).")
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(
        None,
        description="Author as FHIR reference e.g. 'Practitioner/30001'.",
    )
    author_reference_display: Optional[str] = None


class ServiceRequestRelevantHistoryInput(BaseModel):
    """Provenance records relevant to this request."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to a Provenance record e.g. 'Provenance/10001'.")
    reference_display: Optional[str] = None


class ServiceRequestBasedOnInput(BaseModel):
    """What request this order is based on (care plan, prior order, etc.)."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(
        ...,
        description="FHIR reference e.g. 'CarePlan/10001' or 'ServiceRequest/80001'.",
    )
    reference_display: Optional[str] = None


class ServiceRequestReplacesInput(BaseModel):
    """ServiceRequest being superseded by this new request."""

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="Reference to ServiceRequest being superseded.")
    reference_display: Optional[str] = None


# ── Create / Patch / List ─────────────────────────────────────────────────────


class ServiceRequestCreateSchema(BaseModel):
    """
    Full create body for a ServiceRequest resource.

    `status` and `intent` are required (FHIR R4 1..1). All other fields and
    all child arrays are optional.
    """

    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    # Required
    status: str = Field(
        ...,
        description="draft|active|on-hold|revoked|completed|entered-in-error|unknown",
    )
    intent: str = Field(
        ...,
        description="proposal|plan|directive|order|original-order|reflex-order|filler-order|instance-order|option",
    )

    # Classification
    priority: Optional[str] = Field(None, description="routine|urgent|asap|stat")
    do_not_perform: Optional[bool] = None

    # code (CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # subject
    subject: Optional[str] = Field(None, description="FHIR reference e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None

    # encounter
    encounter_id: Optional[int] = Field(None, description="Public encounter_id.")
    encounter_display: Optional[str] = None

    # occurrence[x]
    occurrence_datetime: Optional[datetime] = None
    occurrence_period_start: Optional[datetime] = None
    occurrence_period_end: Optional[datetime] = None
    occurrence_timing_frequency: Optional[int] = None
    occurrence_timing_period: Optional[float] = None
    occurrence_timing_period_unit: Optional[str] = Field(None, description="s|min|h|d|wk|mo|a")
    occurrence_timing_bounds_start: Optional[datetime] = None
    occurrence_timing_bounds_end: Optional[datetime] = None

    # asNeeded[x]
    as_needed_boolean: Optional[bool] = None
    as_needed_system: Optional[str] = None
    as_needed_code: Optional[str] = None
    as_needed_display: Optional[str] = None
    as_needed_text: Optional[str] = None

    # authoredOn + requester
    authored_on: Optional[datetime] = None
    requester: Optional[str] = Field(None, description="FHIR reference e.g. 'Practitioner/30001'.")
    requester_display: Optional[str] = None

    # performerType (CodeableConcept)
    performer_type_system: Optional[str] = None
    performer_type_code: Optional[str] = None
    performer_type_display: Optional[str] = None
    performer_type_text: Optional[str] = None

    # quantity[x]
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

    # requisition (Identifier)
    requisition_use: Optional[str] = None
    requisition_type_system: Optional[str] = None
    requisition_type_code: Optional[str] = None
    requisition_type_display: Optional[str] = None
    requisition_type_text: Optional[str] = None
    requisition_system: Optional[str] = None
    requisition_value: Optional[str] = None
    requisition_period_start: Optional[datetime] = None
    requisition_period_end: Optional[datetime] = None
    requisition_assigner: Optional[str] = None

    # instantiates
    instantiates_canonical: Optional[str] = Field(None, description="Comma-separated canonical URIs.")
    instantiates_uri: Optional[str] = Field(None, description="Comma-separated URIs.")

    # patientInstruction
    patient_instruction: Optional[str] = None

    # child arrays
    identifier: Optional[List[ServiceRequestIdentifierInput]] = None
    category: Optional[List[ServiceRequestCategoryInput]] = None
    order_detail: Optional[List[ServiceRequestOrderDetailInput]] = None
    performer: Optional[List[ServiceRequestPerformerInput]] = None
    location_code: Optional[List[ServiceRequestLocationCodeInput]] = None
    location_reference: Optional[List[ServiceRequestLocationReferenceInput]] = None
    reason_code: Optional[List[ServiceRequestReasonCodeInput]] = None
    reason_reference: Optional[List[ServiceRequestReasonReferenceInput]] = None
    insurance: Optional[List[ServiceRequestInsuranceInput]] = None
    supporting_info: Optional[List[ServiceRequestSupportingInfoInput]] = None
    specimen: Optional[List[ServiceRequestSpecimenInput]] = None
    body_site: Optional[List[ServiceRequestBodySiteInput]] = None
    note: Optional[List[ServiceRequestNoteInput]] = None
    relevant_history: Optional[List[ServiceRequestRelevantHistoryInput]] = None
    based_on: Optional[List[ServiceRequestBasedOnInput]] = None
    replaces: Optional[List[ServiceRequestReplacesInput]] = None


class ServiceRequestPatchSchema(BaseModel):
    """
    Partial update body for a ServiceRequest.

    Only scalar fields are patchable. Child arrays (identifier, category,
    performer, etc.) are immutable after creation.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    intent: Optional[str] = None
    priority: Optional[str] = None
    do_not_perform: Optional[bool] = None

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    encounter_display: Optional[str] = None

    occurrence_datetime: Optional[datetime] = None
    occurrence_period_start: Optional[datetime] = None
    occurrence_period_end: Optional[datetime] = None
    occurrence_timing_frequency: Optional[int] = None
    occurrence_timing_period: Optional[float] = None
    occurrence_timing_period_unit: Optional[str] = None
    occurrence_timing_bounds_start: Optional[datetime] = None
    occurrence_timing_bounds_end: Optional[datetime] = None

    as_needed_boolean: Optional[bool] = None
    as_needed_system: Optional[str] = None
    as_needed_code: Optional[str] = None
    as_needed_display: Optional[str] = None
    as_needed_text: Optional[str] = None

    authored_on: Optional[datetime] = None
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
    requisition_period_start: Optional[datetime] = None
    requisition_period_end: Optional[datetime] = None
    requisition_assigner: Optional[str] = None

    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None
    patient_instruction: Optional[str] = None
    updated_by: Optional[str] = None


class ListServiceRequestsSchema(BaseModel):
    """
    Query parameters for GET /service-requests.

    Mirrors the fhir-server list endpoint filter surface:
    status, patient_id, encounter_id, authored_from, authored_to,
    user_id, org_id, limit, offset.
    """

    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = Field(None, description="Filter by status e.g. 'active'.")
    patient_id: Optional[int] = Field(None, description="Filter by patient subject_id.")
    encounter_id: Optional[int] = Field(None, description="Filter by public encounter_id.")
    authored_from: Optional[datetime] = Field(None, description="Return service requests authored on or after this datetime.")
    authored_to: Optional[datetime] = Field(None, description="Return service requests authored on or before this datetime.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    limit: int = Field(50, ge=1, le=200)
    offset: int = Field(0, ge=0)
