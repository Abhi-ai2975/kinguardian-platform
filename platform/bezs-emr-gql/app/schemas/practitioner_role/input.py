"""
Input schemas for the PractitionerRole resource endpoints.

Three schemas cover the write surfaces:
  - PractitionerRoleCreateSchema  — POST /practitioner-roles body
  - PractitionerRolePatchSchema   — PATCH /practitioner-roles/{id} body
  - ListPractitionerRolesSchema   — GET /practitioner-roles query parameters

Design notes:
  - Unlike Practitioner (which manages child arrays via sub-routes), PractitionerRole
    accepts all child arrays in the create body (identifier, code, specialty,
    location, healthcare_service, characteristic, communication, contact,
    availability, endpoint).
  - user_id / org_id are Optional to match the fhir-server's PractitionerRoleCreateSchema.
  - created_by / updated_by are NOT in any schema — FhirClient injects them from actor.sub.
  - The PATCH schema only accepts scalar fields — child arrays are not patchable.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


class PractitionerRoleIdentifierInput(BaseModel):
    """
    A business identifier for the PractitionerRole.
    Maps to the FHIR Identifier datatype.
    """

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(default=None, description="usual | official | temp | secondary | old")
    type_system: Optional[str] = Field(default=None, description="Coding system URI for the identifier type")
    type_code: Optional[str] = Field(default=None, description="Code for the identifier type")
    type_display: Optional[str] = Field(default=None, description="Display text for the identifier type")
    type_text: Optional[str] = Field(default=None, description="Plain-text description of the identifier type")
    system: Optional[str] = Field(default=None, description="Namespace URI for this identifier value")
    value: str = Field(..., description="The identifier value — required")
    period_start: Optional[datetime] = Field(default=None, description="Start of the identifier validity period")
    period_end: Optional[datetime] = Field(default=None, description="End of the identifier validity period")
    assigner: Optional[str] = Field(default=None, description="Organisation that issued the identifier")


class PractitionerRoleCodeInput(BaseModel):
    """
    Role code for the PractitionerRole (e.g. General Physician, Nurse).
    Maps to the FHIR CodeableConcept datatype.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI (e.g. http://snomed.info/sct)")
    coding_code: Optional[str] = Field(default=None, description="Code value (e.g. '59058001')")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the code")
    text: Optional[str] = Field(default=None, description="Plain-text description of the role")


class PractitionerRoleSpecialtyInput(BaseModel):
    """
    Clinical specialty for the PractitionerRole (e.g. General Practice, Cardiology).
    Maps to the FHIR CodeableConcept datatype.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI (e.g. http://snomed.info/sct)")
    coding_code: Optional[str] = Field(default=None, description="SNOMED CT or other specialty code")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the specialty")
    text: Optional[str] = Field(default=None, description="Plain-text description of the specialty")


class PractitionerRoleLocationInput(BaseModel):
    """
    Location where the PractitionerRole provides services.
    Stores a FHIR reference (e.g. 'Location/123').
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference to the Location, e.g. 'Location/123'")
    reference_display: Optional[str] = Field(default=None, description="Human-readable display for the location")


class PractitionerRoleHealthcareServiceInput(BaseModel):
    """
    HealthcareService that this PractitionerRole provides.
    Stores a FHIR reference (e.g. 'HealthcareService/150001').
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference to the HealthcareService, e.g. 'HealthcareService/150001'")
    reference_display: Optional[str] = Field(
        default=None,
        description="Human-readable display for the healthcare service",
    )


class PractitionerRoleCharacteristicInput(BaseModel):
    """
    A characteristic of the PractitionerRole (e.g. accepts walk-ins, teleconsult capable).
    Maps to the FHIR CodeableConcept datatype.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI")
    coding_code: Optional[str] = Field(default=None, description="Characteristic code")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display")
    text: Optional[str] = Field(default=None, description="Plain-text description of the characteristic")


class PractitionerRoleCommunicationInput(BaseModel):
    """
    Language that the practitioner can communicate in for this role.
    Maps to the FHIR CodeableConcept datatype (BCP-47 language codes).
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Language code system URI")
    coding_code: Optional[str] = Field(default=None, description="BCP-47 language code (e.g. en-US)")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the language")
    text: Optional[str] = Field(default=None, description="Plain-text description of the language")


class PractitionerRoleContactNameInput(BaseModel):
    """Name component within a PractitionerRole contact entry."""

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(default=None, description="usual | official | temp | nickname | anonymous | old | maiden")
    text: Optional[str] = Field(default=None, description="Full name as display string")
    family: Optional[str] = Field(default=None, description="Family (last) name")
    given: Optional[List[str]] = Field(default=None, description="Given (first/middle) names")
    prefix: Optional[List[str]] = Field(default=None, description="Name prefixes (Mr., Dr., etc.)")
    suffix: Optional[List[str]] = Field(default=None, description="Name suffixes (Jr., MD, etc.)")
    period_start: Optional[datetime] = Field(default=None, description="Start of period when this name was valid")
    period_end: Optional[datetime] = Field(default=None, description="End of period when this name was valid")


class PractitionerRoleContactTelecomInput(BaseModel):
    """Telecom contact point within a PractitionerRole contact entry."""

    model_config = ConfigDict(extra="forbid")

    system: Optional[str] = Field(default=None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = Field(default=None, description="Contact value (phone number, email address, etc.)")
    use: Optional[str] = Field(default=None, description="home | work | temp | old | mobile")
    rank: Optional[int] = Field(default=None, description="Preferred contact order (1 = most preferred)")
    period_start: Optional[datetime] = Field(default=None, description="Start of period when this contact was valid")
    period_end: Optional[datetime] = Field(default=None, description="End of period when this contact was valid")


class PractitionerRoleContactInput(BaseModel):
    """
    Contact for the PractitionerRole for a specific purpose (e.g. admin, billing).
    This is an R5-style extension adopted in this implementation. It flattens the
    purpose CodeableConcept, address, and organisation reference into flat columns.
    """

    model_config = ConfigDict(extra="forbid")

    # Purpose of this contact (CodeableConcept flat fields)
    purpose_system: Optional[str] = Field(default=None, description="Coding system URI for the contact purpose")
    purpose_code: Optional[str] = Field(default=None, description="Purpose code (e.g. ADMIN, BILL, PATINF)")
    purpose_display: Optional[str] = Field(default=None, description="Human-readable display for the purpose")
    purpose_text: Optional[str] = Field(default=None, description="Plain-text description of the purpose")

    # Address for this contact (flat columns)
    address_use: Optional[str] = Field(default=None, description="home | work | temp | old | billing")
    address_type: Optional[str] = Field(default=None, description="postal | physical | both")
    address_text: Optional[str] = Field(default=None, description="Full address as plain text")
    address_line: Optional[List[str]] = Field(default=None, description="Street address lines")
    address_city: Optional[str] = Field(default=None, description="City / town")
    address_district: Optional[str] = Field(default=None, description="District / county")
    address_state: Optional[str] = Field(default=None, description="State / province")
    address_postal_code: Optional[str] = Field(default=None, description="Postal code")
    address_country: Optional[str] = Field(default=None, description="Country (ISO 3166 preferred)")
    address_period_start: Optional[datetime] = Field(default=None, description="Start of address validity period")
    address_period_end: Optional[datetime] = Field(default=None, description="End of address validity period")

    # Organisation reference for this contact
    organization: Optional[str] = Field(
        default=None,
        description="FHIR reference to the contact organisation, e.g. 'Organization/190001'",
    )
    organization_display: Optional[str] = Field(default=None, description="Display name of the contact organisation")

    # Validity period for this contact entry
    period_start: Optional[datetime] = Field(default=None, description="Start of period when this contact is valid")
    period_end: Optional[datetime] = Field(default=None, description="End of period when this contact is valid")

    # Nested child contact details
    names: Optional[List[PractitionerRoleContactNameInput]] = Field(
        default=None,
        description="Name(s) for this contact entry",
    )
    telecoms: Optional[List[PractitionerRoleContactTelecomInput]] = Field(
        default=None,
        description="Telecom contact points for this contact entry",
    )


class PractitionerRoleAvailableTimeInput(BaseModel):
    """
    A time slot when the PractitionerRole is available.
    Maps to the availableTime backbone element within the availability group.
    """

    model_config = ConfigDict(extra="forbid")

    days_of_week: Optional[List[str]] = Field(
        default=None,
        description="Days of the week: mon | tue | wed | thu | fri | sat | sun",
    )
    all_day: Optional[bool] = Field(default=None, description="True if available all day on the listed days")
    available_start_time: Optional[str] = Field(default=None, description="Opening time in HH:mm:ss format")
    available_end_time: Optional[str] = Field(default=None, description="Closing time in HH:mm:ss format")


class PractitionerRoleNotAvailableTimeInput(BaseModel):
    """
    A period when the PractitionerRole is not available (e.g. annual leave).
    Maps to the notAvailableTime backbone element within the availability group.
    """

    model_config = ConfigDict(extra="forbid")

    description: Optional[str] = Field(default=None, description="Reason for unavailability (e.g. 'Annual leave')")
    during_start: Optional[datetime] = Field(default=None, description="Start of the unavailability period")
    during_end: Optional[datetime] = Field(default=None, description="End of the unavailability period")


class PractitionerRoleAvailabilityInput(BaseModel):
    """
    An availability group containing available and not-available time slots.
    The fhir-server groups availableTime and notAvailableTime under a single
    availability record for this implementation.
    """

    model_config = ConfigDict(extra="forbid")

    available_times: Optional[List[PractitionerRoleAvailableTimeInput]] = Field(
        default=None,
        description="Times when the practitioner is available in this role",
    )
    not_available_times: Optional[List[PractitionerRoleNotAvailableTimeInput]] = Field(
        default=None,
        description="Times when the practitioner is NOT available (e.g. leave, bank holidays)",
    )


class PractitionerRoleEndpointInput(BaseModel):
    """
    Technical endpoint providing electronic access for the PractitionerRole.
    Stores a FHIR reference (e.g. 'Endpoint/123').
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(..., description="FHIR reference to the Endpoint, e.g. 'Endpoint/123'")
    reference_display: Optional[str] = Field(default=None, description="Human-readable display for the endpoint")


class PractitionerRoleCreateSchema(BaseModel):
    """
    Input schema for creating a PractitionerRole resource (POST /practitioner-roles).

    Unlike Practitioner (where child arrays are added via separate sub-routes),
    PractitionerRole accepts all child arrays in the create body.

    Tenant scoping (user_id, org_id) is Optional to match the fhir-server schema.
    created_by is NOT included — FhirClient injects it automatically from actor.sub.
    """

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

    # Tenant scoping — Optional to match fhir-server schema
    user_id: Optional[str] = Field(default=None, description="User identifier for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Organisation identifier for tenant scoping")

    # Practitioner reference (FHIR reference string, e.g. "Practitioner/30001")
    practitioner: Optional[str] = Field(
        default=None,
        description="Reference to the Practitioner this role applies to, e.g. 'Practitioner/30001'",
    )
    practitioner_display: Optional[str] = Field(
        default=None,
        description="Human-readable display text for the practitioner reference",
    )

    # Organisation where this role is performed
    organization: Optional[str] = Field(
        default=None,
        description="Reference to the Organisation, e.g. 'Organization/190001'",
    )
    organization_display: Optional[str] = Field(
        default=None,
        description="Human-readable display text for the organisation reference",
    )

    # Whether this role is currently active
    active: Optional[bool] = Field(default=None, description="Whether this PractitionerRole is currently active")

    # Validity period for this role
    period_start: Optional[datetime] = Field(
        default=None,
        description="ISO 8601 datetime when the practitioner started this role",
    )
    period_end: Optional[datetime] = Field(
        default=None,
        description="ISO 8601 datetime when the practitioner's role ends (None = ongoing)",
    )

    # Free-text description of availability exceptions (e.g. public holidays)
    availability_exceptions: Optional[str] = Field(
        default=None,
        description="Description of availability exceptions not captured in availability schedules",
    )

    # Child arrays — all optional at creation
    identifier: Optional[List[PractitionerRoleIdentifierInput]] = Field(
        default=None,
        description="Business identifiers for this PractitionerRole",
    )
    code: Optional[List[PractitionerRoleCodeInput]] = Field(
        default=None,
        description="Roles which this practitioner is authorised to perform",
    )
    specialty: Optional[List[PractitionerRoleSpecialtyInput]] = Field(
        default=None,
        description="Clinical specialties associated with the role",
    )
    location: Optional[List[PractitionerRoleLocationInput]] = Field(
        default=None,
        description="Location(s) where the practitioner provides this role",
    )
    healthcare_service: Optional[List[PractitionerRoleHealthcareServiceInput]] = Field(
        default=None,
        description="HealthcareService(s) that the practitioner provides in this role",
    )
    characteristic: Optional[List[PractitionerRoleCharacteristicInput]] = Field(
        default=None,
        description="Collection of characteristics (attributes) for this role",
    )
    communication: Optional[List[PractitionerRoleCommunicationInput]] = Field(
        default=None,
        description="Languages the practitioner can use for patient communication in this role",
    )
    contact: Optional[List[PractitionerRoleContactInput]] = Field(
        default=None,
        description="Contact details for this specific role",
    )
    availability: Optional[List[PractitionerRoleAvailabilityInput]] = Field(
        default=None,
        description="Availability schedule for this role (available and not-available times)",
    )
    endpoint: Optional[List[PractitionerRoleEndpointInput]] = Field(
        default=None,
        description="Technical endpoints providing electronic access for this role",
    )


class PractitionerRolePatchSchema(BaseModel):
    """
    Input schema for partially updating a PractitionerRole (PATCH /practitioner-roles/{id}).

    Only scalar fields are patchable — child arrays cannot be changed via PATCH.
    updated_by is NOT included — FhirClient injects it automatically from actor.sub.
    """

    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = Field(default=None, description="Update the active status")
    period_start: Optional[datetime] = Field(default=None, description="Update the role start date/time")
    period_end: Optional[datetime] = Field(default=None, description="Update the role end date/time")
    availability_exceptions: Optional[str] = Field(
        default=None,
        description="Update the free-text availability exceptions description",
    )


class ListPractitionerRolesSchema(BaseModel):
    """
    Query parameters for listing PractitionerRoles (GET /practitioner-roles).

    Supports filtering by active status, practitioner, and tenant scoping.
    """

    # Active status filter
    active: Optional[bool] = Field(default=None, description="Filter by active status")

    # Practitioner filter — returns only roles for this practitioner
    practitioner_id: Optional[int] = Field(
        default=None,
        description="Filter by the integer practitioner_id to return only roles for a specific Practitioner",
    )

    # Tenant scoping filters
    user_id: Optional[str] = Field(default=None, description="Filter by user_id for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Filter by org_id for tenant scoping")

    # Pagination
    limit: int = Field(default=20, ge=1, le=200, description="Maximum number of records to return per page")
    offset: int = Field(default=0, ge=0, description="Number of records to skip before returning results")
