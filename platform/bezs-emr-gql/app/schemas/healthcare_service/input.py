"""
Input schemas for FHIR HealthcareService resource endpoints.

Three schemas cover the full API surface:
  - HealthcareServiceCreateSchema: validated body for POST /healthcare-services
  - HealthcareServicePatchSchema:  validated body for PATCH /healthcare-services/{id}
  - ListHealthcareServicesSchema:  validated query parameters for GET /healthcare-services

Design decisions:
  - user_id and org_id are Optional inputs supplied by the caller for tenant scoping.
    The fhir-server treats them as optional as well; omit them only if the fhir-server
    is configured to derive them from its own auth context.
  - created_by / updated_by are NOT exposed — FhirClient injects them automatically
    from actor.sub on every POST/PATCH.
  - Array sub-schemas (identifier, category, type, specialty, location, telecom,
    coverage_area, eligibility, available_time, not_available, endpoint, etc.) use
    nested Pydantic models with extra="forbid" to reject undocumented fields at the
    API boundary.
  - All field names mirror the fhir-server HealthcareServiceCreateSchema exactly so
    the payload can be forwarded without a translation layer.
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── Array sub-schemas ──────────────────────────────────────────────────────────


class HealthcareServiceIdentifierInput(BaseModel):
    """
    A business identifier for a HealthcareService (e.g. a facility service code).
    Maps to FHIR R4 Identifier: https://hl7.org/fhir/R4/datatypes.html#Identifier
    """

    model_config = ConfigDict(extra="forbid")

    use: Optional[str] = Field(
        default=None, description="Identifier use: usual | official | temp | secondary | old"
    )
    type_system: Optional[str] = Field(default=None, description="Coding system URI for the identifier type")
    type_code: Optional[str] = Field(default=None, description="Code from the identifier type coding system")
    type_display: Optional[str] = Field(default=None, description="Human-readable display for the identifier type")
    type_text: Optional[str] = Field(default=None, description="Plain-text description of the identifier type")
    system: Optional[str] = Field(default=None, description="URI defining the identifier namespace")
    value: str = Field(description="The identifier value within the system (required)")
    period_start: Optional[datetime] = Field(default=None, description="Start of validity period")
    period_end: Optional[datetime] = Field(default=None, description="End of validity period")
    assigner: Optional[str] = Field(default=None, description="Display name of the issuing organisation")


class HealthcareServiceCategoryInput(BaseModel):
    """
    A broad category grouping the HealthcareService (e.g. 'General Practice', 'Dental').
    Maps to FHIR R4 CodeableConcept used in HealthcareService.category.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the category")
    coding_code: Optional[str] = Field(default=None, description="Category code value")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the category code")
    text: Optional[str] = Field(default=None, description="Plain-text description of the category")


class HealthcareServiceTypeInput(BaseModel):
    """
    A specific type of service being delivered within the broad category.
    Maps to FHIR R4 CodeableConcept used in HealthcareService.type.
    Reference: https://hl7.org/fhir/R4/valueset-service-type.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the service type")
    coding_code: Optional[str] = Field(default=None, description="Service type code value")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the service type")
    text: Optional[str] = Field(default=None, description="Plain-text description of the service type")


class HealthcareServiceSpecialtyInput(BaseModel):
    """
    A clinical specialty associated with this HealthcareService (e.g. 'Cardiology').
    Maps to FHIR R4 CodeableConcept used in HealthcareService.specialty.
    Reference: https://hl7.org/fhir/R4/valueset-c80-practice-codes.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI (e.g. http://snomed.info/sct)")
    coding_code: Optional[str] = Field(default=None, description="Specialty code value (e.g. SNOMED CT concept)")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the specialty")
    text: Optional[str] = Field(default=None, description="Plain-text description of the specialty")


