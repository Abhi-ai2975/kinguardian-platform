from datetime import datetime
from decimal import Decimal
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class LocationIdentifierInput(BaseModel):
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


class LocationTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class LocationTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[str] = Field(None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = None
    use: Optional[str] = Field(None, description="home | work | temp | old | mobile")
    rank: Optional[int] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class LocationHoursOfOperationInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    days_of_week: Optional[List[str]] = Field(None, description="Days available, e.g. ['mon', 'wed', 'fri']")
    all_day: Optional[bool] = None
    opening_time: Optional[str] = Field(None, description="HH:mm:ss opening time")
    closing_time: Optional[str] = Field(None, description="HH:mm:ss closing time")


class LocationEndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR Endpoint reference, e.g. 'Endpoint/1'.")
    reference_display: Optional[str] = None


class LocationCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "examples": [
                {
                    "user_id": "u-test",
                    "org_id": "org-test",
                    "status": "active",
                    "name": "Main Building",
                    "description": "Primary hospital building",
                    "mode": "instance",
                    "address_line": ["123 Main St", "Suite 100"],
                    "address_city": "Springfield",
                    "address_state": "IL",
                    "address_postal_code": "62701",
                    "address_country": "US",
                    "physical_type_system": "http://terminology.hl7.org/CodeSystem/location-physical-type",
                    "physical_type_code": "bu",
                    "physical_type_display": "Building",
                    "managing_organization": "Organization/190001",
                    "managing_organization_display": "General Hospital",
                    "position_longitude": -89.6501481,
                    "position_latitude": 39.7817213,
                    "hours_of_operation": [
                        {
                            "days_of_week": ["mon", "tue", "wed", "thu", "fri"],
                            "all_day": False,
                            "opening_time": "08:00:00",
                            "closing_time": "17:00:00",
                        }
                    ],
                }
            ]
        },
    )

    user_id: str
    org_id: str
    created_by: Optional[str] = None

    status: Optional[str] = Field(None, description="active | suspended | inactive")
    operational_status_system: Optional[str] = None
    operational_status_code: Optional[str] = None
    operational_status_display: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = Field(None, description="instance | kind")

    identifiers: Optional[List[LocationIdentifierInput]] = None
    aliases: Optional[List[str]] = Field(None, description="Alternate names for the location.")
    types: Optional[List[LocationTypeInput]] = None
    telecoms: Optional[List[LocationTelecomInput]] = None

    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = Field(None, description="Street address lines.")
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[datetime] = None
    address_period_end: Optional[datetime] = None

    physical_type_system: Optional[str] = None
    physical_type_code: Optional[str] = None
    physical_type_display: Optional[str] = None
    physical_type_text: Optional[str] = None

    managing_organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/190001'.")
    managing_organization_display: Optional[str] = None
    part_of: Optional[str] = Field(None, description="Parent location reference, e.g. 'Location/230001'.")
    part_of_display: Optional[str] = None

    availability_exceptions: Optional[str] = None

    position_longitude: Optional[Decimal] = None
    position_latitude: Optional[Decimal] = None
    position_altitude: Optional[Decimal] = None

    hours_of_operation: Optional[List[LocationHoursOfOperationInput]] = None
    endpoints: Optional[List[LocationEndpointInput]] = None


class LocationPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: Optional[str] = None
    operational_status_system: Optional[str] = None
    operational_status_code: Optional[str] = None
    operational_status_display: Optional[str] = None
    name: Optional[str] = None
    description: Optional[str] = None
    mode: Optional[str] = None

    address_use: Optional[str] = None
    address_type: Optional[str] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[datetime] = None
    address_period_end: Optional[datetime] = None

    physical_type_system: Optional[str] = None
    physical_type_code: Optional[str] = None
    physical_type_display: Optional[str] = None
    physical_type_text: Optional[str] = None

    managing_organization: Optional[str] = None
    managing_organization_display: Optional[str] = None
    part_of: Optional[str] = None
    part_of_display: Optional[str] = None

    availability_exceptions: Optional[str] = None

    position_longitude: Optional[Decimal] = None
    position_latitude: Optional[Decimal] = None
    position_altitude: Optional[Decimal] = None
    updated_by: Optional[str] = None
