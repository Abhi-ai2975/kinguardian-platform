"""
FHIR-aligned enumeration types used across resource schemas.

Each enum maps directly to a code set defined in the FHIR R4 specification
(https://hl7.org/fhir/R4/). Using str-based enums (str, Enum) means the values
serialise to their string codes in JSON bodies automatically, which is what the
FHIR Server expects. Pydantic validates incoming strings against these enums during
request deserialisation so invalid codes are rejected with a 422 before reaching
the service layer.

Reference: https://hl7.org/fhir/R4/valueset-identifier-use.html and related pages.
"""

from enum import Enum


class IdentifierUse(str, Enum):
    """
    FHIR Identifier.use — describes the purpose of an identifier attached to a resource.

    Values defined by https://hl7.org/fhir/R4/valueset-identifier-use.html:
      usual     — the identifier recommended for display and use in real-world contact.
      official  — the 'official' identifier assigned by an authoritative body.
      temp      — a temporary identifier assigned during registration or interim use.
      secondary — an identifier that was assigned in secondary use (e.g. a visit number).
      old       — the identifier is no longer in use.
    """

    usual = "usual"
    official = "official"
    temp = "temp"
    secondary = "secondary"
    old = "old"


class ContactPointSystem(str, Enum):
    """
    FHIR ContactPoint.system — the technology or protocol behind a contact point.

    Values defined by https://hl7.org/fhir/R4/valueset-contact-point-system.html:
      phone  — a voice telephone number.
      fax    — a fax machine number.
      email  — an email address.
      pager  — a pager number.
      url    — a URL — typically a website or SMART-on-FHIR endpoint.
      sms    — a contact that can be reached by SMS text message.
      other  — a contact value using a technology not covered by the above codes.
    """

    phone = "phone"
    fax = "fax"
    email = "email"
    pager = "pager"
    url = "url"
    sms = "sms"
    other = "other"


class ContactPointUse(str, Enum):
    """
    FHIR ContactPoint.use — the purpose of a contact point value.

    Values defined by https://hl7.org/fhir/R4/valueset-contact-point-use.html:
      home   — a communication address at a home (not work).
      work   — an office contact address.
      temp   — a temporary contact address.
      old    — this contact address is no longer in use.
      mobile — a telecommunication device that moves with its owner.
    """

    home = "home"
    work = "work"
    temp = "temp"
    old = "old"
    mobile = "mobile"


class AddressUse(str, Enum):
    """
    FHIR Address.use — the purpose of the address.

    Values defined by https://hl7.org/fhir/R4/valueset-address-use.html:
      home    — a home address.
      work    — an office or institutional address.
      temp    — a temporary address (e.g. hotel during travel).
      old     — a previous address that is no longer in use.
      billing — an address to be used to send bills, invoices, receipts, etc.
    """

    home = "home"
    work = "work"
    temp = "temp"
    old = "old"
    billing = "billing"


class AddressType(str, Enum):
    """
    FHIR Address.type — distinguishes between a mailing address and a physical location.

    Values defined by https://hl7.org/fhir/R4/valueset-address-type.html:
      postal   — mailing address (PO Box or similar) — no physical visit expected.
      physical — a physical address that can be visited (building, floor, room).
      both     — the address serves as both a postal and a physical address.
    """

    postal = "postal"
    physical = "physical"
    both = "both"


class HumanNameUse(str, Enum):
    """
    FHIR HumanName.use — the purpose of a human name value.

    Values defined by https://hl7.org/fhir/R4/valueset-name-use.html:
      usual     — the name normally used to address the person (preferred display).
      official  — the formal name as it appears on legal documents.
      temp      — a temporary name (e.g. used during emergency care without ID).
      nickname  — an informal name used by friends or family.
      anonymous — a name used for privacy to hide the real identity (e.g. research).
      old       — a name that was previously in use (e.g. maiden name before marriage).
      maiden    — name used before changing due to marriage — a special case of `old`.
    """

    usual = "usual"
    official = "official"
    temp = "temp"
    nickname = "nickname"
    anonymous = "anonymous"
    old = "old"
    maiden = "maiden"


class AdministrativeGender(str, Enum):
    """
    FHIR administrative gender — the gender of a person used for administrative purposes.

    Note: FHIR separates administrative gender (used for record-keeping) from clinical
    sex or gender identity. This enum covers the four values used across Practitioner,
    Patient, RelatedPerson, and Person resources.

    Values defined by https://hl7.org/fhir/R4/valueset-administrative-gender.html:
      male    — male gender.
      female  — female gender.
      other   — a gender not covered by male or female (e.g. non-binary, intersex).
      unknown — gender is unknown or not provided.
    """

    male = "male"
    female = "female"
    other = "other"
    unknown = "unknown"