class HealthcareServiceLocationInput(BaseModel):
    """
    A Location where this HealthcareService is provided.
    Maps to a FHIR R4 Reference pointing to a Location resource.
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(description="FHIR relative reference (e.g. 'Location/1')")
    reference_display: Optional[str] = Field(default=None, description="Human-readable display for the location")


class HealthcareServiceTelecomInput(BaseModel):
    """
    A contact point for this HealthcareService (phone, email, fax, etc.).
    Maps to FHIR R4 ContactPoint: https://hl7.org/fhir/R4/datatypes.html#ContactPoint
    """

    model_config = ConfigDict(extra="forbid")

    system: Optional[str] = Field(
        default=None, description="Contact system: phone | fax | email | pager | url | sms | other"
    )
    value: Optional[str] = Field(default=None, description="The actual contact value")
    use: Optional[str] = Field(default=None, description="Contact use: home | work | temp | old | mobile")
    rank: Optional[int] = Field(default=None, description="Preferred order of use (lower = higher priority)")
    period_start: Optional[datetime] = Field(default=None, description="Start of validity period")
    period_end: Optional[datetime] = Field(default=None, description="End of validity period")


class HealthcareServiceCoverageAreaInput(BaseModel):
    """
    A Location defining the coverage area for this HealthcareService.
    Maps to a FHIR R4 Reference pointing to a Location resource.
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(description="FHIR relative reference (e.g. 'Location/1')")
    reference_display: Optional[str] = Field(default=None, description="Human-readable display for the coverage area")


class HealthcareServiceServiceProvisionCodeInput(BaseModel):
    """
    Conditions under which the service is available (e.g. free, discounted, private-pay).
    Maps to FHIR R4 CodeableConcept used in HealthcareService.serviceProvisionCode.
    Reference: https://hl7.org/fhir/R4/valueset-service-provision-conditions.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the provision code")
    coding_code: Optional[str] = Field(default=None, description="Provision code value (e.g. 'free', 'disc', 'cost')")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the provision code")
    text: Optional[str] = Field(default=None, description="Plain-text description of the provision conditions")


class HealthcareServiceEligibilityInput(BaseModel):
    """
    Eligibility criteria required to receive this HealthcareService.
    Maps to FHIR R4 HealthcareService.eligibility backbone element.
    """

    model_config = ConfigDict(extra="forbid")

    code_system: Optional[str] = Field(default=None, description="Coding system URI for the eligibility code")
    code_code: Optional[str] = Field(default=None, description="Eligibility code value")
    code_display: Optional[str] = Field(default=None, description="Human-readable display for the eligibility code")
    code_text: Optional[str] = Field(default=None, description="Plain-text description of eligibility criteria")
    comment: Optional[str] = Field(default=None, description="Additional eligibility details or requirements")


class HealthcareServiceProgramInput(BaseModel):
    """
    A health program this service is part of (e.g. 'HACC', 'DVA').
    Maps to FHIR R4 CodeableConcept used in HealthcareService.program.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the program")
    coding_code: Optional[str] = Field(default=None, description="Program code value")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the program")
    text: Optional[str] = Field(default=None, description="Plain-text description of the program")


class HealthcareServiceCharacteristicInput(BaseModel):
    """
    A characteristic of this HealthcareService (e.g. wheelchair accessible, interpreters available).
    Maps to FHIR R4 CodeableConcept used in HealthcareService.characteristic.
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the characteristic")
    coding_code: Optional[str] = Field(default=None, description="Characteristic code value")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the characteristic")
    text: Optional[str] = Field(default=None, description="Plain-text description of the characteristic")


class HealthcareServiceCommunicationInput(BaseModel):
    """
    A language in which this HealthcareService can communicate with patients.
    Maps to FHIR R4 CodeableConcept used in HealthcareService.communication.
    Reference: https://hl7.org/fhir/R4/valueset-languages.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI (e.g. urn:ietf:bcp:47)")
    coding_code: Optional[str] = Field(default=None, description="BCP-47 language code (e.g. 'en', 'fr', 'ar')")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the language")
    text: Optional[str] = Field(default=None, description="Plain-text language description")


class HealthcareServiceReferralMethodInput(BaseModel):
    """
    Ways that the service accepts referrals (e.g. phone, fax, letter, email).
    Maps to FHIR R4 CodeableConcept used in HealthcareService.referralMethod.
    Reference: https://hl7.org/fhir/R4/valueset-service-referral-method.html
    """

    model_config = ConfigDict(extra="forbid")

    coding_system: Optional[str] = Field(default=None, description="Coding system URI for the referral method")
    coding_code: Optional[str] = Field(default=None, description="Referral method code (e.g. 'phone', 'fax', 'elec')")
    coding_display: Optional[str] = Field(default=None, description="Human-readable display for the referral method")
    text: Optional[str] = Field(default=None, description="Plain-text description of the referral method")


