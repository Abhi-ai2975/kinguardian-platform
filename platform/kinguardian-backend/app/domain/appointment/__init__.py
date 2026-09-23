"""
Domain Appointment Layer:
Entities, Value Objects, Repositories, and State Machine for Clinical Appointments & Pre-Visit Preparation.
"""

from app.domains.family.domain.entities import AppointmentCoordinationEntity
from app.domain.appointment.state_machine import (
    AppointmentPreparationState,
    AppointmentPreparationStateMachine,
    transition_appointment_prep_state
)

__all__ = [
    "AppointmentCoordinationEntity",
    "AppointmentPreparationState",
    "AppointmentPreparationStateMachine",
    "transition_appointment_prep_state"
]
