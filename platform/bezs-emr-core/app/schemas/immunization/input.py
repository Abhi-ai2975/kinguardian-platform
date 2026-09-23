from datetime import date, datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.immunization.enums import ImmunizationStatus


class ImmunizationIdentifierInput(BaseModel):
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


class ImmunizationPerformerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    function_system: Optional[str] = None
    function_code: Optional[str] = None
    function_display: Optional[str] = None
    function_text: Optional[str] = None
    actor: Optional[str] = Field(None, description="Actor reference, e.g. 'Practitioner/30001'.")
    actor_display: Optional[str] = None


class ImmunizationNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(None, description="Author reference, e.g. 'Practitioner/30001'.")
    author_reference_display: Optional[str] = None


class ImmunizationReasonCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ImmunizationReasonReferenceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reason reference, e.g. 'Condition/120001'.")
    display: Optional[str] = None


class ImmunizationSubpotentReasonInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ImmunizationEducationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    document_type: Optional[str] = None
    reference: Optional[str] = None
    publication_date: Optional[datetime] = None
    presentation_date: Optional[datetime] = None


class ImmunizationProgramEligibilityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ImmunizationReactionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    date: Optional[datetime] = None
    detail: Optional[str] = Field(None, description="Observation reference, e.g. 'Observation/160001'.")
    detail_display: Optional[str] = None
    reported: Optional[bool] = None


class ImmunizationTargetDiseaseInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ImmunizationProtocolAppliedInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    series: Optional[str] = None
    authority: Optional[str] = Field(None, description="Authority reference, e.g. 'Organization/190001'.")
    authority_display: Optional[str] = None
    dose_number_positive_int: Optional[int] = None
    dose_number_string: Optional[str] = None
    series_doses_positive_int: Optional[int] = None
    series_doses_string: Optional[str] = None
    target_diseases: Optional[List[ImmunizationTargetDiseaseInput]] = None


class ImmunizationCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None

    status: ImmunizationStatus
    occurrence_datetime: Optional[datetime] = None
    occurrence_string: Optional[str] = None

    # statusReason
    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    # vaccineCode
    vaccine_code_system: Optional[str] = None
    vaccine_code_code: Optional[str] = None
    vaccine_code_display: Optional[str] = None
    vaccine_code_text: Optional[str] = None

    # patient
    patient: Optional[str] = Field(None, description="Patient reference, e.g. 'Patient/10001'.")
    patient_display: Optional[str] = None

    # encounter
    encounter: Optional[str] = Field(None, description="Encounter reference, e.g. 'Encounter/20001'.")
    encounter_display: Optional[str] = None

    recorded: Optional[datetime] = None
    primary_source: Optional[bool] = None

    # reportOrigin
    report_origin_system: Optional[str] = None
    report_origin_code: Optional[str] = None
    report_origin_display: Optional[str] = None
    report_origin_text: Optional[str] = None

    # location
    location: Optional[str] = Field(None, description="Location reference, e.g. 'Location/230001'.")
    location_display: Optional[str] = None

    # manufacturer
    manufacturer: Optional[str] = Field(None, description="Organization reference, e.g. 'Organization/190001'.")
    manufacturer_display: Optional[str] = None

    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None

    # site
    site_system: Optional[str] = None
    site_code: Optional[str] = None
    site_display: Optional[str] = None
    site_text: Optional[str] = None

    # route
    route_system: Optional[str] = None
    route_code: Optional[str] = None
    route_display: Optional[str] = None
    route_text: Optional[str] = None

    # doseQuantity
    dose_quantity_value: Optional[Decimal] = None
    dose_quantity_unit: Optional[str] = None
    dose_quantity_system: Optional[str] = None
    dose_quantity_code: Optional[str] = None

    is_subpotent: Optional[bool] = None

    # fundingSource
    funding_source_system: Optional[str] = None
    funding_source_code: Optional[str] = None
    funding_source_display: Optional[str] = None
    funding_source_text: Optional[str] = None

    # Children
    identifiers: Optional[List[ImmunizationIdentifierInput]] = None
    performers: Optional[List[ImmunizationPerformerInput]] = None
    notes: Optional[List[ImmunizationNoteInput]] = None
    reason_codes: Optional[List[ImmunizationReasonCodeInput]] = None
    reason_references: Optional[List[ImmunizationReasonReferenceInput]] = None
    subpotent_reasons: Optional[List[ImmunizationSubpotentReasonInput]] = None
    educations: Optional[List[ImmunizationEducationInput]] = None
    program_eligibilities: Optional[List[ImmunizationProgramEligibilityInput]] = None
    reactions: Optional[List[ImmunizationReactionInput]] = None
    protocol_applied: Optional[List[ImmunizationProtocolAppliedInput]] = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "u-test",
                "org_id": "org-test",
                "status": "completed",
                "occurrence_datetime": "2024-01-15T10:00:00Z",
                "vaccine_code_system": "http://hl7.org/fhir/sid/cvx",
                "vaccine_code_code": "208",
                "vaccine_code_display": "COVID-19, mRNA, LNP-S, PF, 30 mcg/0.3 mL dose",
                "patient": "Patient/10001",
                "patient_display": "John Doe",
                "primary_source": True,
            }
        },
    )


class ImmunizationPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[ImmunizationStatus] = None
    occurrence_datetime: Optional[datetime] = None
    occurrence_string: Optional[str] = None

    status_reason_system: Optional[str] = None
    status_reason_code: Optional[str] = None
    status_reason_display: Optional[str] = None
    status_reason_text: Optional[str] = None

    vaccine_code_system: Optional[str] = None
    vaccine_code_code: Optional[str] = None
    vaccine_code_display: Optional[str] = None
    vaccine_code_text: Optional[str] = None

    patient: Optional[str] = None
    patient_display: Optional[str] = None

    encounter: Optional[str] = None
    encounter_display: Optional[str] = None

    recorded: Optional[datetime] = None
    primary_source: Optional[bool] = None

    report_origin_system: Optional[str] = None
    report_origin_code: Optional[str] = None
    report_origin_display: Optional[str] = None
    report_origin_text: Optional[str] = None

    location: Optional[str] = None
    location_display: Optional[str] = None

    manufacturer: Optional[str] = None
    manufacturer_display: Optional[str] = None

    lot_number: Optional[str] = None
    expiration_date: Optional[date] = None

    site_system: Optional[str] = None
    site_code: Optional[str] = None
    site_display: Optional[str] = None
    site_text: Optional[str] = None

    route_system: Optional[str] = None
    route_code: Optional[str] = None
    route_display: Optional[str] = None
    route_text: Optional[str] = None

    dose_quantity_value: Optional[Decimal] = None
    dose_quantity_unit: Optional[str] = None
    dose_quantity_system: Optional[str] = None
    dose_quantity_code: Optional[str] = None

    is_subpotent: Optional[bool] = None

    funding_source_system: Optional[str] = None
    funding_source_code: Optional[str] = None
    funding_source_display: Optional[str] = None
    funding_source_text: Optional[str] = None

    identifiers: Optional[List[ImmunizationIdentifierInput]] = None
    performers: Optional[List[ImmunizationPerformerInput]] = None
    notes: Optional[List[ImmunizationNoteInput]] = None
    reason_codes: Optional[List[ImmunizationReasonCodeInput]] = None
    reason_references: Optional[List[ImmunizationReasonReferenceInput]] = None
    subpotent_reasons: Optional[List[ImmunizationSubpotentReasonInput]] = None
    educations: Optional[List[ImmunizationEducationInput]] = None
    program_eligibilities: Optional[List[ImmunizationProgramEligibilityInput]] = None
    reactions: Optional[List[ImmunizationReactionInput]] = None
    protocol_applied: Optional[List[ImmunizationProtocolAppliedInput]] = None
    updated_by: Optional[str] = None
