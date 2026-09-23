from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.models.patient.enums import (
    PatientGender,
    PatientGeneralPractitionerType,
    PatientLinkOtherType,
    PatientLinkType,
)
from app.schemas.enums import (
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)


# ── Sub-resource create schemas ────────────────────────────────────────────────


class NameCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[HumanNameUse] = Field(None, description="usual|official|temp|nickname|anonymous|old|maiden")
    text: Optional[str] = Field(None, description="Full name as a display string.")
    family: Optional[str] = Field(None, description="Family (last) name.")
    given: Optional[List[str]] = Field(None, description="Given (first/middle) names.")
    prefix: Optional[List[str]] = Field(None, description="Name prefixes (Mr., Dr., etc.).")
    suffix: Optional[List[str]] = Field(None, description="Name suffixes (Jr., MD, etc.).")
    period_start: Optional[datetime] = Field(None, description="Start of period when this name was valid.")
    period_end: Optional[datetime] = Field(None, description="End of period when this name was valid.")


class IdentifierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[IdentifierUse] = Field(None, description="usual|official|temp|secondary|old")
    type_system: Optional[str] = Field(None, description="Coding system for identifier type.")
    type_code: Optional[str] = Field(None, description="Code for identifier type (e.g. MR, SS).")
    type_display: Optional[str] = Field(None, description="Display for identifier type.")
    type_text: Optional[str] = Field(None, description="Text of the CodeableConcept for identifier type.")
    system: Optional[str] = Field(None, description="URI namespace of the identifier.")
    value: str = Field(..., description="Identifier value within the given system.")
    period_start: Optional[datetime] = Field(None, description="Start of identifier validity period.")
    period_end: Optional[datetime] = Field(None, description="End of identifier validity period.")
    assigner: Optional[str] = Field(None, description="Display name of the issuing organization.")


class TelecomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: ContactPointSystem = Field(..., description="phone|fax|email|pager|url|sms|other")
    value: str = Field(..., description="Contact point details (phone number, email address, etc.).")
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1, description="Preferred order — lower number = higher preference.")
    period_start: Optional[datetime] = Field(None, description="Start of period when this contact was valid.")
    period_end: Optional[datetime] = Field(None, description="End of period when this contact was valid.")


class AddressCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[AddressUse] = Field(None, description="home|work|temp|old|billing")
    type: Optional[AddressType] = Field(None, description="postal|physical|both")
    text: Optional[str] = Field(None, description="Full address as a display string.")
    line: Optional[List[str]] = Field(None, description="Street address lines.")
    city: Optional[str] = None
    district: Optional[str] = Field(None, description="County or administrative district.")
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[datetime] = Field(None, description="Start of period when this address was valid.")
    period_end: Optional[datetime] = Field(None, description="End of period when this address was valid.")


class PhotoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = Field(None, description="MIME type (e.g. image/png).")
    language: Optional[str] = Field(None, description="BCP-47 language code.")
    data: Optional[str] = Field(None, description="Base64-encoded image data.")
    url: Optional[str] = Field(None, description="URL where the image can be retrieved.")
    size: Optional[int] = Field(None, description="Size in bytes before base64 encoding.")
    hash: Optional[str] = Field(None, description="Base64-encoded SHA-1 hash of the data.")
    title: Optional[str] = Field(None, description="Label or display title.")
    creation: Optional[datetime] = Field(None, description="When the image was created.")


class ContactRelationshipCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class ContactTelecomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[ContactPointSystem] = Field(None, description="phone|fax|email|pager|url|sms|other")
    value: Optional[str] = None
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class ContactCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    # relationship (0..*) CodeableConcept → grandchild table
    relationship: Optional[List[ContactRelationshipCreate]] = None
    # name (0..1 HumanName) — flattened
    name_use: Optional[HumanNameUse] = None
    name_text: Optional[str] = None
    name_family: Optional[str] = None
    name_given: Optional[List[str]] = None
    name_prefix: Optional[List[str]] = None
    name_suffix: Optional[List[str]] = None
    # telecom (0..*) ContactPoint → grandchild table
    telecom: Optional[List[ContactTelecomCreate]] = None
    # address (0..1 Address) — flattened
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
    # other scalar fields
    gender: Optional[PatientGender] = Field(None, description="male|female|other|unknown")
    organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")
    organization_display: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class CommunicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language_system: Optional[str] = Field(None, description="URI of the language code system.")
    language_code: str = Field(..., description="ISO-639-1 language code (e.g. en, fr, de).")
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = Field(None, description="True if this is the patient's preferred language.")


class GeneralPractitionerCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: PatientGeneralPractitionerType = Field(
        ..., description="Organization|Practitioner|PractitionerRole"
    )
    reference_id: int = Field(..., description="Public ID of the referenced resource.")
    reference_display: Optional[str] = None


class LinkCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    other_type: PatientLinkOtherType = Field(..., description="Patient|RelatedPerson")
    other_id: int = Field(..., description="Public ID of the linked resource.")
    other_display: Optional[str] = None
    type: PatientLinkType = Field(..., description="replaced-by|replaces|refer|seealso")


# ── Sub-resource patch schemas ────────────────────────────────────────────────


class NamePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[HumanNameUse] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class IdentifierPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[IdentifierUse] = None
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class TelecomPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[ContactPointSystem] = None
    value: Optional[str] = None
    use: Optional[ContactPointUse] = None
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class AddressPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[AddressUse] = None
    type: Optional[AddressType] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PhotoPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[datetime] = None


class ContactPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    relationship: Optional[List[ContactRelationshipCreate]] = None
    name_use: Optional[HumanNameUse] = None
    name_text: Optional[str] = None
    name_family: Optional[str] = None
    name_given: Optional[List[str]] = None
    name_prefix: Optional[List[str]] = None
    name_suffix: Optional[List[str]] = None
    telecom: Optional[List[ContactTelecomCreate]] = None
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
    gender: Optional[PatientGender] = None
    organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")
    organization_display: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class CommunicationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


class GeneralPractitionerPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    reference_type: Optional[PatientGeneralPractitionerType] = None
    reference_id: Optional[int] = None
    reference_display: Optional[str] = None


class LinkPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    other_type: Optional[PatientLinkOtherType] = None
    other_id: Optional[int] = None
    other_display: Optional[str] = None
    type: Optional[PatientLinkType] = None


# ── Patient create / patch ─────────────────────────────────────────────────────


class PatientCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "active": True,
                "gender": "male",
                "birth_date": "1985-04-12",
                "deceased_boolean": False,
                "marital_status_code": "M",
                "marital_status_system": "http://terminology.hl7.org/CodeSystem/v3-MaritalStatus",
                "marital_status_display": "Married",
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None
    active: Optional[bool] = True
    gender: Optional[PatientGender] = None
    birth_date: Optional[date] = None
    deceased_boolean: Optional[bool] = None
    deceased_datetime: Optional[datetime] = None
    marital_status_system: Optional[str] = None
    marital_status_code: Optional[str] = None
    marital_status_display: Optional[str] = None
    marital_status_text: Optional[str] = None
    multiple_birth_boolean: Optional[bool] = None
    multiple_birth_integer: Optional[int] = None
    managing_organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")
    managing_organization_display: Optional[str] = None


class PatientPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    gender: Optional[PatientGender] = None
    birth_date: Optional[date] = None
    deceased_boolean: Optional[bool] = None
    deceased_datetime: Optional[datetime] = None
    marital_status_system: Optional[str] = None
    marital_status_code: Optional[str] = None
    marital_status_display: Optional[str] = None
    marital_status_text: Optional[str] = None
    multiple_birth_boolean: Optional[bool] = None
    multiple_birth_integer: Optional[int] = None
    managing_organization: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")
    managing_organization_display: Optional[str] = None
    updated_by: Optional[str] = None


class PatientFullCreateSchema(PatientCreateSchema):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "active": True,
                "gender": "male",
                "birth_date": "1985-04-12",
                "names": [{"use": "official", "family": "Doe", "given": ["John"]}],
                "identifiers": [{"value": "MRN-123456", "system": "http://hospital.com/mrn"}],
                "telecom": [{"system": "phone", "value": "+1-555-123-4567", "use": "mobile"}],
                "addresses": [{"use": "home", "city": "New York", "state": "NY", "country": "USA"}],
                "communications": [{"language_code": "en", "preferred": True}],
            }
        },
    )
    names: Optional[List[NameCreate]] = None
    identifiers: Optional[List[IdentifierCreate]] = None
    telecom: Optional[List[TelecomCreate]] = None
    addresses: Optional[List[AddressCreate]] = None
    photos: Optional[List[PhotoCreate]] = None
    contacts: Optional[List[ContactCreate]] = None
    communications: Optional[List[CommunicationCreate]] = None
    general_practitioners: Optional[List[GeneralPractitionerCreate]] = None
    links: Optional[List[LinkCreate]] = None


class PatientFullPatchSchema(PatientPatchSchema):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "active": True,
                "gender": "male",
                "names": [{"use": "official", "family": "Doe", "given": ["John"]}],
                "telecom": [{"system": "phone", "value": "+1-555-999-0000", "use": "mobile"}],
                "communications": [{"language_code": "en", "preferred": True}],
            }
        },
    )
    names: Optional[List[NameCreate]] = None
    identifiers: Optional[List[IdentifierCreate]] = None
    telecom: Optional[List[TelecomCreate]] = None
    addresses: Optional[List[AddressCreate]] = None
    photos: Optional[List[PhotoCreate]] = None
    contacts: Optional[List[ContactCreate]] = None
    communications: Optional[List[CommunicationCreate]] = None
    general_practitioners: Optional[List[GeneralPractitionerCreate]] = None
    links: Optional[List[LinkCreate]] = None
