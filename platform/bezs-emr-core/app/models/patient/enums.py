from enum import Enum


class PatientGender(str, Enum):
    """FHIR R4 administrative gender (used by Patient.gender and Patient.contact.gender)."""

    male = "male"
    female = "female"
    other = "other"
    unknown = "unknown"


class PatientLinkType(str, Enum):
    """FHIR R4 link type codes for Patient.link.type."""

    replaced_by = "replaced-by"
    replaces = "replaces"
    refer = "refer"
    seealso = "seealso"


class PatientGeneralPractitionerType(str, Enum):
    """Allowed reference types for Patient.generalPractitioner."""

    Organization = "Organization"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class PatientLinkOtherType(str, Enum):
    """Allowed reference types for Patient.link.other."""

    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
