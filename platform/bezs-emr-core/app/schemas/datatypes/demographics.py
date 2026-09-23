import re
from typing import Optional, List
from pydantic import Field, model_validator
from app.schemas.base import FHIRBaseModel
from app.schemas.datatypes.timing import Period
from app.schemas.enums import (
    HumanNameUse,
    ContactPointSystem,
    ContactPointUse,
    AddressUse,
    AddressType,
)


class HumanName(FHIRBaseModel):
    """
    FHIR HumanName datatype.

    A structured representation of a person's name.
    Used in resources such as Patient, Practitioner, and RelatedPerson.
    """

    use: Optional[HumanNameUse] = Field(
        None,
        title="Name Use",
        description=(
            "Designates which name to use in a particular context. "
            "'official' is the legal name. 'usual' is the name commonly used. "
            "'nickname' for informal names. 'maiden' for pre-marriage family name."
        ),
        example="official",
    )

    text: Optional[str] = Field(
        None,
        title="Full Name Text",
        description=(
            "The complete human-readable name as a single string, "
            "typically formatted as 'Given Family'."
        ),
        example="John A Doe",
    )

    family: Optional[str] = Field(
        None,
        title="Family Name",
        description="The family name (surname/last name) of the person.",
        example="Doe",
    )

    given: Optional[List[str]] = Field(
        None,
        title="Given Names",
        description=(
            "The given names (first name and middle names) of the person. "
            "The first element is the primary given name."
        ),
        example=["John", "A"],
    )

    prefix: Optional[List[str]] = Field(
        None,
        title="Name Prefix",
        description=("Parts that come before the name, such as titles or honorifics."),
        example=["Dr."],
    )

    suffix: Optional[List[str]] = Field(
        None,
        title="Name Suffix",
        description=(
            "Parts that come after the name, such as qualifications or generational indicators."
        ),
        example=["Jr."],
    )

    period: Optional[Period] = Field(
        None,
        title="Validity Period",
        description=("The time period during which this name was/is in use."),
    )

    @model_validator(mode="after")
    def validate_human_name(self):
        """
        Ensure that at least one meaningful name component is present.
        """

        if not self.text and not self.family and not self.given:
            raise ValueError(
                "HumanName must contain at least one of: text, family, or given."
            )

        # Auto-generate text if missing
        if not self.text:
            parts = []
            if self.given:
                parts.extend(self.given)
            if self.family:
                parts.append(self.family)
            if parts:
                self.text = " ".join(parts)

        return self


class Address(FHIRBaseModel):
    """
    FHIR Address datatype.

    An address expressed using postal conventions (as opposed to GPS or other location definition formats).
    """

    use: Optional[AddressUse] = Field(
        None,
        title="Address Use",
        description="The purpose of this address.",
        example="home",
    )

    type: Optional[AddressType] = Field(
        None,
        title="Address Type",
        description="Distinguishes between physical and postal address.",
        example="both",
    )

    text: Optional[str] = Field(
        None,
        title="Full Address Text",
        description="The full address as a single text string.",
        example="221B Baker Street, London NW1 6XE, UK",
    )

    line: Optional[List[str]] = Field(
        None,
        title="Street Address Lines",
        description="Street name, number, direction, and other components.",
        example=["221B Baker Street"],
    )

    city: Optional[str] = Field(
        None,
        title="City",
        description="The name of the city, town, or municipality.",
        example="London",
    )

    district: Optional[str] = Field(
        None,
        title="District",
        description="District or county within a state.",
        example="Greater London",
    )

    state: Optional[str] = Field(
        None,
        title="State or Province",
        description="Sub-unit of a country (e.g., state or province).",
        example="England",
    )

    postalCode: Optional[str] = Field(
        None,
        title="Postal Code",
        description="Postal code for the area.",
        example="NW1 6XE",
    )

    country: Optional[str] = Field(
        None,
        title="Country",
        description="Country (can be ISO 3166 2 or 3 letter code).",
        example="GB",
    )

    period: Optional[Period] = Field(
        None,
        title="Validity Period",
        description="Time period when the address was/is in use.",
    )

    @model_validator(mode="after")
    def validate_address(self):
        """
        Ensure at least some address information is present.
        """

        if not any(
            [
                self.text,
                self.line,
                self.city,
                self.state,
                self.postalCode,
                self.country,
            ]
        ):
            raise ValueError(
                "Address must contain at least one meaningful address component."
            )

        return self


class ContactPoint(FHIRBaseModel):
    """
    FHIR ContactPoint datatype.

    Details for all kinds of technology-mediated contact points
    for a person or organization.
    """

    system: Optional[ContactPointSystem] = Field(
        None,
        title="Contact System",
        description="Telecommunications form for contact point.",
        example="phone",
    )

    value: Optional[str] = Field(
        None,
        title="Contact Value",
        description="The actual contact point details (e.g., phone number or email address).",
        example="+91-9876543210",
    )

    use: Optional[ContactPointUse] = Field(
        None,
        title="Contact Use",
        description="Identifies the purpose for the contact point.",
        example="mobile",
    )

    rank: Optional[int] = Field(
        None,
        title="Preference Rank",
        description="Specifies a preferred order in which to use a set of contacts (1 = highest priority).",
        example=1,
        ge=1,
    )

    period: Optional[Period] = Field(
        None,
        title="Validity Period",
        description="Time period when the contact point was/is in use.",
    )

    @model_validator(mode="after")
    def validate_contact_point(self):
        """
        Ensure meaningful ContactPoint data exists.
        """

        if not self.value:
            raise ValueError("ContactPoint must include a value.")

        if self.system == ContactPointSystem.email:
            email_pattern = r"^[^@]+@[^@]+\.[^@]+$"
            if not re.match(email_pattern, self.value):
                raise ValueError("Invalid email format.")

        return self
