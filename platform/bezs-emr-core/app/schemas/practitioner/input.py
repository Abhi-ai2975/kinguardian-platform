from datetime import date, datetime
from typing import List, Optional
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import (
    AdministrativeGender,
    ContactPointSystem,
    ContactPointUse,
    AddressUse,
    AddressType,
    HumanNameUse,
    IdentifierUse,
)

# ── Sub-resource create schemas ────────────────────────────────────────────────


class PractitionerNameCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[HumanNameUse] = Field(None, description="usual|official|temp|nickname|anonymous|old|maiden")
    text: Optional[str] = Field(None, description="Full name as a display string.")
    family: Optional[str] = Field(None, description="Family (last) name.")
    given: Optional[List[str]] = Field(None, description="Given (first/middle) names.")
    prefix: Optional[List[str]] = Field(None, description="Name prefixes (Mr., Dr., etc.).")
    suffix: Optional[List[str]] = Field(None, description="Name suffixes (Jr., MD, etc.).")
    period_start: Optional[datetime] = Field(None, description="Start of period when this name was valid.")
    period_end: Optional[datetime] = Field(None, description="End of period when this name was valid.")


class PractitionerIdentifierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[IdentifierUse] = Field(None, description="usual|official|temp|secondary|old")
    type_system: Optional[str] = Field(None, description="Coding system for identifier type.")
    type_code: Optional[str] = Field(None, description="Code for identifier type (e.g. NPI, DEA, license).")
    type_display: Optional[str] = Field(None, description="Display for identifier type.")
    type_text: Optional[str] = Field(None, description="Plain-text description of identifier type.")
    system: Optional[str] = Field(None, description="URI of the identifier namespace (e.g. NPI system).")
    value: str = Field(..., description="Identifier value (e.g. NPI number, license number).")
    period_start: Optional[datetime] = Field(None, description="Start of identifier validity period.")
    period_end: Optional[datetime] = Field(None, description="End of identifier validity period.")
    assigner: Optional[str] = Field(None, description="Display name of the organization that issued the identifier.")


class PractitionerTelecomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: ContactPointSystem = Field(..., description="phone|fax|email|pager|url|sms|other")
    value: str = Field(..., description="Contact value (phone number, email address, etc.).")
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1, description="Preferred contact order (1 = most preferred).")
    period_start: Optional[datetime] = Field(None, description="Start of period when this contact was valid.")
    period_end: Optional[datetime] = Field(None, description="End of period when this contact was valid.")


class PractitionerAddressCreate(BaseModel):
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
    period_start: Optional[datetime] = Field(None, description="Start of period when this address was valid.")
    period_end: Optional[datetime] = Field(None, description="End of period when this address was valid.")


class PractitionerPhotoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = Field(None, description="MIME type (e.g. image/png).")
    language: Optional[str] = Field(None, description="BCP-47 language code.")
    data: Optional[str] = Field(None, description="Base64-encoded image data.")
    url: Optional[str] = Field(None, description="URL where the image can be retrieved.")
    size: Optional[int] = Field(None, description="Size in bytes before base64 encoding.")
    hash: Optional[str] = Field(None, description="Base64-encoded SHA-1 hash of the data.")
    title: Optional[str] = Field(None, description="Label or display title.")
    creation: Optional[datetime] = Field(None, description="When the image was created.")


class QualificationIdentifierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[IdentifierUse] = Field(None, description="usual|official|temp|secondary|old")
    type_system: Optional[str] = Field(None, description="Coding system for identifier type.")
    type_code: Optional[str] = Field(None, description="Code for identifier type.")
    type_display: Optional[str] = Field(None, description="Display for identifier type.")
    type_text: Optional[str] = Field(None, description="Plain-text description of identifier type.")
    system: Optional[str] = Field(None, description="Namespace URI for the qualification identifier.")
    value: str = Field(..., description="Qualification or license number.")
    period_start: Optional[datetime] = Field(None, description="Start of identifier validity period.")
    period_end: Optional[datetime] = Field(None, description="End of identifier validity period.")
    assigner: Optional[str] = Field(None, description="Display name of the issuing organization.")


class PractitionerQualificationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identifier: Optional[List[QualificationIdentifierCreate]] = Field(
        None, description="Identifiers for this qualification (e.g. license numbers)."
    )
    code_system: Optional[str] = Field(None, description="Coding system for the qualification type (e.g. http://snomed.info/sct).")
    code_code: Optional[str] = Field(None, description="Coded qualification type (e.g. '394814009').")
    code_display: Optional[str] = Field(None, description="Display for the qualification code.")
    code_text: Optional[str] = Field(None, description="Human-readable qualification type, e.g. 'MD - Doctor of Medicine'.")
    status_system: Optional[str] = Field(None, description="Coding system for qualification status.")
    status_code: Optional[str] = Field(None, description="Status code (e.g. active, inactive, pending).")
    status_display: Optional[str] = Field(None, description="Display for the status code.")
    status_text: Optional[str] = Field(None, description="Human-readable qualification status.")
    period_start: Optional[datetime] = Field(None, description="Start of qualification validity period.")
    period_end: Optional[datetime] = Field(None, description="End of qualification validity period (expiry).")
    issuer: Optional[str] = Field(None, description="FHIR reference to the issuing organization, e.g. 'Organization/100'.")
    issuer_display: Optional[str] = Field(None, description="Display name of the issuing organization.")


class PractitionerCommunicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language_system: Optional[str] = Field(None, description="URI of the language code system.")
    language_code: str = Field(..., description="ISO-639-1 language code (e.g. en, fr, de).")
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = Field(None, description="True if this is the practitioner's preferred language.")


# ── Sub-resource patch schemas ────────────────────────────────────────────────


class PractitionerNamePatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[HumanNameUse] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerIdentifierPatch(BaseModel):
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


class PractitionerTelecomPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[ContactPointSystem] = None
    value: Optional[str] = None
    use: Optional[ContactPointUse] = None
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class PractitionerAddressPatch(BaseModel):
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


class PractitionerPhotoPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[datetime] = None


class QualificationIdentifierPatch(BaseModel):
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


class PractitionerQualificationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    identifier: Optional[List[QualificationIdentifierPatch]] = None
    code_system: Optional[str] = None
    code_code: Optional[str] = None
    code_display: Optional[str] = None
    code_text: Optional[str] = None
    status_system: Optional[str] = None
    status_code: Optional[str] = None
    status_display: Optional[str] = None
    status_text: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    issuer: Optional[str] = Field(None, description="FHIR reference, e.g. 'Organization/100'.")
    issuer_display: Optional[str] = None


class PractitionerCommunicationPatch(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


# ── Practitioner create / patch ────────────────────────────────────────────────


class PractitionerCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "active": True,
                "gender": "female",
                "birth_date": "1978-03-15",
            }
        },
    )

    user_id: Optional[str] = None
    org_id: Optional[str] = None
    created_by: Optional[str] = None
    active: Optional[bool] = True
    gender: Optional[AdministrativeGender] = None
    birth_date: Optional[date] = None
    deceased_boolean: Optional[bool] = None
    deceased_datetime: Optional[datetime] = None


class PractitionerPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid")

    active: Optional[bool] = None
    gender: Optional[AdministrativeGender] = None
    birth_date: Optional[date] = None
    deceased_boolean: Optional[bool] = None
    deceased_datetime: Optional[datetime] = None
    updated_by: Optional[str] = None


class PractitionerFullCreateSchema(PractitionerCreateSchema):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "user_id": "user-uuid-123",
                "org_id": "org-uuid-456",
                "active": True,
                "gender": "female",
                "birth_date": "1978-03-15",
                "names": [{"use": "official", "family": "Smith", "given": ["Jane"]}],
                "identifiers": [{"value": "1234567890", "system": "http://hl7.org/fhir/sid/us-npi"}],
                "telecom": [{"system": "email", "value": "jane.smith@hospital.org", "use": "work"}],
                "qualifications": [{"code_code": "MD", "code_display": "Doctor of Medicine", "period_start": "2005-06-01"}],
                "communications": [{"language_code": "en", "preferred": True}],
            }
        },
    )
    names: Optional[List[PractitionerNameCreate]] = None
    identifiers: Optional[List[PractitionerIdentifierCreate]] = None
    telecom: Optional[List[PractitionerTelecomCreate]] = None
    addresses: Optional[List[PractitionerAddressCreate]] = None
    photos: Optional[List[PractitionerPhotoCreate]] = None
    qualifications: Optional[List[PractitionerQualificationCreate]] = None
    communications: Optional[List[PractitionerCommunicationCreate]] = None


class PractitionerFullPatchSchema(PractitionerPatchSchema):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "example": {
                "active": True,
                "gender": "female",
                "names": [{"use": "official", "family": "Smith", "given": ["Jane"]}],
                "telecom": [{"system": "email", "value": "jane.smith@hospital.org", "use": "work"}],
                "qualifications": [{"code_code": "MD", "code_display": "Doctor of Medicine"}],
                "communications": [{"language_code": "en", "preferred": True}],
            }
        },
    )
    names: Optional[List[PractitionerNameCreate]] = None
    identifiers: Optional[List[PractitionerIdentifierCreate]] = None
    telecom: Optional[List[PractitionerTelecomCreate]] = None
    addresses: Optional[List[PractitionerAddressCreate]] = None
    photos: Optional[List[PractitionerPhotoCreate]] = None
    qualifications: Optional[List[PractitionerQualificationCreate]] = None
    communications: Optional[List[PractitionerCommunicationCreate]] = None
