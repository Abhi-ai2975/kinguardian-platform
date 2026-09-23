from typing import Optional
from datetime import datetime
from pydantic import Field, model_validator
from app.schemas.base import FHIRBaseModel


class Period(FHIRBaseModel):
    """
    Generic FHIR Period datatype.

    Represents a time range defined by a start and/or end datetime.

    Structure only. Meaning depends on the resource using it.
    """

    start: Optional[datetime] = Field(
        None,
        description="Starting time with inclusive boundary.",
        examples=["2024-01-01T10:00:00Z"],
    )

    end: Optional[datetime] = Field(
        None,
        description="End time with inclusive boundary, if not ongoing.",
        examples=["2024-01-10T18:00:00Z"],
    )

    @model_validator(mode="after")
    def validate_period(self):
        """
        Ensure end is not before start if both are provided.
        """
        if self.start and self.end and self.end < self.start:
            raise ValueError("Period end must be greater than or equal to start.")
        return self
