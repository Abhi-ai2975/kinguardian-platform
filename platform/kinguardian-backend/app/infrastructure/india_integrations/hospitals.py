"""
Indian Hospitals & EMR Interface Contracts:
Defines protocols for hospital networks:
- Apollo Hospitals
- Fortis Healthcare
- Max Healthcare
- Manipal Hospitals
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class DoctorAppointmentBooking:
    booking_id: str
    hospital_name: str
    doctor_name: str
    specialty: str
    hospital_branch_id: str
    appointment_datetime: datetime
    consultation_type: str  # "IN_PERSON" | "TELECONSULT"
    patient_abha_number: Optional[str] = None


class IIndianHospitalAdapter(Protocol):
    """Protocol for hospital appointment booking and discharge summary retrieval."""

    async def list_available_slots(
        self,
        hospital_id: str,
        doctor_id: str,
        from_date: datetime,
        to_date: datetime
    ) -> List[datetime]:
        """Lists available consultation slots."""
        ...

    async def book_appointment(self, booking: DoctorAppointmentBooking) -> Dict[str, Any]:
        """Confirms appointment with hospital EMR system."""
        ...

    async def fetch_discharge_summary(self, ipd_admission_number: str) -> Dict[str, Any]:
        """Pulls structured discharge summary from hospital system."""
        ...
