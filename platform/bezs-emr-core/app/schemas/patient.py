from pydantic import BaseModel, Field
from typing import List, Optional, Literal
from datetime import date


# ── FHIR Data Types (Sub-models) ──────────────────────────────────────


class Identifier(BaseModel):
    """A unique identifier assigned to a resource, such as a Medical Record Number (MRN)."""

    system: Optional[str] = Field(
        None,
        title="Identifier System",
        description="The namespace URI for the identifier value. Typically a URL that uniquely identifies the assigning authority, e.g. 'http://hospital.goodhealth.com/mrn'.",
        example="http://hospital.goodhealth.com/mrn",
    )
    value: Optional[str] = Field(
        None,
        title="Identifier Value",
        description="The actual identifier string that uniquely identifies the resource within its system namespace, e.g. a Medical Record Number.",
        example="MRN-123456",
    )
    use: Optional[Literal["usual", "official", "temp", "secondary", "old"]] = Field(
        None,
        title="Identifier Use",
        description="The purpose of this identifier. 'official' means this is the primary identifier used by the organization. 'usual' is the most commonly used. 'temp' for temporary identifiers.",
        example="official",
    )


class HumanName(BaseModel):
    """A human name with structured components following FHIR HumanName datatype."""

    use: Optional[
        Literal["usual", "official", "temp", "nickname", "anonymous", "old", "maiden"]
    ] = Field(
        None,
        title="Name Use",
        description="Designates which name to use in a particular context. 'official' is the legal name. 'usual' is the name commonly used. 'nickname' for informal names. 'maiden' for pre-marriage family name.",
        example="official",
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
        description="The given names (first name and middle names) of the person. First element is the primary given name.",
        example=["John", "A"],
    )
    text: Optional[str] = Field(
        None,
        title="Full Name Text",
        description="The complete human-readable name as a single string, typically formatted as 'Given Family'.",
        example="John A Doe",
    )


class Telecom(BaseModel):
    """A contact point for a person — phone number, email, or other communication channel."""

    system: Optional[
        Literal["phone", "fax", "email", "pager", "url", "sms", "other"]
    ] = Field(
        None,
        title="Contact System",
        description="The type of communication system. Use 'phone' for landline or mobile numbers, 'email' for email addresses, 'sms' for SMS-capable numbers.",
        example="phone",
    )
    value: Optional[str] = Field(
        None,
        title="Contact Value",
        description="The actual contact point value — a phone number, email address, or URL depending on the system.",
        example="+1-555-123-4567",
    )
    use: Optional[Literal["home", "work", "temp", "old", "mobile"]] = Field(
        None,
        title="Contact Use",
        description="The purpose of this contact point. 'home' for personal use, 'work' for professional, 'mobile' specifically for mobile phones.",
        example="mobile",
    )
    rank: Optional[int] = Field(
        None,
        title="Preference Rank",
        description="Specifies a preferred order for using this contact. Lower numbers indicate higher preference (1 = most preferred).",
        ge=1,
        example=1,
    )


class Address(BaseModel):
    """A physical or postal address following FHIR Address datatype."""

    use: Optional[Literal["home", "work", "temp", "old", "billing"]] = Field(
        None,
        title="Address Use",
        description="The purpose of this address. 'home' for the patient's residence, 'work' for employer address, 'billing' for billing purposes.",
        example="home",
    )
    type: Optional[Literal["postal", "physical", "both"]] = Field(
        None,
        title="Address Type",
        description="Distinguishes between physical addresses (those you can visit) and mailing addresses (PO Boxes). Use 'both' if the address serves both purposes.",
        example="both",
    )
    line: Optional[List[str]] = Field(
        None,
        title="Street Address Lines",
        description="Street name, number, apartment/suite, PO Box, etc. Each element represents one line of the address.",
        example=["123 Main Street", "Apt 4B"],
    )
    city: Optional[str] = Field(
        None,
        title="City",
        description="The name of the city, town, or municipality.",
        example="New York",
    )
    state: Optional[str] = Field(
        None,
        title="State/Province",
        description="The state, province, or region abbreviation or name.",
        example="NY",
    )
    postalCode: Optional[str] = Field(
        None,
        title="Postal Code",
        description="The postal or ZIP code for the address.",
        example="10001",
    )
    country: Optional[str] = Field(
        None,
        title="Country",
        description="The country name or ISO 3166 country code.",
        example="USA",
    )


# ── Main Patient Model ────────────────────────────────────────────────


class PatientCreateSchema(BaseModel):
    """
    Schema for creating a FHIR Patient resource.

    A Patient resource covers data about individuals receiving care or other health-related
    services. This includes demographics, contact details, and administrative information.
    All fields follow the HL7 FHIR R4 Patient resource specification.
    """

    resourceType: str = Field(
        "Patient",
        title="Resource Type",
        description="The FHIR resource type. Must always be 'Patient' for this schema.",
        example="Patient",
        Literal=True,
    )
    active: Optional[bool] = Field(
        True,
        title="Active Status",
        description="Whether this patient record is currently active and in use. Set to false to mark the record as inactive without deleting it.",
        example=True,
    )
    identifier: Optional[List[Identifier]] = Field(
        None,
        title="Patient Identifiers",
        description="Business identifiers assigned to this patient — such as Medical Record Numbers (MRN), Social Security Numbers, or insurance IDs. At least one official identifier is recommended.",
    )
    name: Optional[List[HumanName]] = Field(
        None,
        title="Patient Names",
        description="The names associated with the patient. A patient may have multiple names (e.g., legal name and nickname). Include at least one 'official' name.",
    )
    telecom: Optional[List[Telecom]] = Field(
        None,
        title="Contact Points",
        description="Contact details for the patient — phone numbers, email addresses, etc. Order by preference rank when multiple contacts exist.",
    )
    gender: Optional[Literal["male", "female", "other", "unknown"]] = Field(
        None,
        title="Administrative Gender",
        description="The administrative gender of the patient for record-keeping purposes. This is not the same as biological sex or gender identity.",
        example="male",
    )
    birthDate: Optional[date] = Field(
        None,
        title="Date of Birth",
        description="The date of birth of the patient in ISO 8601 format (YYYY-MM-DD).",
        example="1985-04-12",
    )
    address: Optional[List[Address]] = Field(
        None,
        title="Patient Addresses",
        description="Physical or mailing addresses for the patient. Include at least the primary home address when available.",
    )

    class Config:
        json_schema_extra = {
            "example": {
                "resourceType": "Patient",
                "active": True,
                "identifier": [
                    {
                        "system": "http://hospital.goodhealth.com/mrn",
                        "value": "MRN-123456",
                        "use": "official",
                    }
                ],
                "name": [
                    {
                        "use": "official",
                        "family": "Doe",
                        "given": ["John", "A"],
                        "text": "John A Doe",
                    }
                ],
                "telecom": [
                    {
                        "system": "phone",
                        "value": "+1-555-123-4567",
                        "use": "mobile",
                        "rank": 1,
                    },
                    {
                        "system": "email",
                        "value": "john.doe@example.com",
                        "use": "home",
                    },
                ],
                "gender": "male",
                "birthDate": "1985-04-12",
                "address": [
                    {
                        "use": "home",
                        "type": "both",
                        "line": ["123 Main Street", "Apt 4B"],
                        "city": "New York",
                        "state": "NY",
                        "postalCode": "10001",
                        "country": "USA",
                    }
                ],
            }
        }
