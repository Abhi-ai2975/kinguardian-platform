from datetime import date, datetime
from typing import List, Optional

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.enums import (
    AdministrativeGender,
    AddressType,
    AddressUse,
    ContactPointSystem,
    ContactPointUse,
    HumanNameUse,
    IdentifierUse,
)


class RelatedPersonIdentifierCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[IdentifierUse] = Field(None, description="usual|official|temp|secondary|old")
    type_system: Optional[str] = None
    type_code: Optional[str] = None
    type_display: Optional[str] = None
    type_text: Optional[str] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    assigner: Optional[str] = None


class RelatedPersonRelationshipCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    coding_system: Optional[str] = None
    coding_code: Optional[str] = None
    coding_display: Optional[str] = None
    text: Optional[str] = None


class RelatedPersonNameCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[HumanNameUse] = Field(None, description="usual|official|temp|nickname|anonymous|old|maiden")
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class RelatedPersonTelecomCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    system: Optional[ContactPointSystem] = Field(None, description="phone|fax|email|pager|url|sms|other")
    value: Optional[str] = None
    use: Optional[ContactPointUse] = Field(None, description="home|work|temp|old|mobile")
    rank: Optional[int] = Field(None, ge=1)
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class RelatedPersonAddressCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    use: Optional[AddressUse] = Field(None, description="home|work|temp|old|billing")
    type: Optional[AddressType] = Field(None, description="postal|physical|both")
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postal_code: Optional[str] = None
    country: Optional[str] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None


class RelatedPersonPhotoCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    content_type: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[datetime] = None


class RelatedPersonCommunicationCreate(BaseModel):
    model_config = ConfigDict(extra="forbid")
    language_system: Optional[str] = None
    language_code: Optional[str] = None
    language_display: Optional[str] = None
    language_text: Optional[str] = None
    preferred: Optional[bool] = None


# ── Main create/patch schemas ──────────────────────────────────────────────────


class RelatedPersonCreateSchema(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        populate_by_name=True,
        json_schema_extra={
            "example": {
                "user_id": "u-001",
                "org_id": "org-001",
                "active": True,
                "patient": "Patient/10001",
                "patient_display": "John Doe",
                "gender": "male",
                "birth_date": "1980-05-15",
                "period_start": "2024-01-01T00:00:00Z",
                "period_end": "2025-01-01T00:00:00Z",
                "relationships": [
                    {
                        "coding_system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
                        "coding_code": "MTH",
                        "coding_display": "mother",
                    }
                ],
                "names": [
                    {
                        "use": "official",
                        "family": "Smith",
                        "given": ["Jane"],
                        "prefix": ["Mrs."],
                    }
                ],
                "telecoms": [
                    {"system": "phone", "value": "+1-555-1234", "use": "home"}
                ],
                "addresses": [
                    {
                        "use": "home",
                        "line": ["123 Main St"],
                        "city": "Springfield",
                        "state": "IL",
                        "postal_code": "62701",
                        "country": "US",
                    }
                ],
                "identifiers": [
                    {"system": "http://hospital.org/mrn", "value": "MRN-67890"}
                ],
                "communications": [
                    {"language_code": "en", "language_display": "English", "preferred": True}
                ],
            }
        },
    )

    user_id: Optional[str] = Field(None, description="JWT sub (tenant user).")
    org_id: Optional[str] = Field(None, description="JWT activeOrganizationId (tenant org).")
    created_by: Optional[str] = None
    active: Optional[bool] = None
    patient: Optional[str] = Field(
        None,
        description="Reference to the patient, e.g. 'Patient/10001'.",
    )
    patient_display: Optional[str] = None
    relationships: Optional[List[RelatedPersonRelationshipCreate]] = Field(
        None, description="Relationship roles (CodeableConcept, 0..*)."
    )
    names: Optional[List[RelatedPersonNameCreate]] = Field(None, description="Human names.")
    telecoms: Optional[List[RelatedPersonTelecomCreate]] = Field(None, description="Contact points.")
    gender: Optional[AdministrativeGender] = Field(None, description="male|female|other|unknown")
    birth_date: Optional[date] = None
    addresses: Optional[List[RelatedPersonAddressCreate]] = Field(None, description="Addresses.")
    photos: Optional[List[RelatedPersonPhotoCreate]] = Field(None, description="Image attachments.")
    period_start: Optional[datetime] = Field(None, description="Start of relationship period.")
    period_end: Optional[datetime] = Field(None, description="End of relationship period.")
    identifiers: Optional[List[RelatedPersonIdentifierCreate]] = Field(None, description="Business identifiers.")
    communications: Optional[List[RelatedPersonCommunicationCreate]] = Field(
        None, description="Languages the related person can communicate in."
    )


class RelatedPersonPatchSchema(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)

    active: Optional[bool] = None
    patient: Optional[str] = None
    patient_display: Optional[str] = None
    gender: Optional[AdministrativeGender] = None
    birth_date: Optional[date] = None
    period_start: Optional[datetime] = None
    period_end: Optional[datetime] = None
    relationships: Optional[List[RelatedPersonRelationshipCreate]] = None
    names: Optional[List[RelatedPersonNameCreate]] = None
    telecoms: Optional[List[RelatedPersonTelecomCreate]] = None
    addresses: Optional[List[RelatedPersonAddressCreate]] = None
    photos: Optional[List[RelatedPersonPhotoCreate]] = None
    identifiers: Optional[List[RelatedPersonIdentifierCreate]] = None
    communications: Optional[List[RelatedPersonCommunicationCreate]] = None
    updated_by: Optional[str] = None
