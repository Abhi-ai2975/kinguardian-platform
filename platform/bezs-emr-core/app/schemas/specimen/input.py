from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.specimen.enums import SpecimenStatus


class SpecimenIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class SpecimenParentInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(None, description="Reference to parent Specimen, e.g. 'Specimen/310001'.")
    display: Optional[str] = None


class SpecimenRequestInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(None, description="Reference to ServiceRequest, e.g. 'ServiceRequest/80001'.")
    display: Optional[str] = None


class SpecimenCollectionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    collector: Optional[str] = Field(None, description="Collector reference, e.g. 'Practitioner/30001' or 'PractitionerRole/140001'.")
    collector_display: Optional[str] = None
    collected_datetime: Optional[datetime] = None
    collected_period_start: Optional[datetime] = None
    collected_period_end: Optional[datetime] = None
    duration_value: Optional[Decimal] = None
    duration_unit: Optional[str] = None
    duration_system: Optional[str] = None
    duration_code: Optional[str] = None
    quantity_value: Optional[Decimal] = None
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
    fasting_status_duration_value: Optional[Decimal] = None
    fasting_status_duration_unit: Optional[str] = None
    fasting_status_duration_system: Optional[str] = None
    fasting_status_duration_code: Optional[str] = None


class SpecimenProcessingAdditiveInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: Optional[str] = Field(None, description="Reference to Substance, e.g. 'Substance/1'.")
    display: Optional[str] = None


class SpecimenProcessingInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: Optional[str] = None
    procedure_system: Optional[str] = None
    procedure_code: Optional[str] = None
    procedure_display: Optional[str] = None
    procedure_text: Optional[str] = None
    time_datetime: Optional[datetime] = None
    time_period_start: Optional[datetime] = None
    time_period_end: Optional[datetime] = None
    additives: Optional[List[SpecimenProcessingAdditiveInput]] = None


class SpecimenContainerIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class SpecimenContainerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    capacity_value: Optional[Decimal] = None
    capacity_unit: Optional[str] = None
    capacity_system: Optional[str] = None
    capacity_code: Optional[str] = None
    specimen_quantity_value: Optional[Decimal] = None
    specimen_quantity_unit: Optional[str] = None
    specimen_quantity_system: Optional[str] = None
    specimen_quantity_code: Optional[str] = None
    additive_cc_system: Optional[str] = None
    additive_cc_code: Optional[str] = None
    additive_cc_display: Optional[str] = None
    additive_cc_text: Optional[str] = None
    additive_reference: Optional[str] = Field(None, description="Additive substance reference, e.g. 'Substance/1'.")
    additive_reference_display: Optional[str] = None
    identifiers: Optional[List[SpecimenContainerIdentifierInput]] = None


class SpecimenConditionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class SpecimenNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(None, description="Author reference, e.g. 'Practitioner/30001'.")
    author_reference_display: Optional[str] = None


# ── Main create / patch schemas ───────────────────────────────────────────────


class SpecimenCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "user_id": "u-001",
                "org_id": "org-001",
                "status": "available",
                "type_system": "http://snomed.info/sct",
                "type_code": "119297000",
                "type_display": "Blood specimen",
                "subject": "Patient/10001",
                "subject_display": "John Doe",
                "received_time": "2024-01-01T09:00:00Z",
                "accession_identifier_system": "http://lab.org/accession",
                "accession_identifier_value": "ACC-001",
                "collection": {
                    "collector": "Practitioner/30001",
                    "collected_datetime": "2024-01-01T08:30:00Z",
                    "quantity_value": 5,
                    "quantity_unit": "mL",
                    "method_code": "28520004",
                    "method_system": "http://snomed.info/sct",
                    "method_display": "Venipuncture",
                },
                "processing": [
                    {
                        "description": "Centrifugation",
                        "procedure_code": "85457",
                        "procedure_system": "http://snomed.info/sct",
                        "time_datetime": "2024-01-01T09:30:00Z",
                        "additives": [{"reference": "Substance/1", "display": "EDTA"}],
                    }
                ],
                "container": [
                    {
                        "description": "Red top tube",
                        "type_code": "702281005",
                        "type_system": "http://snomed.info/sct",
                        "capacity_value": 10,
                        "capacity_unit": "mL",
                        "specimen_quantity_value": 5,
                        "specimen_quantity_unit": "mL",
                    }
                ],
                "conditions": [{"coding_code": "2667000", "coding_system": "http://snomed.info/sct", "coding_display": "Absent"}],
                "notes": [{"text": "Collected under fasting conditions."}],
                "identifiers": [{"system": "http://lab.org/spec", "value": "SPEC-001"}],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub (tenant user).")
    org_id: Optional[str] = Field(None, description="JWT activeOrganizationId (tenant org).")
    created_by: Optional[str] = None
    status: Optional[SpecimenStatus] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    subject: Optional[str] = Field(None, description="Subject reference, e.g. 'Patient/10001'.")
    subject_display: Optional[str] = None
    received_time: Optional[datetime] = None
    accession_identifier_use: Optional[str] = None
    accession_identifier_type_system: Optional[str] = None
    accession_identifier_type_code: Optional[str] = None
    accession_identifier_type_display: Optional[str] = None
    accession_identifier_type_text: Optional[str] = None
    accession_identifier_system: Optional[str] = None
    accession_identifier_value: Optional[str] = None
    accession_identifier_period_start: Optional[datetime] = None
    accession_identifier_period_end: Optional[datetime] = None
    accession_identifier_assigner: Optional[str] = None
    identifiers: Optional[List[SpecimenIdentifierInput]] = None
    parents: Optional[List[SpecimenParentInput]] = None
    requests: Optional[List[SpecimenRequestInput]] = None
    collection: Optional[SpecimenCollectionInput] = None
    processing: Optional[List[SpecimenProcessingInput]] = None
    container: Optional[List[SpecimenContainerInput]] = None
    conditions: Optional[List[SpecimenConditionInput]] = None
    notes: Optional[List[SpecimenNoteInput]] = None


class SpecimenPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    status: Optional[SpecimenStatus] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    subject: Optional[str] = None
    subject_display: Optional[str] = None
    received_time: Optional[datetime] = None
    accession_identifier_use: Optional[str] = None
    accession_identifier_type_system: Optional[str] = None
    accession_identifier_type_code: Optional[str] = None
    accession_identifier_type_display: Optional[str] = None
    accession_identifier_type_text: Optional[str] = None
    accession_identifier_system: Optional[str] = None
    accession_identifier_value: Optional[str] = None
    accession_identifier_period_start: Optional[datetime] = None
    accession_identifier_period_end: Optional[datetime] = None
    accession_identifier_assigner: Optional[str] = None
    identifiers: Optional[List[SpecimenIdentifierInput]] = None
    parents: Optional[List[SpecimenParentInput]] = None
    requests: Optional[List[SpecimenRequestInput]] = None
    collection: Optional[SpecimenCollectionInput] = None
    processing: Optional[List[SpecimenProcessingInput]] = None
    container: Optional[List[SpecimenContainerInput]] = None
    conditions: Optional[List[SpecimenConditionInput]] = None
    notes: Optional[List[SpecimenNoteInput]] = None
    updated_by: Optional[str] = None
