from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class AllergyIntoleranceIdentifierInput(BaseModel):
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


class AllergyIntoleranceNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class AllergyIntoleranceReactionManifestationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class AllergyIntoleranceReactionNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference_type: Optional[str] = None
    author_reference_id: Optional[int] = None
    author_reference_display: Optional[str] = None


class AllergyIntoleranceReactionInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    substance_system: Optional[str] = None
    substance_code: Optional[str] = None
    substance_display: Optional[str] = None
    substance_text: Optional[str] = None

    manifestations: List[AllergyIntoleranceReactionManifestationInput] = Field(
        ..., min_length=1, description="Clinical symptoms/signs (1..* required)."
    )

    description: Optional[str] = None
    onset: Optional[datetime] = None
    severity: Optional[str] = Field(None, description="mild | moderate | severe")

    exposure_route_system: Optional[str] = None
    exposure_route_code: Optional[str] = None
    exposure_route_display: Optional[str] = None
    exposure_route_text: Optional[str] = None

    notes: Optional[List[AllergyIntoleranceReactionNoteInput]] = None


class AllergyIntoleranceCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "clinical_status_system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-clinical",
                    "clinical_status_code": "active",
                    "clinical_status_display": "Active",
                    "verification_status_system": "http://terminology.hl7.org/CodeSystem/allergyintolerance-verification",
                    "verification_status_code": "confirmed",
                    "verification_status_display": "Confirmed",
                    "type": "allergy",
                    "criticality": "high",
                    "code_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
                    "code_code": "1049502",
                    "code_display": "Penicillin",
                    "patient": "Patient/10001",
                    "patient_display": "John Doe",
                    "encounter": "Encounter/20001",
                    "onset_date_time": "2020-01-01T00:00:00Z",
                    "recorded_date": "2020-01-02T00:00:00Z",
                    "recorder": "Practitioner/30001",
                    "recorder_display": "Dr. Smith",
                    "categories": ["medication"],
                    "reactions": [
                        {
                            "manifestations": [
                                {
                                    "coding_system": "http://snomed.info/sct",
                                    "coding_code": "271807003",
                                    "coding_display": "Skin rash",
                                }
                            ],
                            "severity": "mild",
                        }
                    ],
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    # clinicalStatus (0..1 CodeableConcept)
    clinical_status_system: Optional[str] = None
    clinical_status_code: Optional[str] = None
    clinical_status_display: Optional[str] = None
    clinical_status_text: Optional[str] = None

    # verificationStatus (0..1 CodeableConcept)
    verification_status_system: Optional[str] = None
    verification_status_code: Optional[str] = None
    verification_status_display: Optional[str] = None
    verification_status_text: Optional[str] = None

    type: Optional[str] = Field(None, description="allergy | intolerance")
    criticality: Optional[str] = Field(None, description="low | high | unable-to-assess")

    # code (0..1 CodeableConcept)
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    # patient (1..1 Reference)
    patient: str = Field(..., description="FHIR reference, e.g. 'Patient/10001'.")
    patient_display: Optional[str] = None

    # encounter (0..1 Reference)
    encounter: Optional[str] = Field(None, description="FHIR reference, e.g. 'Encounter/20001'.")
    encounter_display: Optional[str] = None

    # onset[x] — exactly one variant expected
    onset_date_time: Optional[datetime] = None

    onset_age_value: Optional[Decimal] = None
    onset_age_comparator: Optional[str] = None
    onset_age_unit: Optional[str] = None
    onset_age_system: Optional[str] = None
    onset_age_code: Optional[str] = None

    onset_period_start: Optional[datetime] = None
    onset_period_end: Optional[datetime] = None

    onset_range_low_value: Optional[Decimal] = None
    onset_range_low_unit: Optional[str] = None
    onset_range_low_system: Optional[str] = None
    onset_range_low_code: Optional[str] = None
    onset_range_high_value: Optional[Decimal] = None
    onset_range_high_unit: Optional[str] = None
    onset_range_high_system: Optional[str] = None
    onset_range_high_code: Optional[str] = None

    onset_string: Optional[str] = None

    recorded_date: Optional[datetime] = None

    # recorder (0..1 Reference)
    recorder: Optional[str] = Field(
        None,
        description="FHIR reference, e.g. 'Practitioner/30001' or 'Patient/10001'.",
    )
    recorder_display: Optional[str] = None

    # asserter (0..1 Reference)
    asserter: Optional[str] = Field(
        None,
        description="FHIR reference, e.g. 'Practitioner/30001' or 'PractitionerRole/140001'.",
    )
    asserter_display: Optional[str] = None

    last_occurrence: Optional[datetime] = None

    # child arrays
    identifiers: Optional[List[AllergyIntoleranceIdentifierInput]] = None
    categories: Optional[List[str]] = Field(
        None, description="food | medication | environment | biologic"
    )
    notes: Optional[List[AllergyIntoleranceNoteInput]] = None
    reactions: Optional[List[AllergyIntoleranceReactionInput]] = None


class AllergyIntolerancePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    clinical_status_system: Optional[str] = None
    clinical_status_code: Optional[str] = None
    clinical_status_display: Optional[str] = None
    clinical_status_text: Optional[str] = None

    verification_status_system: Optional[str] = None
    verification_status_code: Optional[str] = None
    verification_status_display: Optional[str] = None
    verification_status_text: Optional[str] = None

    type: Optional[str] = None
    criticality: Optional[str] = None

    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None

    encounter: Optional[str] = None
    encounter_display: Optional[str] = None

    onset_date_time: Optional[datetime] = None
    onset_age_value: Optional[Decimal] = None
    onset_age_comparator: Optional[str] = None
    onset_age_unit: Optional[str] = None
    onset_age_system: Optional[str] = None
    onset_age_code: Optional[str] = None
    onset_period_start: Optional[datetime] = None
    onset_period_end: Optional[datetime] = None
    onset_range_low_value: Optional[Decimal] = None
    onset_range_low_unit: Optional[str] = None
    onset_range_low_system: Optional[str] = None
    onset_range_low_code: Optional[str] = None
    onset_range_high_value: Optional[Decimal] = None
    onset_range_high_unit: Optional[str] = None
    onset_range_high_system: Optional[str] = None
    onset_range_high_code: Optional[str] = None
    onset_string: Optional[str] = None

    recorded_date: Optional[datetime] = None

    recorder: Optional[str] = None
    recorder_display: Optional[str] = None

    asserter: Optional[str] = None
    asserter_display: Optional[str] = None

    last_occurrence: Optional[datetime] = None

    identifiers: Optional[List[AllergyIntoleranceIdentifierInput]] = None
    categories: Optional[List[str]] = None
    notes: Optional[List[AllergyIntoleranceNoteInput]] = None
    reactions: Optional[List[AllergyIntoleranceReactionInput]] = None
    updated_by: Optional[str] = None
