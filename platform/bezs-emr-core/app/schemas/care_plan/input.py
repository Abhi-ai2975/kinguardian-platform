from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class CarePlanIdentifierInput(BaseModel):
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


class CarePlanBasedOnInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to another CarePlan, e.g. 'CarePlan/290001'.")
    reference_display: Optional[str] = None


class CarePlanReplacesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to replaced CarePlan, e.g. 'CarePlan/290001'.")
    reference_display: Optional[str] = None


class CarePlanPartOfInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to parent CarePlan, e.g. 'CarePlan/290001'.")
    reference_display: Optional[str] = None


class CarePlanCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class CarePlanContributorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description=(
            "Allowed: Patient/<id>, Practitioner/<id>, PractitionerRole/<id>, "
            "Device/<id>, RelatedPerson/<id>, Organization/<id>, CareTeam/<id>."
        ),
    )
    reference_display: Optional[str] = None


class CarePlanCareTeamInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to CareTeam, e.g. 'CareTeam/1'.")
    reference_display: Optional[str] = None


class CarePlanAddressesInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Condition, e.g. 'Condition/120001'.")
    reference_display: Optional[str] = None


class CarePlanSupportingInfoInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Open reference to any supporting info resource.")
    reference_display: Optional[str] = None


class CarePlanGoalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Goal resource.")
    reference_display: Optional[str] = None


class CarePlanNoteInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Annotation text content.")
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(None, description="Open reference to note author.")
    author_reference_display: Optional[str] = None


class CarePlanActivityOutcomeCCInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class CarePlanActivityOutcomeRefInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Open reference to outcome resource.")
    reference_display: Optional[str] = None


class CarePlanActivityProgressInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    text: str = Field(..., description="Progress note text.")
    time: Optional[datetime] = None
    author_string: Optional[str] = None
    author_reference: Optional[str] = Field(None, description="Open reference to note author.")
    author_reference_display: Optional[str] = None


class CarePlanActivityDetailReasonCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class CarePlanActivityDetailReasonRefInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description=(
            "Allowed: Condition/<id>, Observation/<id>, DiagnosticReport/<id>, DocumentReference/<id>."
        ),
    )
    reference_display: Optional[str] = None


class CarePlanActivityDetailGoalInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="Reference to Goal resource.")
    reference_display: Optional[str] = None


class CarePlanActivityDetailPerformerInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description=(
            "Allowed: Practitioner/<id>, PractitionerRole/<id>, Organization/<id>, "
            "RelatedPerson/<id>, Patient/<id>, CareTeam/<id>, HealthcareService/<id>, Device/<id>."
        ),
    )
    reference_display: Optional[str] = None


class CarePlanActivityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    # activity.reference (0..1 closed)
    reference: Optional[str] = Field(
        None,
        description=(
            "Allowed: Appointment/<id>, CommunicationRequest/<id>, DeviceRequest/<id>, "
            "MedicationRequest/<id>, NutritionOrder/<id>, Task/<id>, ServiceRequest/<id>, "
            "VisionPrescription/<id>, RequestGroup/<id>."
        ),
    )
    reference_display: Optional[str] = None

    # detail scalar fields
    detail_kind: Optional[str] = None
    detail_instantiates_canonical: Optional[str] = Field(None, description="Comma-separated canonical URIs.")
    detail_instantiates_uri: Optional[str] = Field(None, description="Comma-separated URIs.")
    detail_code_system: Optional[str] = None
    detail_code_code: Optional[str] = None
    detail_code_display: Optional[str] = None
    detail_code_text: Optional[str] = None
    detail_status: Optional[str] = Field(
        None,
        description="not-started | scheduled | in-progress | on-hold | completed | cancelled | stopped | unknown | entered-in-error",
    )
    detail_status_reason_system: Optional[str] = None
    detail_status_reason_code: Optional[str] = None
    detail_status_reason_display: Optional[str] = None
    detail_status_reason_text: Optional[str] = None
    detail_do_not_perform: Optional[bool] = None

    # scheduled[x] — Timing variant
    detail_scheduled_timing_event: Optional[str] = Field(None, description="Comma-separated datetime strings.")
    detail_scheduled_timing_code_system: Optional[str] = None
    detail_scheduled_timing_code_code: Optional[str] = None
    detail_scheduled_timing_code_display: Optional[str] = None
    detail_scheduled_timing_code_text: Optional[str] = None
    detail_scheduled_timing_repeat_count: Optional[int] = None
    detail_scheduled_timing_repeat_count_max: Optional[int] = None
    detail_scheduled_timing_repeat_duration: Optional[float] = None
    detail_scheduled_timing_repeat_duration_max: Optional[float] = None
    detail_scheduled_timing_repeat_duration_unit: Optional[str] = None
    detail_scheduled_timing_repeat_frequency: Optional[int] = None
    detail_scheduled_timing_repeat_frequency_max: Optional[int] = None
    detail_scheduled_timing_repeat_period: Optional[float] = None
    detail_scheduled_timing_repeat_period_max: Optional[float] = None
    detail_scheduled_timing_repeat_period_unit: Optional[str] = None
    detail_scheduled_timing_repeat_day_of_week: Optional[str] = Field(None, description="Comma-separated day codes.")
    detail_scheduled_timing_repeat_time_of_day: Optional[str] = Field(None, description="Comma-separated times.")
    detail_scheduled_timing_repeat_when: Optional[str] = Field(None, description="Comma-separated when codes.")
    detail_scheduled_timing_repeat_offset: Optional[int] = None
    detail_scheduled_timing_repeat_bounds_start: Optional[datetime] = None
    detail_scheduled_timing_repeat_bounds_end: Optional[datetime] = None

    # scheduled[x] — Period variant
    detail_scheduled_period_start: Optional[datetime] = None
    detail_scheduled_period_end: Optional[datetime] = None

    # scheduled[x] — string variant
    detail_scheduled_string: Optional[str] = None

    # detail.location (0..1 Reference(Location))
    detail_location: Optional[str] = Field(None, description="Reference to Location, e.g. 'Location/230001'.")
    detail_location_display: Optional[str] = None

    # detail.product[x] — CodeableConcept variant
    detail_product_codeable_concept_system: Optional[str] = None
    detail_product_codeable_concept_code: Optional[str] = None
    detail_product_codeable_concept_display: Optional[str] = None
    detail_product_codeable_concept_text: Optional[str] = None

    # detail.product[x] — Reference(Medication|Substance) variant
    detail_product_reference: Optional[str] = Field(
        None, description="Reference to Medication/<id> or Substance/<id>."
    )
    detail_product_reference_display: Optional[str] = None

    # detail.dailyAmount (0..1 SimpleQuantity)
    detail_daily_amount_value: Optional[float] = None
    detail_daily_amount_unit: Optional[str] = None
    detail_daily_amount_system: Optional[str] = None
    detail_daily_amount_code: Optional[str] = None

    # detail.quantity (0..1 SimpleQuantity)
    detail_quantity_value: Optional[float] = None
    detail_quantity_unit: Optional[str] = None
    detail_quantity_system: Optional[str] = None
    detail_quantity_code: Optional[str] = None

    # detail.description
    detail_description: Optional[str] = None

    # grandchild arrays
    outcome_codeable_concepts: Optional[List[CarePlanActivityOutcomeCCInput]] = None
    outcome_references: Optional[List[CarePlanActivityOutcomeRefInput]] = None
    progress: Optional[List[CarePlanActivityProgressInput]] = None
    detail_reason_codes: Optional[List[CarePlanActivityDetailReasonCodeInput]] = None
    detail_reason_references: Optional[List[CarePlanActivityDetailReasonRefInput]] = None
    detail_goals: Optional[List[CarePlanActivityDetailGoalInput]] = None
    detail_performers: Optional[List[CarePlanActivityDetailPerformerInput]] = None


class CarePlanCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "status": "active",
                    "intent": "plan",
                    "title": "Diabetes Management Plan",
                    "subject": "Patient/10001",
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    status: str = Field(..., description="draft | active | on-hold | revoked | completed | entered-in-error | unknown")
    intent: str = Field(..., description="proposal | plan | order | option")

    subject: Optional[str] = Field(None, description="Reference to Patient/<id> or Group/<id>.")
    subject_display: Optional[str] = None

    title: Optional[str] = None
    description: Optional[str] = None
    encounter: Optional[str] = Field(None, description="Reference to Encounter, e.g. 'Encounter/20001'.")
    encounter_display: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created: Optional[datetime] = None
    author: Optional[str] = Field(
        None,
        description=(
            "Allowed: Patient/<id>, Practitioner/<id>, PractitionerRole/<id>, "
            "Device/<id>, RelatedPerson/<id>, Organization/<id>, CareTeam/<id>."
        ),
    )
    author_display: Optional[str] = None
    instantiates_canonical: Optional[str] = Field(None, description="Comma-separated canonical URIs.")
    instantiates_uri: Optional[str] = Field(None, description="Comma-separated URIs.")

    identifiers: Optional[List[CarePlanIdentifierInput]] = None
    based_on: Optional[List[CarePlanBasedOnInput]] = None
    replaces: Optional[List[CarePlanReplacesInput]] = None
    part_of: Optional[List[CarePlanPartOfInput]] = None
    categories: Optional[List[CarePlanCategoryInput]] = None
    contributors: Optional[List[CarePlanContributorInput]] = None
    care_teams: Optional[List[CarePlanCareTeamInput]] = None
    addresses: Optional[List[CarePlanAddressesInput]] = None
    supporting_info: Optional[List[CarePlanSupportingInfoInput]] = None
    goals: Optional[List[CarePlanGoalInput]] = None
    activities: Optional[List[CarePlanActivityInput]] = None
    notes: Optional[List[CarePlanNoteInput]] = None


class CarePlanPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    status: Optional[str] = None
    intent: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    subject: Optional[str] = None
    subject_display: Optional[str] = None
    encounter: Optional[str] = None
    encounter_display: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    created: Optional[datetime] = None
    author: Optional[str] = None
    author_display: Optional[str] = None
    instantiates_canonical: Optional[str] = None
    instantiates_uri: Optional[str] = None

    identifiers: Optional[List[CarePlanIdentifierInput]] = None
    based_on: Optional[List[CarePlanBasedOnInput]] = None
    replaces: Optional[List[CarePlanReplacesInput]] = None
    part_of: Optional[List[CarePlanPartOfInput]] = None
    categories: Optional[List[CarePlanCategoryInput]] = None
    contributors: Optional[List[CarePlanContributorInput]] = None
    care_teams: Optional[List[CarePlanCareTeamInput]] = None
    addresses: Optional[List[CarePlanAddressesInput]] = None
    supporting_info: Optional[List[CarePlanSupportingInfoInput]] = None
    goals: Optional[List[CarePlanGoalInput]] = None
    activities: Optional[List[CarePlanActivityInput]] = None
    notes: Optional[List[CarePlanNoteInput]] = None
    updated_by: Optional[str] = None
