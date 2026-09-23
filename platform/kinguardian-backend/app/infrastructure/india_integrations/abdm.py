"""
ABDM (Ayushman Bharat Digital Mission) & ABHA Interface Contracts:
Defines protocols for:
1. ABHA (Ayushman Bharat Health Account) creation, verification, and authentication.
2. Consent Manager & Health Information Exchange (HIU / HIP roles).
3. Linking Care Contexts to ABDM Health Records.
"""

from typing import Protocol, Dict, Any, List, Optional
import uuid
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True)
class ABHAProfile:
    abha_number: str
    abha_address: str  # e.g., username@abdm
    name: str
    gender: str
    date_of_birth: str
    mobile: str
    verified: bool = True
    kyc_status: str = "VERIFIED"


@dataclass(frozen=True)
class ABDMConsentArtefact:
    consent_id: str
    patient_abha_address: str
    hip_id: str
    hiu_id: str
    purpose: str
    date_range_from: datetime
    date_range_to: datetime
    data_types: List[str]  # e.g., ["DiagnosticReport", "Prescription", "DischargeSummary"]
    status: str = "REQUESTED"


class IABHAService(Protocol):
    """Protocol for ABHA number and address creation and OTP verification."""

    async def generate_otp_for_aadhaar(self, aadhaar_number: str) -> Dict[str, Any]:
        """Initiates OTP for Aadhaar-based ABHA creation."""
        ...

    async def verify_aadhaar_otp(self, txn_id: str, otp: str) -> ABHAProfile:
        """Verifies Aadhaar OTP and returns created ABHA profile."""
        ...

    async def verify_abha_address(self, abha_address: str) -> Optional[ABHAProfile]:
        """Resolves and validates an existing ABHA address."""
        ...

    async def link_abha_to_subject(
        self,
        subject_id: uuid.UUID,
        abha_number: str,
        abha_address: str
    ) -> bool:
        """Links verified ABHA identity to KinGuardian CareSubject."""
        ...


class IABDMHealthDataExchange(Protocol):
    """Protocol for ABDM Consent Manager & Health Data Exchange (HIU / HIP)."""

    async def request_consent_artefact(
        self,
        patient_abha_address: str,
        hiu_id: str,
        purpose: str,
        data_types: List[str]
    ) -> ABDMConsentArtefact:
        """Requests consent artefact from patient via ABDM Gateway."""
        ...

    async def fetch_health_data_bundle(
        self,
        consent_id: str,
        transaction_id: str
    ) -> List[Dict[str, Any]]:
        """Fetches FHIR-compliant health records bundle from HIP."""
        ...

    async def link_care_context(
        self,
        patient_abha_address: str,
        care_context_reference: str,
        display_name: str
    ) -> bool:
        """Registers a care context in the ABDM network."""
        ...
