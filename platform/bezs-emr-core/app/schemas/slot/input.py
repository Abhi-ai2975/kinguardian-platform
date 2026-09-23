from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class SlotIdentifierInput(BaseModel):
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


class SlotServiceCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class SlotServiceTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class SlotSpecialtyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class SlotCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "schedule": "Schedule/200001",
                "status": "free",
                "start": "2024-06-01T09:00:00Z",
                "end": "2024-06-01T09:30:00Z",
                "overbooked": False,
                "comment": "Morning slot — first appointment of the day",
                "appointment_type_system": "http://terminology.hl7.org/CodeSystem/v2-0276",
                "appointment_type_code": "ROUTINE",
                "appointment_type_display": "Routine appointment",
                "appointment_type_text": None,
                "service_category": [
                    {
                        "coding_system": "http://example.org/service-category",
                        "coding_code": "17",
                        "coding_display": "General Practice",
                    }
                ],
                "service_type": [{"coding_code": "57", "coding_display": "Immunization"}],
                "specialty": [
                    {
                        "coding_system": "http://snomed.info/sct",
                        "coding_code": "394814009",
                        "coding_display": "General practice",
                    }
                ],
                "identifier": [],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    schedule: str = Field(
        ..., description="Reference to the Schedule this slot belongs to, e.g. 'Schedule/200001'."
    )
    schedule_display: Optional[str] = Field(None, description="Display text for the schedule reference.")

    status: str = Field(..., description="Slot status: busy | free | busy-unavailable | busy-tentative | entered-in-error.")
    start: Optional[datetime] = Field(None, description="Date/Time the slot begins.")
    end: Optional[datetime] = Field(None, description="Date/Time the slot concludes.")
    overbooked: Optional[bool] = Field(None, description="Indicates slot has exceeded capacity.")
    comment: Optional[str] = Field(None, description="Comments on the slot.")

    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None

    identifier: Optional[List[SlotIdentifierInput]] = None
    service_category: Optional[List[SlotServiceCategoryInput]] = None
    service_type: Optional[List[SlotServiceTypeInput]] = None
    specialty: Optional[List[SlotSpecialtyInput]] = None


class SlotPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    start: Optional[datetime] = None
    end: Optional[datetime] = None
    overbooked: Optional[bool] = None
    comment: Optional[str] = None
    appointment_type_system: Optional[str] = None
    appointment_type_code: Optional[str] = None
    appointment_type_display: Optional[str] = None
    appointment_type_text: Optional[str] = None
    updated_by: Optional[str] = None
