"""
Patient-specific enumeration types.

These enums are scoped to the FHIR R4 Patient resource and its sub-resources.
Shared code sets (gender, address use/type, contact point, name use, identifier use)
live in app.schemas.enums and are imported from there.

Reference: https://hl7.org/fhir/R4/patient.html
"""

from enum import Enum


class GeneralPractitionerReferenceType(str, Enum):
    """
    Allowed reference types for Patient.generalPractitioner.

    FHIR R4 constrains generalPractitioner references to these three resource types only.
    Reference: https://hl7.org/fhir/R4/patient.html#Patient.generalPractitioner
    """

    Organization = "Organization"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class PatientLinkOtherType(str, Enum):
    """
    Allowed reference types for Patient.link.other.

    The linked resource must be either another Patient or a RelatedPerson.
    Reference: https://hl7.org/fhir/R4/patient.html#Patient.link.other
    """

    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class PatientLinkType(str, Enum):
    """
    FHIR Patient.link.type — describes the relationship between two linked patient records.

    Values defined by https://hl7.org/fhir/R4/valueset-link-type.html:
      replaced-by — this patient record has been superseded by the linked record.
      replaces    — this patient record supersedes the linked record.
      refer       — this record and the linked record refer to the same person.
      seealso     — there may be some overlap between the linked records (not confirmed same person).
    """

    replaced_by = "replaced-by"
    replaces = "replaces"
    refer = "refer"
    seealso = "seealso"
