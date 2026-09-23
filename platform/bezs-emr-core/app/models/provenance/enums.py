from enum import Enum


class ProvenanceEntityRole(str, Enum):
    """FHIR R4 Provenance.entity.role — how the entity was used in the activity."""

    derivation = "derivation"
    revision = "revision"
    quotation = "quotation"
    source = "source"
    removal = "removal"


class ProvenanceAgentWhoReferenceType(str, Enum):
    """Allowed reference types for Provenance.agent.who and agent.onBehalfOf.
    Shared PG enum 'provenance_agent_who_reference_type' (create_type=False for onBehalfOf
    and provenance_entity_agent columns)."""

    Practitioner = "Practitioner"
    PractitionerRole = "PractitionerRole"
    RelatedPerson = "RelatedPerson"
    Patient = "Patient"
    Device = "Device"
    Organization = "Organization"


class ProvenanceLocationReferenceType(str, Enum):
    """Allowed reference type for Provenance.location."""

    Location = "Location"
