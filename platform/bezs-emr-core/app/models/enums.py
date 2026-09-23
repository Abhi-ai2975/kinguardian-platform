from enum import Enum


class SubjectReferenceType(str, Enum):
    """Shared subject reference types used across Encounter, Appointment, QuestionnaireResponse.
    All three store this as DB type name 'subject_reference_type'."""

    Patient = "Patient"
    Group = "Group"


class OrganizationReferenceType(str, Enum):
    """Shared enum for any FHIR field whose only allowed reference type is Organization.
    Stored as DB type name 'organization_reference_type' (shared across all tables).
    NOTE: this is a FHIR resource reference — distinct from the tenant org_id column."""

    Organization = "Organization"


class EncounterReferenceType(str, Enum):
    """Shared enum for any FHIR field whose only allowed reference type is Encounter.
    Stored as DB type name 'encounter_reference_type' (shared across all tables, create_type=False)."""

    Encounter = "Encounter"


class IdentifierUse(str, Enum):
    """FHIR R4 IdentifierUse — used by any resource that stores an identifier.use column."""

    usual = "usual"
    official = "official"
    temp = "temp"
    secondary = "secondary"
    old = "old"
