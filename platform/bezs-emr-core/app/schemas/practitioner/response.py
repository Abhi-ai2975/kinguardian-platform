from typing import List, Optional
from pydantic import BaseModel, Field
from app.schemas.common.fhir import (
    FHIRAddress,
    FHIRBundle,
    FHIRBundleEntry,
    FHIRCodeableConcept,
    FHIRContactPoint,
    FHIRHumanName,
    FHIRIdentifier,
    FHIRPeriod,
    FHIRReference,
)


# ── FHIR (camelCase) sub-schemas ──────────────────────────────────────────────


class FHIRAttachment(BaseModel):
    contentType: Optional[str] = Field(None, description="MIME type (e.g. image/png).")
    language: Optional[str] = Field(None, description="BCP-47 language code.")
    data: Optional[str] = Field(None, description="Base64-encoded binary data.")
    url: Optional[str] = Field(None, description="URL where data can be accessed.")
    size: Optional[int] = Field(None, description="Bytes before base64 encoding.")
    hash: Optional[str] = Field(None, description="Base64-encoded SHA-1 hash.")
    title: Optional[str] = Field(None, description="Label or display title.")
    creation: Optional[str] = Field(None, description="ISO 8601 dateTime when created.")


class FHIRQualification(BaseModel):
    identifier: Optional[List[FHIRIdentifier]] = None
    code: Optional[FHIRCodeableConcept] = Field(None, description="Coded qualification type.")
    status: Optional[FHIRCodeableConcept] = Field(None, description="Status of the qualification (e.g. active, inactive, pending).")
    period: Optional[FHIRPeriod] = Field(None, description="Qualification validity period.")
    issuer: Optional[FHIRReference] = Field(None, description="Issuing organization reference.")


class FHIRCommunication(BaseModel):
    language: Optional[FHIRCodeableConcept] = Field(None, description="Language as CodeableConcept (BCP-47).")
    preferred: Optional[bool] = Field(None, description="True if this is the preferred communication language.")


class FHIRPractitionerSchema(BaseModel):
    resourceType: str = Field("Practitioner", description="Always 'Practitioner'.")
    id: str = Field(..., description="Public practitioner_id as a string.")
    active: Optional[bool] = Field(None, description="Whether this practitioner record is active.")
    gender: Optional[str] = Field(None, description="male | female | other | unknown")
    birthDate: Optional[str] = Field(None, description="ISO 8601 date string.")
    deceasedBoolean: Optional[bool] = None
    deceasedDateTime: Optional[str] = Field(None, description="ISO 8601 dateTime string.")
    identifier: Optional[List[FHIRIdentifier]] = Field(None, description="Business identifiers (NPI, license, DEA, etc.).")
    name: Optional[List[FHIRHumanName]] = Field(None, description="Name(s) associated with the practitioner.")
    telecom: Optional[List[FHIRContactPoint]] = Field(None, description="Contact details applying to all roles.")
    address: Optional[List[FHIRAddress]] = Field(None, description="Address(es) of the practitioner.")
    photo: Optional[List[FHIRAttachment]] = Field(None, description="Image(s) of the practitioner.")
    qualification: Optional[List[FHIRQualification]] = Field(None, description="Certifications, licenses, or training.")
    communication: Optional[List[FHIRCommunication]] = Field(None, description="Languages used in patient communication.")


class FHIRPractitionerBundleEntry(BaseModel):
    resource: FHIRPractitionerSchema


class FHIRPractitionerBundle(FHIRBundle):
    entry: Optional[List[FHIRPractitionerBundleEntry]] = None


# ── Plain (snake_case) sub-schemas ────────────────────────────────────────────


