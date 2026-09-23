from typing import Any, Dict, List, Optional

from pydantic import BaseModel


# ── FHIR response schemas ────────────────────────────────────────────────────


class FHIRSpecimenSchema(BaseModel):
    resourceType: str = "Specimen"
    id: str
    identifier: Optional[List[Dict[str, Any]]] = None
    accessionIdentifier: Optional[Dict[str, Any]] = None
    status: Optional[str] = None
    type: Optional[Dict[str, Any]] = None
    subject: Optional[Dict[str, Any]] = None
    receivedTime: Optional[str] = None
    parent: Optional[List[Dict[str, Any]]] = None
    request: Optional[List[Dict[str, Any]]] = None
    collection: Optional[Dict[str, Any]] = None
    processing: Optional[List[Dict[str, Any]]] = None
    container: Optional[List[Dict[str, Any]]] = None
    condition: Optional[List[Dict[str, Any]]] = None
    note: Optional[List[Dict[str, Any]]] = None


class FHIRSpecimenBundleEntry(BaseModel):
    resource: FHIRSpecimenSchema


class FHIRSpecimenBundle(BaseModel):
    resourceType: str = "Bundle"
    type: str = "searchset"
    total: int
    entry: List[FHIRSpecimenBundleEntry] = []


# ── Plain response schemas ────────────────────────────────────────────────────


class PlainSpecimenIdentifier(BaseModel):
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


class PlainSpecimenParent(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainSpecimenRequest(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainSpecimenCollection(BaseModel):
    collector_type: Optional[str] = None
    collector_id: Optional[int] = None
    collector_display: Optional[str] = None
    collected_datetime: Optional[str] = None
    collected_period_start: Optional[str] = None
    collected_period_end: Optional[str] = None
    duration_value: Optional[float] = None
    duration_unit: Optional[str] = None
    duration_system: Optional[str] = None
    duration_code: Optional[str] = None
    quantity_value: Optional[float] = None
    quantity_unit: Optional[str] = None
    quantity_system: Optional[str] = None
    quantity_code: Optional[str] = None
    method_system: Optional[str] = None
    method_code: Optional[str] = None
    method_display: Optional[str] = None
    method_text: Optional[str] = None
    body_site_system: Optional[str] = None
    body_site_code: Optional[str] = None
    body_site_display: Optional[str] = None
    body_site_text: Optional[str] = None
    fasting_status_cc_system: Optional[str] = None
    fasting_status_cc_code: Optional[str] = None
    fasting_status_cc_display: Optional[str] = None
    fasting_status_cc_text: Optional[str] = None
    fasting_status_duration_value: Optional[float] = None
    fasting_status_duration_unit: Optional[str] = None
    fasting_status_duration_system: Optional[str] = None
    fasting_status_duration_code: Optional[str] = None


class PlainSpecimenProcessingAdditive(BaseModel):
    reference_type: Optional[str] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class PlainSpecimenProcessing(BaseModel):
    description: Optional[str] = None
    procedure_system: Optional[str] = None
    procedure_code: Optional[str] = None
    procedure_display: Optional[str] = None
    procedure_text: Optional[str] = None
    time_datetime: Optional[str] = None
    time_period_start: Optional[str] = None
    time_period_end: Optional[str] = None
    additives: List[PlainSpecimenProcessingAdditive] = []


class PlainSpecimenContainerIdentifier(BaseModel):
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


class PlainSpecimenContainer(BaseModel):
    description: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    capacity_value: Optional[float] = None
    capacity_unit: Optional[str] = None
    capacity_system: Optional[str] = None
    capacity_code: Optional[str] = None
    specimen_quantity_value: Optional[float] = None
    specimen_quantity_unit: Optional[str] = None
    specimen_quantity_system: Optional[str] = None
    specimen_quantity_code: Optional[str] = None
    additive_cc_system: Optional[str] = None
    additive_cc_code: Optional[str] = None
    additive_cc_display: Optional[str] = None
    additive_cc_text: Optional[str] = None
    additive_reference_type: Optional[str] = None
    additive_reference_id: Optional[int] = None
    additive_reference_display: Optional[str] = None
    identifiers: List[PlainSpecimenContainerIdentifier] = []


class PlainSpecimenCondition(BaseModel):
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PlainSpecimenNote(BaseModel):
    text: str
    time: Optional[str] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class PlainSpecimenResponse(BaseModel):
    id: int
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    status: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    subject_type: Optional[str] = None
    subject_id: Optional[int] = None
    subject_display: Optional[str] = None
    received_time: Optional[str] = None
    accession_identifier_use: Optional[str] = None
    accession_identifier_type_system: Optional[str] = None
    accession_identifier_type_code: Optional[str] = None
    accession_identifier_type_display: Optional[str] = None
    accession_identifier_type_text: Optional[str] = None
    accession_identifier_system: Optional[str] = None
    accession_identifier_value: Optional[str] = None
    accession_identifier_period_start: Optional[str] = None
    accession_identifier_period_end: Optional[str] = None
    accession_identifier_assigner: Optional[str] = None
    collection: Optional[PlainSpecimenCollection] = None
    identifiers: List[PlainSpecimenIdentifier] = []
    parents: List[PlainSpecimenParent] = []
    requests: List[PlainSpecimenRequest] = []
    processing: List[PlainSpecimenProcessing] = []
    containers: List[PlainSpecimenContainer] = []
    conditions: List[PlainSpecimenCondition] = []
    notes: List[PlainSpecimenNote] = []


class PaginatedSpecimenResponse(BaseModel):
    total: int
    limit: int
    offset: int
    data: List[PlainSpecimenResponse]
