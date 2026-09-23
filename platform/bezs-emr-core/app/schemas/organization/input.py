from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import (
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)


# ── Sub-resource input schemas ─────────────────────────────────────────────────


class OrganizationIdentifierInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[IdentifierUse] = Field(None, description="usual|official|temp|secondary|old")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = Field(None, description="URI of the identifier namespace.")
    value: str = Field(..., description="Identifier value.")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = Field(None, description="Display name of the assigning organization.")


class OrganizationTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class OrganizationAliasInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    value: str = Field(..., description="Alternative name for this organization.")


class OrganizationTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: ContactPointSystem = Field(..., description="phone|fax|email|pager|url|sms|other")
    value: str = Field(..., description="Contact value (phone number, email address, etc.).")
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1, description="Preferred contact order (1 = most preferred).")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class OrganizationAddressInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[AddressUse] = Field(None, description="home|work|temp|old|billing")
    type: Optional[AddressType] = Field(None, description="postal|physical|both")
    text: Optional[str] = Field(None, description="Full address as plain text.")
    line: Optional[List[str]] = Field(None, description="Street address lines.")
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class OrganizationContactTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: ContactPointSystem = Field(..., description="phone|fax|email|pager|url|sms|other")
    value: str = Field(..., description="Contact value.")
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class OrganizationContactInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # purpose (0..1) CodeableConcept
    purpose_system: Optional[str] = None
    purpose_code: Optional[str] = None
    purpose_display: Optional[str] = None
    purpose_text: Optional[str] = None
    # name (0..1) HumanName
    name_use: Optional[HumanNameUse] = None
    name_text: Optional[str] = None
    name_family: Optional[str] = None
    name_given: Optional[List[str]] = None
    name_prefix: Optional[List[str]] = None
    name_suffix: Optional[List[str]] = None
    name_period_start: Optional[datetime] = None
    name_period_end: Optional[datetime] = None
    # address (0..1) Address
    address_use: Optional[AddressUse] = None
    address_type: Optional[AddressType] = None
    address_text: Optional[str] = None
    address_line: Optional[List[str]] = None
    address_city: Optional[str] = None
    address_district: Optional[str] = None
    address_state: Optional[str] = None
    address_postal_code: Optional[str] = None
    address_country: Optional[str] = None
    address_period_start: Optional[datetime] = None
    address_period_end: Optional[datetime] = None
    # telecom (0..*)
    telecom: Optional[List[OrganizationContactTelecomInput]] = None


class OrganizationEndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference: str = Field(..., description="FHIR reference string e.g. 'Endpoint/1'.")
    reference_display: Optional[str] = None


# ── Create / Patch schemas ─────────────────────────────────────────────────────


class OrganizationCreateSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")
    created_by: Optional[str] = None

    active: Optional[bool] = Field(None, description="Whether this organization record is active.")
    name: Optional[str] = Field(None, description="Name used for the organization.")
    # partOf (0..1) Reference(Organization)
    partof: Optional[str] = Field(None, description="FHIR reference to parent org e.g. 'Organization/190001'.")
    partof_display: Optional[str] = None

    identifier: Optional[List[OrganizationIdentifierInput]] = None
    type: Optional[List[OrganizationTypeInput]] = None
    alias: Optional[List[OrganizationAliasInput]] = None
    telecom: Optional[List[OrganizationTelecomInput]] = None
    address: Optional[List[OrganizationAddressInput]] = None
    contact: Optional[List[OrganizationContactInput]] = None
    endpoint: Optional[List[OrganizationEndpointInput]] = None

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-123",
                "org_id": "org-456",
                "active": True,
                "name": "General Hospital",
                "partof": "Organization/190001",
                "partof_display": "Parent Health System",
                "identifier": [
                    {"value": "12345", "system": "http://example.org/facility-ids", "use": "official"}
                ],
                "type": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/organization-type",
                        "coding_code": "prov",
                        "coding_display": "Healthcare Provider",
                    }
                ],
                "alias": [{"value": "Gen Hosp"}],
                "telecom": [{"system": "phone", "value": "555-1234", "use": "work"}],
                "address": [
                    {
                        "use": "work",
                        "type": "both",
                        "line": ["123 Main St"],
                        "city": "Anytown",
                        "state": "CA",
                        "postal_code": "12345",
                        "country": "US",
                    }
                ],
                "contact": [
                    {
                        "purpose_code": "ADMIN",
                        "purpose_system": "http://terminology.hl7.org/CodeSystem/contactentity-type",
                        "name_family": "Smith",
                        "name_given": ["John"],
                        "telecom": [{"system": "phone", "value": "555-0001"}],
                    }
                ],
                "endpoint": [],
            }
        },
    )


class OrganizationPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    name: Optional[str] = None
    partof_display: Optional[str] = None
    updated_by: Optional[str] = None
