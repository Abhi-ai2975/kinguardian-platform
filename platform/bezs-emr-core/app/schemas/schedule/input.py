from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class ScheduleIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: str = Field(..., description="Identifier value.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class ScheduleServiceCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ScheduleServiceTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ScheduleSpecialtyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ScheduleActorInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(
        ...,
        description=(
            "FHIR reference e.g. 'Practitioner/30001'. "
            "Allowed types: Patient, Practitioner, PractitionerRole, RelatedPerson, "
            "Device, HealthcareService, Location."
        ),
    )
    reference_display: Optional[str] = None


class ScheduleCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "active": True,
                "comment": "Schedule for Dr. Smith — Mon/Wed/Fri mornings",
                "planning_horizon_start": "2024-01-01T08:00:00Z",
                "planning_horizon_end": "2024-12-31T12:00:00Z",
                "service_category": [
                    {
                        "coding_system": "http://example.org/service-category",
                        "coding_code": "17",
                        "coding_display": "General Practice",
                    }
                ],
                "service_type": [
                    {"coding_code": "57", "coding_display": "Immunization"}
                ],
                "specialty": [
                    {
                        "coding_system": "http://snomed.info/sct",
                        "coding_code": "394814009",
                        "coding_display": "General practice",
                    }
                ],
                "actor": [{"reference": "Practitioner/30001", "reference_display": "Dr. Smith"}],
                "identifier": [],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    active: Optional[bool] = Field(None, description="Whether this schedule is active.")
    comment: Optional[str] = Field(None, description="Comments on availability of slots.")
    planning_horizon_start: Optional[datetime] = Field(
        None, description="Start of the period for which slots should be provided."
    )
    planning_horizon_end: Optional[datetime] = Field(
        None, description="End of the period for which slots should be provided."
    )

    identifier: Optional[List[ScheduleIdentifierInput]] = None
    service_category: Optional[List[ScheduleServiceCategoryInput]] = None
    service_type: Optional[List[ScheduleServiceTypeInput]] = None
    specialty: Optional[List[ScheduleSpecialtyInput]] = None
    actor: Optional[List[ScheduleActorInput]] = Field(
        None, description="Resource(s) that this schedule is providing availability for (1..*)."
    )


class SchedulePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    comment: Optional[str] = None
    planning_horizon_start: Optional[datetime] = None
    planning_horizon_end: Optional[datetime] = None
    updated_by: Optional[str] = None
