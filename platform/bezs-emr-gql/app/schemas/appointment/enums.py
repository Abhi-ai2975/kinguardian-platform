"""
Appointment-specific enums.

Only enums that are specific to the Appointment resource live here.
Shared FHIR code-set enums (IdentifierUse, ContactPointSystem, etc.) remain in
`app/schemas/enums.py`.

Reference: https://hl7.org/fhir/R4/appointment.html
"""

from enum import Enum


class AppointmentStatus(str, Enum):
    """
    Overall lifecycle status of an Appointment.

    Reference: https://hl7.org/fhir/R4/valueset-appointmentstatus.html
    """

    proposed = "proposed"
    pending = "pending"
    booked = "booked"
    arrived = "arrived"
    fulfilled = "fulfilled"
    cancelled = "cancelled"
    noshow = "noshow"
    entered_in_error = "entered-in-error"
    checked_in = "checked-in"
    waitlist = "waitlist"


class AppointmentParticipantStatus(str, Enum):
    """
    Participation status for a single Appointment participant.

    Reference: https://hl7.org/fhir/R4/valueset-participationstatus.html
    """

    accepted = "accepted"
    declined = "declined"
    tentative = "tentative"
    needs_action = "needs-action"