class HealthcareServiceAvailableTimeInput(BaseModel):
    """
    A time slot during which this HealthcareService is available.
    Maps to FHIR R4 HealthcareService.availableTime backbone element.
    """

    model_config = ConfigDict(extra="forbid")

    days_of_week: Optional[List[str]] = Field(
        default=None,
        description="Days available: mon | tue | wed | thu | fri | sat | sun",
    )
    all_day: Optional[bool] = Field(
        default=None, description="True if the service is available all day on the listed days"
    )
    available_start_time: Optional[str] = Field(
        default=None, description="Opening time in HH:mm:ss format (e.g. '09:00:00')"
    )
    available_end_time: Optional[str] = Field(
        default=None, description="Closing time in HH:mm:ss format (e.g. '17:00:00')"
    )


class HealthcareServiceNotAvailableInput(BaseModel):
    """
    A period during which this HealthcareService is not available.
    Maps to FHIR R4 HealthcareService.notAvailable backbone element.
    """

    model_config = ConfigDict(extra="forbid")

    description: str = Field(description="Reason for unavailability (required, e.g. 'Public holiday')")
    during_start: Optional[datetime] = Field(default=None, description="Start of the unavailability period")
    during_end: Optional[datetime] = Field(default=None, description="End of the unavailability period")


class HealthcareServiceEndpointInput(BaseModel):
    """
    A technical endpoint providing access to this HealthcareService (e.g. for electronic referrals).
    Maps to a FHIR R4 Reference pointing to an Endpoint resource.
    """

    model_config = ConfigDict(extra="forbid")

    reference: str = Field(description="FHIR relative reference (e.g. 'Endpoint/1')")
    reference_display: Optional[str] = Field(default=None, description="Human-readable display for the endpoint")


# ── Top-level schemas ──────────────────────────────────────────────────────────


class HealthcareServiceCreateSchema(BaseModel):
    """
    Validated body for POST /healthcare-services.

    user_id and org_id are Optional inputs supplied by the caller for tenant scoping.
    created_by is excluded — FhirClient.post() injects it from actor.sub automatically.

    extra="forbid" rejects unknown fields at the API boundary so clients cannot
    accidentally or intentionally inject fields meant for internal use.
    """

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
            }
        },
    )

    # ── Tenant scoping ─────────────────────────────────────────────────────────
    # Supplied by the caller in the request body. The fhir-server uses these for
    # multi-tenant data isolation. created_by is NOT included — FhirClient injects it.
    user_id: Optional[str] = Field(default=None, description="User identifier for tenant scoping")
    org_id: Optional[str] = Field(default=None, description="Organisation identifier for tenant scoping")

    # ── Providing organisation ─────────────────────────────────────────────────
    provided_by: Optional[str] = Field(
        default=None, description="Reference to the Organisation providing this service (e.g. 'Organization/190001')"
    )
    provided_by_display: Optional[str] = Field(
        default=None, description="Human-readable display name of the providing organisation"
    )

    # ── Core fields ────────────────────────────────────────────────────────────
    active: Optional[bool] = Field(default=None, description="Whether this HealthcareService is currently active")
    name: Optional[str] = Field(default=None, description="Human-readable name of the service")
    comment: Optional[str] = Field(default=None, description="Additional description of the service")
    extra_details: Optional[str] = Field(
        default=None, description="Extra details about the service not captured in the other fields"
    )
    appointment_required: Optional[bool] = Field(
        default=None, description="Whether an appointment is required to access this service"
    )
    availability_exceptions: Optional[str] = Field(
        default=None, description="Description of exceptions to normal availability (e.g. public holidays)"
    )

    # ── Photo (FHIR Attachment, stored flat) ──────────────────────────────────
    # Stores a representative image of the service (e.g. clinic photo, logo).
    photo_content_type: Optional[str] = Field(default=None, description="MIME type of the photo (e.g. 'image/jpeg')")
    photo_language: Optional[str] = Field(default=None, description="BCP-47 language code of the photo content")
    photo_data: Optional[str] = Field(default=None, description="Base64-encoded photo data")
    photo_url: Optional[str] = Field(default=None, description="URL where the photo can be retrieved")
    photo_size: Optional[int] = Field(default=None, description="Size of the photo in bytes")
    photo_hash: Optional[str] = Field(default=None, description="Base64-encoded SHA-1 hash of the photo data")
    photo_title: Optional[str] = Field(default=None, description="Human-readable title for the photo")
    photo_creation: Optional[datetime] = Field(default=None, description="Date the photo was created")

    # ── Array sub-resources ────────────────────────────────────────────────────
    identifier: Optional[List[HealthcareServiceIdentifierInput]] = Field(
        default=None, description="Business identifiers for this HealthcareService"
    )
    category: Optional[List[HealthcareServiceCategoryInput]] = Field(
        default=None, description="Broad category(s) of service (e.g. 'General Practice')"
    )
    type: Optional[List[HealthcareServiceTypeInput]] = Field(
        default=None, description="Specific type(s) of service being delivered"
    )
    specialty: Optional[List[HealthcareServiceSpecialtyInput]] = Field(
        default=None, description="Clinical specialty(s) associated with the service"
    )
    location: Optional[List[HealthcareServiceLocationInput]] = Field(
        default=None, description="Location(s) where the service is provided"
    )
    telecom: Optional[List[HealthcareServiceTelecomInput]] = Field(
        default=None, description="Contact details for this service"
    )
    coverage_area: Optional[List[HealthcareServiceCoverageAreaInput]] = Field(
        default=None, description="Location(s) defining the coverage area"
    )
    service_provision_code: Optional[List[HealthcareServiceServiceProvisionCodeInput]] = Field(
        default=None, description="Conditions under which the service is available (cost, eligibility)"
    )
    eligibility: Optional[List[HealthcareServiceEligibilityInput]] = Field(
        default=None, description="Eligibility criteria required to receive the service"
    )
    program: Optional[List[HealthcareServiceProgramInput]] = Field(
        default=None, description="Health programs this service is part of"
    )
    characteristic: Optional[List[HealthcareServiceCharacteristicInput]] = Field(
        default=None, description="Characteristics of the service (e.g. accessibility features)"
    )
    communication: Optional[List[HealthcareServiceCommunicationInput]] = Field(
        default=None, description="Languages in which the service communicates with patients"
    )
    referral_method: Optional[List[HealthcareServiceReferralMethodInput]] = Field(
        default=None, description="Ways the service accepts referrals"
    )
    available_time: Optional[List[HealthcareServiceAvailableTimeInput]] = Field(
        default=None, description="Times during which the service is available"
    )
    not_available: Optional[List[HealthcareServiceNotAvailableInput]] = Field(
        default=None, description="Periods during which the service is not available"
    )
    endpoint: Optional[List[HealthcareServiceEndpointInput]] = Field(
        default=None, description="Technical endpoints providing electronic access to the service"
    )


