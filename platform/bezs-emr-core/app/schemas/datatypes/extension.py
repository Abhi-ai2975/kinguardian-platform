from typing import Optional
from datetime import datetime
from pydantic import Field, model_validator
from app.schemas.base import FHIRBaseModel


class Extension(FHIRBaseModel):
    """
    FHIR Extension datatype.

    Allows additional information to be added to a resource
    without modifying the base definition.
    """

    url: str = Field(..., description="Identifies the meaning of the extension.")

    valueDateTime: Optional[datetime] = None
    valueString: Optional[str] = None
    valueBoolean: Optional[bool] = None
    valueInteger: Optional[int] = None

    @model_validator(mode="after")
    def validate_extension(self):
        values = [
            self.valueDateTime,
            self.valueString,
            self.valueBoolean,
            self.valueInteger,
        ]

        if sum(v is not None for v in values) != 1:
            raise ValueError("Extension must contain exactly one value[x] field.")

        return self
