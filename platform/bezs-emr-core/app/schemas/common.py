# app/schemas/common_schemas.py

from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Literal


class StrictBaseModel(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Identifier(StrictBaseModel):
    """
    FHIR Identifier datatype.

    A business identifier assigned to a resource.
    Examples:
    - Patient → MRN
    - Practitioner → License Number / NPI
    - Encounter → Visit Number
    """

    system: Optional[str] = Field(
        None,
        title="Identifier System",
        description="Namespace URI defining the identifier system (e.g. hospital MRN system, licensing authority, NPI registry).",
        example="http://hospital.goodhealth.com/mrn",
    )

    value: Optional[str] = Field(
        None,
        title="Identifier Value",
        description="The actual identifier string assigned within the namespace.",
        example="MRN-123456",
    )

    use: Optional[Literal["usual", "official", "temp", "secondary", "old"]] = Field(
        None,
        title="Identifier Use",
        description="Purpose of this identifier. 'official' typically represents the primary identifier.",
        example="official",
    )
