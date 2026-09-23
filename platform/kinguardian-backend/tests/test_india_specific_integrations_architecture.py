"""
India-Specific Integrations Architecture Test Suite:
Verifies clean interface boundaries and protocol contracts for:
1. ABDM & ABHA Health Information Exchange
2. Indian Diagnostics & Labs
3. Indian Pharmacies & Fulfillment
4. Indian Hospitals & Consultations
5. WhatsApp Healthcare Interactive Communication
6. Indian Languages & Bhashini Voice Processing
7. UPI Payments & AutoPay Mandates
"""

import pytest
import uuid
from datetime import datetime, timezone

from app.infrastructure.india_integrations import (
    ABHAProfile,
    ABDMConsentArtefact,
    IABHAService,
    IABDMHealthDataExchange,
    LabTestBookingRequest,
    LabReportResult,
    IIndianLabAdapter,
    PharmacyOrderRequest,
    PharmacyOrderStatus,
    IIndianPharmacyAdapter,
    DoctorAppointmentBooking,
    IIndianHospitalAdapter,
    WhatsAppInteractiveButton,
    WhatsAppMessagePayload,
    IWhatsAppHealthcareAdapter,
    SUPPORTED_INDIAN_LANGUAGES,
    TranslationResult,
    IIndianLanguageService,
    UPIPaymentRequest,
    UPIPaymentIntent,
    UPIAutoPayMandate,
    IUPIPaymentGateway
)


def test_abdm_and_abha_protocols():
    """
    Verifies ABDM and ABHA data structures and protocol signatures.
    """
    profile = ABHAProfile(
        abha_number="91-1234-5678-9012",
        abha_address="kishore@abdm",
        name="Kishore Sharma",
        gender="M",
        date_of_birth="1958-05-14",
        mobile="+919876543210",
        verified=True,
        kyc_status="VERIFIED"
    )
    assert profile.abha_address == "kishore@abdm"
    assert profile.verified is True

    artefact = ABDMConsentArtefact(
        consent_id="consent_abdm_123",
        patient_abha_address="kishore@abdm",
        hip_id="apollo_delhi_hip",
        hiu_id="kinguardian_hiu",
        purpose="CAREGIVER_MONITORING",
        date_range_from=datetime(2026, 1, 1, tzinfo=timezone.utc),
        date_range_to=datetime(2026, 8, 24, tzinfo=timezone.utc),
        data_types=["DiagnosticReport", "Prescription"],
        status="GRANTED"
    )
    assert artefact.consent_id == "consent_abdm_123"
    assert "DiagnosticReport" in artefact.data_types


def test_indian_labs_protocols():
    """
    Verifies diagnostic lab ordering and report result protocols.
    """
    sub_id = uuid.uuid4()
    req = LabTestBookingRequest(
        booking_id="booking_lal_001",
        subject_id=sub_id,
        patient_name="Kishore Sharma",
        patient_phone="+919876543210",
        pickup_address="Flat 402, Green Glen Layout, Bengaluru",
        pincode="560103",
        test_codes=["HBA1C", "LIPID_PROFILE"],
        scheduled_slot=datetime(2026, 8, 25, 7, 0, tzinfo=timezone.utc),
        provider="LAL_PATHLABS"
    )
    assert req.provider == "LAL_PATHLABS"
    assert "HBA1C" in req.test_codes

    report = LabReportResult(
        report_id="rep_991",
        booking_id="booking_lal_001",
        provider="LAL_PATHLABS",
        test_name="HbA1c Glycated Hemoglobin",
        loinc_code="4548-4",
        observed_value="6.4",
        unit="%",
        reference_range="4.0 - 5.6",
        is_abnormal=True,
        report_pdf_url="https://filenest.kinguardian.internal/files/lab_rep_991.pdf",
        released_at=datetime.now(timezone.utc)
    )
    assert report.is_abnormal is True
    assert report.loinc_code == "4548-4"


def test_indian_pharmacy_protocols():
    """
    Verifies pharmacy fulfillment and tracking protocols.
    """
    order = PharmacyOrderRequest(
        order_id="ord_1mg_101",
        subject_id=uuid.uuid4(),
        delivery_address="Indiranagar, Bengaluru",
        pincode="560038",
        prescription_file_id="filenest_rx_456",
        medications=[{"name": "Metformin 500mg", "quantity": 60}],
        provider="ONE_MG"
    )
    assert order.provider == "ONE_MG"
    assert len(order.medications) == 1

    status = PharmacyOrderStatus(
        order_id="ord_1mg_101",
        external_order_ref="1MG-BLR-88231",
        provider="ONE_MG",
        status="DISPATCHED",
        estimated_delivery=datetime(2026, 8, 26, 18, 0, tzinfo=timezone.utc),
        tracking_url="https://1mg.com/track/1MG-BLR-88231"
    )
    assert status.status == "DISPATCHED"


def test_whatsapp_healthcare_protocols():
    """
    Verifies WhatsApp interactive button and template message protocols.
    """
    btn_taken = WhatsAppInteractiveButton(button_id="btn_taken", title="Taken Dose")
    btn_snooze = WhatsAppInteractiveButton(button_id="btn_snooze", title="Snooze 30m")

    payload = WhatsAppMessagePayload(
        recipient_phone="+919876543210",
        template_name="medication_reminder_interactive",
        language_code="hi",
        parameters=["Kishore", "Amlodipine 5mg", "08:00 AM"],
        buttons=[btn_taken, btn_snooze]
    )
    assert payload.language_code == "hi"
    assert len(payload.buttons) == 2


def test_indian_languages_and_localization():
    """
    Verifies support for 10 regional Indian languages and translation result contracts.
    """
    expected_langs = ["hi", "te", "ta", "kn", "bn", "mr", "gu", "ml", "pa", "en"]
    for lang in expected_langs:
        assert lang in SUPPORTED_INDIAN_LANGUAGES

    trans = TranslationResult(
        source_language="en",
        target_language="hi",
        original_text="Take 1 tablet after food",
        translated_text="खाने के बाद 1 गोली लें",
        confidence=0.98
    )
    assert trans.translated_text == "खाने के बाद 1 गोली लें"


def test_upi_payments_and_autopay_protocols():
    """
    Verifies UPI payment intent and recurring AutoPay mandate structures.
    """
    fam_id = uuid.uuid4()
    payer_id = uuid.uuid4()

    req = UPIPaymentRequest(
        payment_id="pay_upi_772",
        family_id=fam_id,
        payer_profile_id=payer_id,
        amount_inr=2499.0,
        purpose="COORDINATOR_SUBSCRIPTION"
    )
    assert req.amount_inr == 2499.0

    mandate = UPIAutoPayMandate(
        mandate_id="mandate_npci_9910",
        family_id=fam_id,
        frequency="MONTHLY",
        max_amount_inr=2499.0,
        start_date=datetime(2026, 9, 1, tzinfo=timezone.utc),
        status="ACTIVE"
    )
    assert mandate.frequency == "MONTHLY"
    assert mandate.status == "ACTIVE"