class HealthcareServicePatchSchema(BaseModel):
    """
    Validated body for PATCH /healthcare-services/{id}.

    Only scalar fields are patchable. Array sub-resources (identifier, category,
    type, specialty, location, telecom, etc.) are not patchable — delete and
    re-create the HealthcareService to correct those.

    All fields are optional — at least one must be provided (enforced in the service
    layer). updated_by is not exposed — FhirClient.patch() injects it from actor.sub.
    """

    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = Field(default=None, description="Whether this service is currently active")
    name: Optional[str] = Field(default=None, description="Updated human-readable name")
    comment: Optional[str] = Field(default=None, description="Updated description")
    extra_details: Optional[str] = Field(default=None, description="Updated extra details")
    appointment_required: Optional[bool] = Field(
        default=None, description="Whether an appointment is required"
    )
    availability_exceptions: Optional[str] = Field(
        default=None, description="Updated availability exceptions description"
    )

    # Photo fields are patchable to allow logo/image updates without re-creating the resource.
    photo_content_type: Optional[str] = None
    photo_language: Optional[str] = None
    photo_data: Optional[str] = None
    photo_url: Optional[str] = None
    photo_size: Optional[int] = None
    photo_hash: Optional[str] = None
    photo_title: Optional[str] = None
    photo_creation: Optional[datetime] = None


class ListHealthcareServicesSchema(BaseModel):
    """
    Validated query parameters for GET /healthcare-services.

    All filters are optional. Unset filters (None) are stripped by
    HealthcareServiceClient.list() before the query string is built,
    so they are not sent to the fhir-server.
    """

    model_config = ConfigDict(extra="forbid")

    name: Optional[str] = Field(
        default=None, description="Case-insensitive name filter (substring match)"
    )
    active: Optional[bool] = Field(
        default=None, description="Filter by active status"
    )
    limit: int = Field(default=20, ge=1, le=200, description="Maximum number of records to return")
    offset: int = Field(default=0, ge=0, description="Number of records to skip for pagination")
