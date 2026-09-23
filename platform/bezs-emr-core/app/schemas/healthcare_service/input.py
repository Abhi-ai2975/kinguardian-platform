from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class HealthcareServiceIdentifierInput(BaseModel):
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


class HealthcareServiceCategoryInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceSpecialtyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceLocationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Location/1'.")
    reference_display: Optional[str] = None


class HealthcareServiceTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class HealthcareServiceCoverageAreaInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Location/1'.")
    reference_display: Optional[str] = None


class HealthcareServiceServiceProvisionCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceEligibilityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    comment: Optional[str] = None


class HealthcareServiceProgramInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceCharacteristicInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceCommunicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceReferralMethodInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class HealthcareServiceAvailableTimeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    days_of_week: Optional[List[str]] = Field(None, description="e.g. ['mon', 'wed', 'fri']")
    all_day: Optional[bool] = None
    available_start_time: Optional[str] = Field(None, description="HH:mm:ss")
    available_end_time: Optional[str] = Field(None, description="HH:mm:ss")


class HealthcareServiceNotAvailableInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: str = Field(..., description="Reason for unavailability (required).")
    during_start: Optional[datetime] = None
    during_end: Optional[datetime] = None


class HealthcareServiceEndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Endpoint/1'.")
    reference_display: Optional[str] = None


class HealthcareServiceCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "provided_by": "Organization/190001",
                "provided_by_display": "General Hospital",
                "active": True,
                "name": "General Practice Consultation",
                "comment": "Walk-in and appointment-based GP service",
                "extra_details": "Extended hours on Tuesdays until 20:00.",
                "appointment_required": False,
                "availability_exceptions": "Closed public holidays",
                "category": [
                    {
                        "coding_system": "http://example.org/service-category",
                        "coding_code": "17",
                        "coding_display": "General Practice",
                    }
                ],
                "type": [{"coding_code": "57", "coding_display": "Immunization"}],
                "specialty": [
                    {
                        "coding_system": "http://snomed.info/sct",
                        "coding_code": "394814009",
                        "coding_display": "General practice",
                    }
                ],
                "available_time": [
                    {
                        "days_of_week": ["mon", "tue", "wed", "thu", "fri"],
                        "available_start_time": "09:00:00",
                        "available_end_time": "17:00:00",
                    }
                ],
                "identifier": [],
                "location": [],
                "telecom": [],
                "coverage_area": [],
                "service_provision_code": [],
                "eligibility": [],
                "program": [],
                "characteristic": [],
                "communication": [],
                "referral_method": [],
                "not_available": [],
                "endpoint": [],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    provided_by: Optional[str] = Field(None, description="Reference to Organization, e.g. 'Organization/190001'.")
    provided_by_display: Optional[str] = None

    active: Optional[bool] = None
    name: Optional[str] = None
    comment: Optional[str] = None
    extra_details: Optional[str] = None
    appointment_required: Optional[bool] = None
    availability_exceptions: Optional[str] = None

    # photo (Attachment — flat)
    photo_content_type: Optional[str] = None
    photo_language: Optional[str] = None
    photo_data: Optional[str] = None
    photo_url: Optional[str] = None
    photo_size: Optional[int] = None
    photo_hash: Optional[str] = None
    photo_title: Optional[str] = None
    photo_creation: Optional[datetime] = None

    identifier: Optional[List[HealthcareServiceIdentifierInput]] = None
    category: Optional[List[HealthcareServiceCategoryInput]] = None
    type: Optional[List[HealthcareServiceTypeInput]] = None
    specialty: Optional[List[HealthcareServiceSpecialtyInput]] = None
    location: Optional[List[HealthcareServiceLocationInput]] = None
    telecom: Optional[List[HealthcareServiceTelecomInput]] = None
    coverage_area: Optional[List[HealthcareServiceCoverageAreaInput]] = None
    service_provision_code: Optional[List[HealthcareServiceServiceProvisionCodeInput]] = None
    eligibility: Optional[List[HealthcareServiceEligibilityInput]] = None
    program: Optional[List[HealthcareServiceProgramInput]] = None
    characteristic: Optional[List[HealthcareServiceCharacteristicInput]] = None
    communication: Optional[List[HealthcareServiceCommunicationInput]] = None
    referral_method: Optional[List[HealthcareServiceReferralMethodInput]] = None
    available_time: Optional[List[HealthcareServiceAvailableTimeInput]] = None
    not_available: Optional[List[HealthcareServiceNotAvailableInput]] = None
    endpoint: Optional[List[HealthcareServiceEndpointInput]] = None


class HealthcareServicePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    name: Optional[str] = None
    comment: Optional[str] = None
    extra_details: Optional[str] = None
    appointment_required: Optional[bool] = None
    availability_exceptions: Optional[str] = None
    photo_content_type: Optional[str] = None
    photo_language: Optional[str] = None
    photo_data: Optional[str] = None
    photo_url: Optional[str] = None
    photo_size: Optional[int] = None
    photo_hash: Optional[str] = None
    photo_title: Optional[str] = None
    photo_creation: Optional[datetime] = None
    updated_by: Optional[str] = None
