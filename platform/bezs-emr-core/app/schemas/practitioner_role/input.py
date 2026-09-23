from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PractitionerRoleIdentifierInput(BaseModel):
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


class PractitionerRoleCodeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PractitionerRoleSpecialtyInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PractitionerRoleLocationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Location/123'.")
    reference_display: Optional[str] = None


class PractitionerRoleHealthcareServiceInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'HealthcareService/150001'.")
    reference_display: Optional[str] = None


class PractitionerRoleCharacteristicInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PractitionerRoleCommunicationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class PractitionerRoleContactNameInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerRoleContactTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerRoleContactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # purpose (CodeableConcept)
    purpose_system: Optional[str] = None
    purpose_code: Optional[str] = None
    purpose_display: Optional[str] = None
    purpose_text: Optional[str] = None
    # address (flat columns)
    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = Field(None, description="Street lines; stored comma-separated.")
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[datetime] = None
    address_period_end: Optional[datetime] = None
    # organization reference
    organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/190001'.")
    organization_display: Optional[str] = None
    # period
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    # nested children
    names: Optional[List[PractitionerRoleContactNameInput]] = None
    telecoms: Optional[List[PractitionerRoleContactTelecomInput]] = None


class PractitionerRoleAvailableTimeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    days_of_week: Optional[List[str]] = Field(None, description="e.g. ['mon', 'wed', 'fri']")
    all_day: Optional[bool] = None
    available_start_time: Optional[str] = Field(None, description="HH:mm:ss")
    available_end_time: Optional[str] = Field(None, description="HH:mm:ss")


class PractitionerRoleNotAvailableTimeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    description: Optional[str] = None
    during_start: Optional[datetime] = None
    during_end: Optional[datetime] = None


class PractitionerRoleAvailabilityInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    available_times: Optional[List[PractitionerRoleAvailableTimeInput]] = None
    not_available_times: Optional[List[PractitionerRoleNotAvailableTimeInput]] = None


class PractitionerRoleEndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference, e.g. 'Endpoint/123'.")
    reference_display: Optional[str] = None


class PractitionerRoleCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "practitioner": "Practitioner/30001",
                "practitioner_display": "Dr. Jane Smith",
                "organization": "Organization/190001",
                "organization_display": "General Hospital",
                "active": True,
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": None,
                "availability_exceptions": "Not available on public holidays",
                "code": [
                    {
                        "coding_system": "http://snomed.info/sct",
                        "coding_code": "59058001",
                        "coding_display": "General physician",
                    }
                ],
                "specialty": [
                    {
                        "coding_system": "http://snomed.info/sct",
                        "coding_code": "394814009",
                        "coding_display": "General practice",
                    }
                ],
                "location": [{"reference": "Location/1", "reference_display": "Main Clinic"}],
                "identifier": [],
                "healthcare_service": [],
                "characteristic": [],
                "communication": [],
                "contact": [],
                "availability": [
                    {
                        "available_times": [
                            {
                                "days_of_week": ["mon", "tue", "wed", "thu", "fri"],
                                "available_start_time": "09:00:00",
                                "available_end_time": "17:00:00",
                            }
                        ],
                        "not_available_times": [],
                    }
                ],
                "endpoint": [],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    practitioner: Optional[str] = Field(None, description="Reference to Practitioner, e.g. 'Practitioner/30001'.")
    practitioner_display: Optional[str] = None
    organization: Optional[str] = Field(None, description="Reference to Organization, e.g. 'Organization/190001'.")
    organization_display: Optional[str] = None

    active: Optional[bool] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    availability_exceptions: Optional[str] = None

    identifier: Optional[List[PractitionerRoleIdentifierInput]] = None
    code: Optional[List[PractitionerRoleCodeInput]] = None
    specialty: Optional[List[PractitionerRoleSpecialtyInput]] = None
    location: Optional[List[PractitionerRoleLocationInput]] = None
    healthcare_service: Optional[List[PractitionerRoleHealthcareServiceInput]] = None
    characteristic: Optional[List[PractitionerRoleCharacteristicInput]] = None
    communication: Optional[List[PractitionerRoleCommunicationInput]] = None
    contact: Optional[List[PractitionerRoleContactInput]] = None
    availability: Optional[List[PractitionerRoleAvailabilityInput]] = None
    endpoint: Optional[List[PractitionerRoleEndpointInput]] = None


class PractitionerRolePatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    availability_exceptions: Optional[str] = None
    updated_by: Optional[str] = None
