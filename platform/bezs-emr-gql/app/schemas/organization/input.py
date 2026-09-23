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


# ── Sub-resource schemas (mirror FHIR server; all fields optional) ────────────


class OrgIdentifierInput(BaseModel):
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


class OrgTypeInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(
        None,
        description="Coding system URI e.g. 'http://terminology.hl7.org/CodeSystem/organization-type'.",
    )
    coding_code: Optional[str] = Field(
        None,
        description="Code e.g. 'prov' (Healthcare Provider), 'dept', 'team', 'govt', 'ins', 'pay', 'edu', 'reli', 'crs', 'cg', 'bus', 'other'.",
    )
    coding_display: Optional[str] = Field(None, description="Human-readable label for the code.")
    text: Optional[str] = Field(None, description="Plain-text representation of the type.")


class OrgAliasInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    value: str = Field(..., description="Alternative name for this organization.")


class OrgTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: ContactPointSystem = Field(..., description="phone|fax|email|pager|url|sms|other")
    value: str = Field(..., description="Contact value (phone number, email address, etc.).")
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1, description="Preferred contact order (1 = most preferred).")
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class OrgAddressInput(BaseModel):
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


class OrgContactTelecomInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    system: ContactPointSystem = Field(..., description="phone|fax|email|pager|url|sms|other")
    value: str = Field(..., description="Contact value.")
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class OrgContactInput(BaseModel):
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
    telecom: Optional[List[OrgContactTelecomInput]] = None


class OrgEndpointInput(BaseModel):
    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference string e.g. 'Endpoint/1'.")
    reference_display: Optional[str] = None


# ── Create / Patch / List schemas ─────────────────────────────────────────────


class RegisterOrgSchema(BaseModel):
    """
    Pulse use-case schema for creating an Organization.
    Enforces fields that FHIR leaves optional:
      - name    → required (every org must have an identifiable name)
      - type    → required (at least one entry — what kind of org is this?)
    All other FHIR Organization fields are accepted but optional.
    """

    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "name": "General Hospital",
                "type": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/organization-type",
                        "coding_code": "prov",
                        "coding_display": "Healthcare Provider",
                    }
                ],
                "active": True,
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
            }
        },
    )

    # ── Tenant scoping ─────────────────────────────────────────────────────────
    # Forwarded as-is to the fhir-server for multi-tenant record ownership.
    # If omitted, the fhir-server falls back to the actor's JWT claims.
    user_id: Optional[str] = Field(None, description="JWT sub of the record owner.")
    org_id: Optional[str] = Field(None, description="Active organization ID from JWT.")

    # ── REQUIRED by Pulse ──────────────────────────────────────────────────────
    name: str = Field(..., description="Name used for the organization.")
    type: List[OrgTypeInput] = Field(
        ...,
        min_length=1,
        description="Kind of organization (at least one entry required). Common codes: prov, dept, team, govt, ins, pay, edu, reli, crs, cg, bus, other.",
    )

    # ── Optional ───────────────────────────────────────────────────────────────
    active: Optional[bool] = Field(True, description="Whether this organization is active.")
    partof: Optional[str] = Field(
        None, description="FHIR reference to parent org e.g. 'Organization/190001'."
    )
    partof_display: Optional[str] = None

    identifier: Optional[List[OrgIdentifierInput]] = None
    alias: Optional[List[OrgAliasInput]] = None
    telecom: Optional[List[OrgTelecomInput]] = None
    address: Optional[List[OrgAddressInput]] = None
    contact: Optional[List[OrgContactInput]] = None
    endpoint: Optional[List[OrgEndpointInput]] = None


class PatchOrgSchema(BaseModel):
    """
    Patchable fields mirror what the FHIR server accepts on PATCH.
    Child arrays (identifier, type, alias, telecom, address, contact, endpoint)
    are not patchable — delete and re-create to correct those.
    """

    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    name: Optional[str] = None
    partof_display: Optional[str] = None


class ListOrgsSchema(BaseModel):
    """Query parameters for listing organizations."""

    name: Optional[str] = Field(None, description="Case-insensitive substring match on name.")
    active: Optional[bool] = Field(None, description="Filter by active status.")
    user_id: Optional[str] = Field(None, description="Filter by owning user (JWT subject).")
    org_id: Optional[str] = Field(None, description="Filter by tenant organization ID.")
    limit: int = Field(50, ge=1, le=200, description="Max results to return.")
    offset: int = Field(0, ge=0, description="Number of results to skip.")


class MeOrgsSchema(BaseModel):
    """
    Pagination parameters for the /me endpoint.

    Identity filters (user_id, org_id) are extracted from the JWT — the caller
    cannot override which user's organizations are returned.
    """

    active: Optional[bool] = Field(None, description="Filter by active status.")
    limit: int = Field(50, ge=1, le=200, description="Max results to return.")
    offset: int = Field(0, ge=0, description="Number of results to skip.")
