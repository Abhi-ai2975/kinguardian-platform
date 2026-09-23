"""
India-Specific Integrations Package:
Architectural protocols and contracts for future integration:
- ABDM / ABHA (Ayushman Bharat Digital Mission & Health Information Exchange)
- Indian Labs & Diagnostics (Lal PathLabs, Metropolis, Agilus, Thyrocare)
- Indian Pharmacies (1mg, Apollo Pharmacy, Netmeds, PharmEasy)
- Indian Hospitals (Apollo, Fortis, Max, Manipal)
- WhatsApp Interactive Healthcare Communication
- Indian Regional Languages (Bhashini / IndicTrans across 10 languages)
- UPI & AutoPay Recurring Mandates
"""

from app.infrastructure.india_integrations.abdm import (
    ABHAProfile,
    ABDMConsentArtefact,
    IABHAService,
    IABDMHealthDataExchange
)
from app.infrastructure.india_integrations.labs import (
    LabTestBookingRequest,
    LabReportResult,
    IIndianLabAdapter
)
from app.infrastructure.india_integrations.pharmacy import (
    PharmacyOrderRequest,
    PharmacyOrderStatus,
    IIndianPharmacyAdapter
)
from app.infrastructure.india_integrations.hospitals import (
    DoctorAppointmentBooking,
    IIndianHospitalAdapter
)
from app.infrastructure.india_integrations.whatsapp import (
    WhatsAppInteractiveButton,
    WhatsAppMessagePayload,
    IWhatsAppHealthcareAdapter
)
from app.infrastructure.india_integrations.localization import (
    SUPPORTED_INDIAN_LANGUAGES,
    TranslationResult,
    IIndianLanguageService
)
from app.infrastructure.india_integrations.payments import (
    UPIPaymentRequest,
    UPIPaymentIntent,
    UPIAutoPayMandate,
    IUPIPaymentGateway
)

__all__ = [
    "ABHAProfile",
    "ABDMConsentArtefact",
    "IABHAService",
    "IABDMHealthDataExchange",
    "LabTestBookingRequest",
    "LabReportResult",
    "IIndianLabAdapter",
    "PharmacyOrderRequest",
    "PharmacyOrderStatus",
    "IIndianPharmacyAdapter",
    "DoctorAppointmentBooking",
    "IIndianHospitalAdapter",
    "WhatsAppInteractiveButton",
    "WhatsAppMessagePayload",
    "IWhatsAppHealthcareAdapter",
    "SUPPORTED_INDIAN_LANGUAGES",
    "TranslationResult",
    "IIndianLanguageService",
    "UPIPaymentRequest",
    "UPIPaymentIntent",
    "UPIAutoPayMandate",
    "IUPIPaymentGateway"
]
