from typing import Optional
from datetime import datetime
from pydantic import Field, model_validator, AnyUrl
from app.schemas.base import FHIRBaseModel


class Attachment(FHIRBaseModel):
    """
    FHIR Attachment datatype.

    Content in a format such as a photograph, document, or other binary resource.
    """

    contentType: Optional[str] = Field(
        None,
        title="Content Type",
        description="Mime type of the content (e.g., image/png, application/pdf).",
        example="image/png",
    )

    language: Optional[str] = Field(
        None,
        title="Language",
        description="Human language of the content (BCP-47 format).",
        example="en",
    )

    data: Optional[str] = Field(
        None,
        title="Inline Data",
        description="Base64 encoded data.",
        example="iVBORw0KGgoAAAANSUhEUgAA...",
    )

    url: Optional[AnyUrl] = Field(
        None,
        title="Content URL",
        description="Uri where the data can be accessed.",
        example="https://example.com/images/patient-photo.png",
    )

    size: Optional[int] = Field(
        None,
        title="Size",
        description="Number of bytes of content (before base64 encoding).",
        example=204800,
        ge=0,
    )

    hash: Optional[str] = Field(
        None,
        title="Hash",
        description="Base64 encoded SHA-1 hash of the content.",
        example="aW1hZ2VoYXNo",
    )

    title: Optional[str] = Field(
        None,
        title="Title",
        description="Label or title of the attachment.",
        example="Patient Profile Photo",
    )

    creation: Optional[datetime] = Field(
        None,
        title="Creation Date",
        description="Date attachment was first created.",
        examples=["2024-01-01T10:00:00Z"],
    )

    @model_validator(mode="after")
    def validate_attachment(self):
        """
        Ensure either data or url is provided.
        """

        if not self.data and not self.url:
            raise ValueError("Attachment must contain either 'data' or 'url'.")

        return self
