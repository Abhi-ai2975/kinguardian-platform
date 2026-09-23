from enum import Enum


# datatype enums


class AddressUse(str, Enum):
    """
    FHIR AddressUse value set.

    The purpose of this address.
    """

    home = "home"
    work = "work"
    temp = "temp"
    old = "old"
    billing = "billing"


class AddressType(str, Enum):
    """
    FHIR AddressType value set.

    The type of address.
    """

    postal = "postal"
    physical = "physical"
    both = "both"


class AdministrativeGender(str, Enum):
    """
    FHIR AdministrativeGender value set.

    The gender of a person for administrative purposes.
    """

    male = "male"
    female = "female"
    other = "other"
    unknown = "unknown"


class ContactPointSystem(str, Enum):
    """
    FHIR ContactPointSystem value set.

    Telecommunications form for contact point.
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
    FHIR ContactPointUse value set.

    Purpose of the contact point.
    """

    home = "home"
    work = "work"
    temp = "temp"
    old = "old"
    mobile = "mobile"


class HumanNameUse(str, Enum):
    """
    FHIR HumanNameUse value set.

    Indicates the purpose of this name.
    """

    usual = "usual"  # The name normally used
    official = "official"  # Official/legal name
    temp = "temp"  # Temporary name
    nickname = "nickname"  # Nickname
    anonymous = "anonymous"  # Anonymous/pseudonym
    old = "old"  # Old/previous name
    maiden = "maiden"  # Maiden name


class IdentifierUse(str, Enum):
    """
    FHIR IdentifierUse value set.

    Indicates the purpose of the identifier.
    """

    usual = "usual"  # The identifier the resource owner normally uses
    official = (
        "official"  # The identifier considered official for legal/administrative use
    )
    temp = "temp"  # Temporary identifier
    secondary = "secondary"  # Additional identifier
    old = "old"  # No longer valid identifier


"""
------------------------------------------------------------------------------
------------------------------------------------------------------------------
"""
# backbone enums


class PatientLinkType(str, Enum):
    """
    FHIR Patient.link.type value set.
    """

    replaced_by = "replaced-by"
    replaces = "replaces"
    refer = "refer"
    seealso = "seealso"


