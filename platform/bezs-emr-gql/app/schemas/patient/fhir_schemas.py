"""
FHIR R4 response shapes for the Patient resource.

These models are used ONLY for OpenAPI documentation — they describe the shape
of responses when the client sends `Accept: application/fhir+json`. They are
never used for runtime validation because route handlers return JSONResponse
directly and FastAPI bypasses response_model validation for JSONResponse returns.

All field names follow FHIR R4 camelCase conventions.

Reference: https://hl7.org/fhir/R4/patient.html
"""

from typing import List, Optional

from pydantic import BaseModel, Field


# ── FHIR sub-resource shapes ──────────────────────────────────────────────────


class FhirCoding(BaseModel):
    """FHIR R4 Coding — a code defined by a terminology system."""

    system: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None


class FhirCodeableConcept(BaseModel):
    """FHIR R4 CodeableConcept — a concept that may be defined by a formal reference to a terminology."""

    coding: Optional[List[FhirCoding]] = None
    text: Optional[str] = None


class FhirPeriod(BaseModel):
    """FHIR R4 Period — a time period defined by a start and end date/time."""

    start: Optional[str] = None
    end: Optional[str] = None


class FhirReference(BaseModel):
    """FHIR R4 Reference — a reference from one resource to another."""

    reference: Optional[str] = Field(None, description="Literal reference e.g. 'Organization/190001'.")
    display: Optional[str] = None


class FhirHumanName(BaseModel):
    """FHIR R4 HumanName — a human's name with the ability to identify parts and usage."""

    use: Optional[str] = None
    text: Optional[str] = None
    family: Optional[str] = None
    given: Optional[List[str]] = None
    prefix: Optional[List[str]] = None
    suffix: Optional[List[str]] = None
    period: Optional[FhirPeriod] = None


class FhirIdentifier(BaseModel):
    """FHIR R4 Identifier — a numeric or alphanumeric string that identifies a resource."""

    use: Optional[str] = None
    type: Optional[FhirCodeableConcept] = None
    system: Optional[str] = None
    value: Optional[str] = None
    period: Optional[FhirPeriod] = None
    assigner: Optional[FhirReference] = None


class FhirContactPoint(BaseModel):
    """FHIR R4 ContactPoint — details for all kinds of technology-mediated contact."""

    system: Optional[str] = None
    value: Optional[str] = None
    use: Optional[str] = None
    rank: Optional[int] = None
    period: Optional[FhirPeriod] = None


class FhirAddress(BaseModel):
    """FHIR R4 Address — an address expressed using postal conventions."""

    use: Optional[str] = None
    type: Optional[str] = None
    text: Optional[str] = None
    line: Optional[List[str]] = None
    city: Optional[str] = None
    district: Optional[str] = None
    state: Optional[str] = None
    postalCode: Optional[str] = None
    country: Optional[str] = None
    period: Optional[FhirPeriod] = None


class FhirAttachment(BaseModel):
    """FHIR R4 Attachment — content in a format defined elsewhere (e.g. a photo)."""

    contentType: Optional[str] = None
    language: Optional[str] = None
    data: Optional[str] = None
    url: Optional[str] = None
    size: Optional[int] = None
    hash: Optional[str] = None
    title: Optional[str] = None
    creation: Optional[str] = None


class FhirPatientContact(BaseModel):
    """FHIR R4 Patient.contact BackboneElement — a contact party for the patient."""

    relationship: Optional[List[FhirCodeableConcept]] = None
    name: Optional[FhirHumanName] = None
    telecom: Optional[List[FhirContactPoint]] = None
    address: Optional[FhirAddress] = None
    gender: Optional[str] = None
    organization: Optional[FhirReference] = None
    period: Optional[FhirPeriod] = None


class FhirPatientCommunication(BaseModel):
    """FHIR R4 Patient.communication BackboneElement — a language the patient can communicate in."""

    language: Optional[FhirCodeableConcept] = None
    preferred: Optional[bool] = None


class FhirPatientLink(BaseModel):
    """FHIR R4 Patient.link BackboneElement — a link to another patient resource that concerns the same patient."""

    other: Optional[FhirReference] = None
    type: Optional[str] = None


# ── Top-level FHIR Patient response ───────────────────────────────────────────


class FhirPatientResponse(BaseModel):
    """
    FHIR R4 Patient resource shape returned when the client sends Accept: application/fhir+json.

    Reference: https://hl7.org/fhir/R4/patient.html
    """

    resourceType: str = Field(default="Patient")
    id: str = Field(description="Logical FHIR resource ID (string form of the integer patient_id).")
    active: Optional[bool] = None
    name: Optional[List[FhirHumanName]] = None
    identifier: Optional[List[FhirIdentifier]] = None
    telecom: Optional[List[FhirContactPoint]] = None
    gender: Optional[str] = None
    birthDate: Optional[str] = None
    deceasedBoolean: Optional[bool] = None
    deceasedDateTime: Optional[str] = None
    address: Optional[List[FhirAddress]] = None
    maritalStatus: Optional[FhirCodeableConcept] = None
    multipleBirthBoolean: Optional[bool] = None
    multipleBirthInteger: Optional[int] = None
    photo: Optional[List[FhirAttachment]] = None
    contact: Optional[List[FhirPatientContact]] = None
    communication: Optional[List[FhirPatientCommunication]] = None
    generalPractitioner: Optional[List[FhirReference]] = None
    managingOrganization: Optional[FhirReference] = None
    link: Optional[List[FhirPatientLink]] = None


# ── FHIR Bundle (list response) ───────────────────────────────────────────────


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle — wraps one Patient resource."""

    # Typed to FhirPatientResponse so Swagger UI shows the full Patient schema
    # inside the Bundle entry rather than a generic object placeholder.
    resource: FhirPatientResponse = Field(description="The FHIR Patient resource contained in this entry.")


class FhirBundleResponse(BaseModel):
    """FHIR R4 Bundle searchset returned for paginated Patient list responses."""

    resourceType: str = Field(default="Bundle")
    type: str = Field(default="searchset")
    total: int
    entry: Optional[List[FhirBundleEntry]] = None
