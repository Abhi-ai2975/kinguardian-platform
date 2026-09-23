from enum import Enum


class QuestionnaireResponseStatus(str, Enum):
    in_progress = "in-progress"
    completed = "completed"
    amended = "amended"
    entered_in_error = "entered-in-error"
    stopped = "stopped"


class QuestionnaireResponseAuthorReferenceType(str, Enum):
    Device = "Device"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"
    Organization = "Organization"


class QuestionnaireResponseSourceReferenceType(str, Enum):
    """R4 allowed types for QuestionnaireResponse.source."""
    Patient = "Patient"
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"


class QRBasedOnReferenceType(str, Enum):
    CarePlan = "CarePlan"
    ServiceRequest = "ServiceRequest"


class QRPartOfReferenceType(str, Enum):
    Observation = "Observation"
    Procedure = "Procedure"