class PlainPractitionerName(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    use: Optional[str] = Field(None, description="usual | official | temp | nickname | anonymous | old | maiden")
    text: Optional[str] = Field(None, description="Full display name.")
    family: Optional[str] = Field(None, description="Family (last) name.")
    given: Optional[List[str]] = Field(None, description="Given (first/middle) names.")
    prefix: Optional[List[str]] = Field(None, description="Name prefixes (Mr., Dr., etc.).")
    suffix: Optional[List[str]] = Field(None, description="Name suffixes (Jr., MD, etc.).")
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string.")


class PlainPractitionerIdentifier(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    use: Optional[str] = Field(None, description="usual | official | temp | secondary | old")
    type_system: Optional[str] = Field(None, description="Coding system URI for identifier type.")
    type_code: Optional[str] = Field(None, description="Identifier type code (e.g. NPI, DEA).")
    type_display: Optional[str] = Field(None, description="Human-readable identifier type.")
    type_text: Optional[str] = Field(None, description="Plain-text description of identifier type.")
    system: Optional[str] = Field(None, description="Namespace URI for the identifier value.")
    value: Optional[str] = Field(None, description="The identifier value.")
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    assigner: Optional[str] = Field(None, description="Display name of the issuing organization.")


class PlainPractitionerTelecom(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    system: Optional[str] = Field(None, description="phone | fax | email | pager | url | sms | other")
    value: Optional[str] = None
    use: Optional[str] = Field(None, description="home | work | temp | old | mobile")
    rank: Optional[int] = None
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string.")


class PlainPractitionerAddress(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    use: Optional[str] = Field(None, description="home | work | temp | old | billing")
    type: Optional[str] = Field(None, description="postal | physical | both")
    text: Optional[str] = None
    line: Optional[List[str]] = Field(None, description="Street address lines.")
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string.")


class PlainPractitionerPhoto(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = Field(None, description="ISO 8601 datetime string.")


class PlainQualificationIdentifier(BaseModel):
    id: int = Field(..., description="Internal row ID.")
    org_id: Optional[str] = None
    use: Optional[str] = Field(None, description="usual | official | temp | secondary | old")
    type_system: Optional[str] = Field(None, description="Coding system URI for identifier type.")
    type_code: Optional[str] = Field(None, description="Identifier type code.")
    type_display: Optional[str] = Field(None, description="Human-readable identifier type.")
    type_text: Optional[str] = Field(None, description="Plain-text description of identifier type.")
    system: Optional[str] = Field(None, description="Namespace URI for the qualification identifier.")
    value: Optional[str] = Field(None, description="Qualification or license number.")
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    assigner: Optional[str] = Field(None, description="Display name of the issuing organization.")


class PlainQualification(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    identifier: Optional[List[PlainQualificationIdentifier]] = Field(
        None, description="Identifiers for this qualification (e.g. license numbers)."
    )
    code_system: Optional[str] = Field(None, description="Coding system URI for qualification type.")
    code_code: Optional[str] = Field(None, description="Coded qualification type.")
    code_display: Optional[str] = Field(None, description="Display for the qualification code.")
    code_text: Optional[str] = Field(None, description="Human-readable qualification type.")
    status_system: Optional[str] = Field(None, description="Coding system URI for qualification status.")
    status_code: Optional[str] = Field(None, description="Status code (e.g. active, inactive, pending).")
    status_display: Optional[str] = Field(None, description="Display for the status code.")
    status_text: Optional[str] = Field(None, description="Human-readable qualification status.")
    period_start: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    period_end: Optional[str] = Field(None, description="ISO 8601 datetime string — qualification expiry.")
    issuer_type: Optional[str] = Field(None, description="Reference type for issuer, always 'Organization'.")
    issuer_id: Optional[int] = Field(None, description="Public Organization ID that issued the qualification.")
    issuer_display: Optional[str] = Field(None, description="Display name of the issuing organization.")


class PlainPractitionerCommunication(BaseModel):
    id: int = Field(..., description="Internal row ID — use for PATCH/DELETE calls.")
    org_id: Optional[str] = None
    language_system: Optional[str] = Field(None, description="URI of the language code system.")
    language_code: Optional[str] = Field(None, description="ISO-639-1 language code (e.g. en, fr, de).")
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = Field(None, description="True if this is the preferred language.")


# ── Plain Practitioner response ───────────────────────────────────────────────


class PlainPractitionerResponse(BaseModel):
    id: int = Field(..., description="Public practitioner_id.")
    user_id: Optional[str] = None
    org_id: Optional[str] = None
    active: Optional[bool] = None
    gender: Optional[str] = Field(None, description="male | female | other | unknown")
    birth_date: Optional[str] = Field(None, description="ISO 8601 date string.")
    deceased_boolean: Optional[bool] = None
    deceased_datetime: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    name: Optional[List[PlainPractitionerName]] = None
    identifier: Optional[List[PlainPractitionerIdentifier]] = None
    telecom: Optional[List[PlainPractitionerTelecom]] = None
    address: Optional[List[PlainPractitionerAddress]] = None
    photo: Optional[List[PlainPractitionerPhoto]] = None
    qualification: Optional[List[PlainQualification]] = None
    communication: Optional[List[PlainPractitionerCommunication]] = None
    created_at: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    updated_at: Optional[str] = Field(None, description="ISO 8601 datetime string.")
    created_by: Optional[str] = None
    updated_by: Optional[str] = None


# ── Paginated response ────────────────────────────────────────────────────────


class PaginatedPractitionerResponse(BaseModel):
    total: int = Field(..., description="Total number of matching practitioners.")
    limit: int = Field(..., description="Page size requested.")
    offset: int = Field(..., description="Number of records skipped.")
    data: List[PlainPractitionerResponse] = Field(..., description="Array of plain-JSON Practitioner objects.")


# ── Sub-resource list responses ───────────────────────────────────────────────


class PractitionerNamesListResponse(BaseModel):
    data: List[PlainPractitionerName]
    total: int = Field(..., description="Total count of name entries.")


class PractitionerIdentifiersListResponse(BaseModel):
    data: List[PlainPractitionerIdentifier]
    total: int = Field(..., description="Total count of identifier entries.")


class PractitionerTelecomListResponse(BaseModel):
    data: List[PlainPractitionerTelecom]
    total: int = Field(..., description="Total count of contact point entries.")


class PractitionerAddressesListResponse(BaseModel):
    data: List[PlainPractitionerAddress]
    total: int = Field(..., description="Total count of address entries.")


class PractitionerPhotosListResponse(BaseModel):
    data: List[PlainPractitionerPhoto]
    total: int = Field(..., description="Total count of photo entries.")


class PractitionerQualificationsListResponse(BaseModel):
    data: List[PlainQualification]
    total: int = Field(..., description="Total count of qualification entries.")


class PractitionerCommunicationsListResponse(BaseModel):
    data: List[PlainPractitionerCommunication]
    total: int = Field(..., description="Total count of communication entries.")


# ── FHIR sub-resource list responses ──────────────────────────────────────────


class FHIRPractitionerNameListItem(FHIRHumanName):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerNamesListResponse(BaseModel):
    data: List[FHIRPractitionerNameListItem]
    total: int = Field(..., description="Total count of name entries.")


class FHIRPractitionerIdentifierListItem(FHIRIdentifier):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerIdentifiersListResponse(BaseModel):
    data: List[FHIRPractitionerIdentifierListItem]
    total: int = Field(..., description="Total count of identifier entries.")


class FHIRPractitionerTelecomListItem(FHIRContactPoint):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerTelecomListResponse(BaseModel):
    data: List[FHIRPractitionerTelecomListItem]
    total: int = Field(..., description="Total count of contact point entries.")


class FHIRPractitionerAddressListItem(FHIRAddress):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerAddressesListResponse(BaseModel):
    data: List[FHIRPractitionerAddressListItem]
    total: int = Field(..., description="Total count of address entries.")


class FHIRPractitionerPhotoListItem(FHIRAttachment):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerPhotosListResponse(BaseModel):
    data: List[FHIRPractitionerPhotoListItem]
    total: int = Field(..., description="Total count of photo entries.")


class FHIRPractitionerQualificationListItem(FHIRQualification):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerQualificationsListResponse(BaseModel):
    data: List[FHIRPractitionerQualificationListItem]
    total: int = Field(..., description="Total count of qualification entries.")


class FHIRPractitionerCommunicationListItem(FHIRCommunication):
    id: int = Field(..., description="Internal row ID — use for DELETE calls.")


class FHIRPractitionerCommunicationsListResponse(BaseModel):
    data: List[FHIRPractitionerCommunicationListItem]
    total: int = Field(..., description="Total count of communication entries.")
