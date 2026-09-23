"""
FHIR R4 response shapes for the Appointment resource — used ONLY for OpenAPI documentation.

These schemas are NOT used for runtime validation. All responses are returned as
JSONResponse directly from the fhir-server payload. These models exist purely to
populate the Swagger UI `responses` dict with meaningful field names via `inline_schema()`.

Reference: https://hl7.org/fhir/R4/appointment.html
"""

from typing import List, Optional

from pydantic import BaseModel, Field


class FhirAppointmentParticipant(BaseModel):
    """FHIR R4 Appointment.participant element."""

    actor: Optional[dict] = Field(None, description="Actor involved in the appointment (FHIR Reference).")
    required: Optional[str] = Field(None, description="required | optional | information-only")
    status: str = Field(description="accepted | declined | tentative | needs-action")


class FhirAppointmentResponse(BaseModel):
    """
    FHIR R4 Appointment resource — response shape when the client sends
    Accept: application/fhir+json.

    Only the most commonly referenced top-level fields are listed here.
    Reference: https://hl7.org/fhir/R4/appointment.html
    """

    resourceType: str = Field(default="Appointment")
    id: str = Field(description="Logical FHIR resource ID.")
    status: str = Field(description="Appointment lifecycle status.")
    start: Optional[str] = Field(None, description="Start datetime (ISO 8601).")
    end: Optional[str] = Field(None, description="End datetime (ISO 8601).")
    minutesDuration: Optional[int] = None
    description: Optional[str] = None
    created: Optional[str] = None
    serviceType: Optional[List[dict]] = None
    specialty: Optional[List[dict]] = None
    appointmentType: Optional[dict] = None
    reasonCode: Optional[List[dict]] = None
    participant: List[FhirAppointmentParticipant] = Field(default_factory=list)


class FhirBundleEntry(BaseModel):
    """A single entry in a FHIR Bundle wrapping an Appointment resource."""

    resource: FhirAppointmentResponse = Field(description="The FHIR Appointment resource.")


class FhirBundleResponse(BaseModel):
    """FHIR R4 Bundle searchset — paginated list of Appointments in FHIR format."""

    resourceType: str = Field(default="Bundle")
    type: str = Field(default="searchset")
    total: int
    entry: Optional[List[FhirBundleEntry]] = None
