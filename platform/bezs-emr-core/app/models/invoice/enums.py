from enum import Enum


class InvoiceStatus(str, Enum):
    """Invoice.status required binding."""
    draft = "draft"
    issued = "issued"
    balanced = "balanced"
    cancelled = "cancelled"
    entered_in_error = "entered-in-error"


class InvoiceSubjectReferenceType(str, Enum):
    """Allowed reference types for Invoice.subject."""
    Patient = "Patient"
    Group = "Group"


class InvoiceRecipientReferenceType(str, Enum):
    """Allowed reference types for Invoice.recipient."""
    Organization = "Organization"
    Patient = "Patient"
    RelatedPerson = "RelatedPerson"


class InvoiceParticipantActorReferenceType(str, Enum):
    """Allowed reference types for Invoice.participant.actor."""
    Practitioner = "Practitioner"
    Organization = "Organization"
    Patient = "Patient"
    PractitionerRole = "PractitionerRole"
    Device = "Device"
    RelatedPerson = "RelatedPerson"


class InvoiceAccountReferenceType(str, Enum):
    """Allowed reference types for Invoice.account."""
    Account = "Account"


class InvoiceLineItemChargeItemReferenceType(str, Enum):
    """Allowed reference type for Invoice.lineItem.chargeItem[x] Reference variant."""
    ChargeItem = "ChargeItem"
