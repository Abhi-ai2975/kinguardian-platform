from enum import Enum


class DocumentReferenceStatus(str, Enum):
    current = "current"
    superseded = "superseded"
    entered_in_error = "entered-in-error"


class DocumentReferenceDocStatus(str, Enum):
    preliminary = "preliminary"
    final = "final"
    amended = "amended"
    entered_in_error = "entered-in-error"


class DocumentReferenceSubjectReferenceType(str, Enum):
    """Allowed reference types for DocumentReference.subject."""

    Patient = "Patient"
    Practitioner = "Practitioner"
    Group = "Group"
    Device = "Device"


class DocumentReferenceAuthenticatorReferenceType(str, Enum):
    """Allowed reference types for DocumentReference.authenticator."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"


class DocumentReferenceAuthorReferenceType(str, Enum):
    """Allowed reference types for DocumentReference.author."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    Organization = "Organization"
    Device = "Device"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class DocumentReferenceRelatesToCode(str, Enum):
    """Relationship code for DocumentReference.relatesTo.code."""

    replaces = "replaces"
    transforms = "transforms"
    signs = "signs"
    appends = "appends"


class DocumentReferenceRelatesToTargetType(str, Enum):
    """Allowed reference type for DocumentReference.relatesTo.target."""

    DocumentReference = "DocumentReference"


class DocumentReferenceContextEncounterType(str, Enum):
    """Allowed reference types for DocumentReference.context.encounter."""

    Encounter = "Encounter"
    EpisodeOfCare = "EpisodeOfCare"


class DocumentReferenceContextSourcePatientInfoType(str, Enum):
    """Allowed reference type for DocumentReference.context.sourcePatientInfo."""

    Patient = "Patient"
