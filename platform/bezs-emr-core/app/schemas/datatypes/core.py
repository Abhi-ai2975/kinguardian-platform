from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field, model_validator
from app.schemas.base import FHIRBaseModel
from app.schemas.enums import IdentifierUse
from app.schemas.datatypes.timing import Period


class Identifier(FHIRBaseModel):
    """
    Generic FHIR Identifier datatype.

    An identifier — identifies some entity uniquely and unambiguously.
    Typically used for business identifiers such as medical record numbers,
    national IDs, or license numbers.

    Structure only. Meaning depends on the resource using it.
    """

    use: Optional[IdentifierUse] = Field(
        None,
        description="Purpose of this identifier (usual, official, temp, secondary, old).",
    )

    type: Optional[CodeableConcept] = Field(
        None,
        description="Description of identifier type (e.g., MRN, SSN, Driver's License).",
    )

    system: Optional[str] = Field(
        None,
        description="Namespace URI defining the identifier system.",
        examples=["http://hospital.smarthealth.org/mrn"],
    )

    value: Optional[str] = Field(
        None,
        description="The identifier value within the given system namespace.",
        examples=["12345678"],
    )

    period: Optional[Period] = Field(
        None,
        description="Time period during which the identifier is/was valid.",
    )

    assigner: Optional[Reference] = Field(
        None,
        description="Organization that issued the identifier.",
    )

    @model_validator(mode="after")
    def validate_identifier(self):
        """
        Ensure that an identifier has at least a value or system.
        """
        if not self.value and not self.system:
            raise ValueError("Identifier must have at least 'value' or 'system'.")
        return self


class Reference(FHIRBaseModel):
    """
    FHIR Reference datatype.

    A reference from one resource to another.
    """

    reference: Optional[str] = Field(
        None,
        title="Reference",
        description="Literal reference to another resource (e.g., 'Patient/123').",
        example="Patient/123",
    )

    type: Optional[str] = Field(
        None,
        title="Reference Type",
        description="The expected resource type (e.g., 'Patient', 'Practitioner').",
        example="Patient",
    )

    identifier: Optional[Identifier] = Field(
        None,
        title="Logical Reference Identifier",
        description="Logical reference when literal reference is not known.",
    )

    display: Optional[str] = Field(
        None,
        title="Display Text",
        description="Text alternative for the resource.",
        example="John Doe",
    )

    @model_validator(mode="after")
    def validate_reference(self):
        """
        Ensure at least one meaningful reference field exists.
        """
        if not any([self.reference, self.identifier, self.display]):
            raise ValueError(
                "Reference must contain at least one of: reference, identifier, or display."
            )

        return self


class CodeableConcept(FHIRBaseModel):
    """
    Generic FHIR CodeableConcept datatype.

    Represents a coded concept with optional terminology system reference
    and/or free-text description.

    Structure only. Meaning depends on the resource using it.
    """

    coding: Optional[List[Coding]] = Field(
        None,
        description="Code defined by a terminology system.",
    )

    text: Optional[str] = Field(
        None,
        description="Plain text representation of the concept.",
    )

    @model_validator(mode="after")
    def validate_presence(self):
        """
        Ensure at least one of coding or text is present.
        FHIR allows either, but not both empty.
        """
        if not self.coding and not self.text:
            raise ValueError("CodeableConcept must have at least 'coding' or 'text'")
        return self


class Coding(FHIRBaseModel):
    """
    Generic FHIR Coding datatype.

    Represents a single code from a terminology system.

    Contains the system URI, code value, optional version, display text,
    and user selection indicator.
    """

    system: Optional[str] = Field(
        None,
        description="Identity of the terminology system (e.g. SNOMED, LOINC, RxNorm).",
        examples=["http://snomed.info/sct"],
    )

    version: Optional[str] = Field(
        None,
        description="Version of the terminology system.",
    )

    code: Optional[str] = Field(
        None,
        description="Symbol in syntax defined by the system.",
        examples=["44054006"],
    )

    display: Optional[str] = Field(
        None,
        description="Representation defined by the system.",
        examples=["Diabetes mellitus type 2"],
    )

    userSelected: Optional[bool] = Field(
        None,
        description="Indicates whether this coding was chosen directly by the user.",
    )


# ── Response-only types (no presence validators) ──────────────────────────────


class CodingSchema(BaseModel):
    system: Optional[str] = None
    version: Optional[str] = None
    code: Optional[str] = None
    display: Optional[str] = None
    user_selected: Optional[bool] = None


class CodeableConceptSchema(BaseModel):
    coding: Optional[List[CodingSchema]] = None
    text: Optional[str] = None
