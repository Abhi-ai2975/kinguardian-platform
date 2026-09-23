from enum import Enum


class SpecimenStatus(str, Enum):
    available = "available"
    unavailable = "unavailable"
    unsatisfactory = "unsatisfactory"
    entered_in_error = "entered-in-error"


class SpecimenSubjectReferenceType(str, Enum):
    Patient = "Patient"
    Group = "Group"
    Device = "Device"
    Substance = "Substance"
    Location = "Location"


class SpecimenCollectorReferenceType(str, Enum):
    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"


class SpecimenParentReferenceType(str, Enum):
    Specimen = "Specimen"


class SpecimenRequestReferenceType(str, Enum):
    ServiceRequest = "ServiceRequest"


class SpecimenProcessingAdditiveReferenceType(str, Enum):
    Substance = "Substance"


class SpecimenContainerAdditiveReferenceType(str, Enum):
    Substance = "Substance"
