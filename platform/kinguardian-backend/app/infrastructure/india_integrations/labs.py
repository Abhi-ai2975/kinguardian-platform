"""
Indian Diagnostics & Labs Interface Contracts:
Defines protocols for integrating with Indian diagnostic providers:
- Dr Lal PathLabs
- Metropolis Healthcare
- Agilus Diagnostics (SRL)
- Thyrocare
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class LabTestBookingRequest:
    booking_id: str
    subject_id: uuid.UUID
    patient_name: str
    patient_phone: str
    pickup_address: str
    pincode: str
    test_codes: List[str]  # e.g., ["CBC", "LIPID_PROFILE", "HBA1C", "TSH"]
    scheduled_slot: datetime
    provider: str  # "LAL_PATHLABS", "METROPOLIS", "AGILUS", "THYROCARE"


@dataclass(frozen=True)
class LabReportResult:
    report_id: str
    booking_id: str
    provider: str
    test_name: str
    loinc_code: str
    observed_value: str
    unit: str
    reference_range: str
    is_abnormal: bool
    report_pdf_url: Optional[str]
    released_at: datetime


class IIndianLabAdapter(Protocol):
    """Protocol for Indian diagnostic lab ordering and report ingestion."""

    async def check_pincode_serviceability(self, pincode: str) -> bool:
        """Checks if home sample collection (phlebotomy) is available in pincode."""
        ...

    async def book_home_collection(self, request: LabTestBookingRequest) -> Dict[str, Any]:
        """Books phlebotomist home visit for diagnostic test panel."""
        ...

    async def fetch_lab_report(self, report_id: str) -> List[LabReportResult]:
        """Fetches structured lab results normalized to LOINC & FHIR Observation format."""
        ...
