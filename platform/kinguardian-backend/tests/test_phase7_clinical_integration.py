"""
Phase 7 — Clinical Integration Test Suite (EMR Gateway / FHIR R4).

Validates:
1. Patient reference resolution (CareSubject.fhir_patient_id -> FHIR Patient resource)
2. Observations retrieval (vitals and laboratory categories)
3. Conditions retrieval (active diagnoses / health issues)
4. Medications retrieval (MedicationRequest resources from EMR)
5. Appointments retrieval (scheduled clinical visits)
6. DiagnosticReports retrieval (imaging / lab panels)
7. DocumentReferences retrieval (clinical discharge summaries / records)
8. FHIR Anti-Duplication Rule (verifying zero duplicate FHIR storage in KinGuardian DB)
"""

import pytest
import uuid
from typing import Dict, Any

from app.domains.clinical.gateway import MockClinicalRecordGateway
from app.core.architecture.data_ownership import DATA_OWNERSHIP_CATALOG, SystemOfRecord


@pytest.fixture
def mock_emr_gateway():
    gateway = MockClinicalRecordGateway()
    # Seed mock FHIR data for patient
    pat_id = "fhir-pat-1001"
    gateway.patients[pat_id] = {
        "id": pat_id,
        "resourceType": "Patient",
        "name": [{"family": "Sharma", "given": ["Ramesh"]}],
        "gender": "male",
        "birthDate": "1958-04-12"
    }
    gateway.observations[pat_id] = [
        {
            "id": "obs-bp-1",
            "resourceType": "Observation",
            "category": "vital-signs",
            "code": {"text": "Blood Pressure"},
            "valueQuantity": {"value": 128, "unit": "mmHg"}
        },
        {
            "id": "obs-glucose-1",
            "resourceType": "Observation",
            "category": "laboratory",
            "code": {"text": "Fasting Blood Glucose"},
            "valueQuantity": {"value": 110, "unit": "mg/dL"}
        }
    ]
    gateway.conditions[pat_id] = [
        {
            "id": "cond-1",
            "resourceType": "Condition",
            "clinicalStatus": "active",
            "code": {"text": "Essential Hypertension"}
        },
        {
            "id": "cond-2",
            "resourceType": "Condition",
            "clinicalStatus": "active",
            "code": {"text": "Type 2 Diabetes Mellitus"}
        }
    ]
    gateway.medications[pat_id] = [
        {
            "id": "med-req-1",
            "resourceType": "MedicationRequest",
            "status": "active",
            "medicationCodeableConcept": {"text": "Metformin 500mg"},
            "dosageInstruction": [{"text": "Take 1 tablet twice daily with meals"}]
        }
    ]
    gateway.appointments[pat_id] = [
        {
            "id": "appt-1",
            "resourceType": "Appointment",
            "status": "booked",
            "description": "Routine Cardiology Consultation",
            "start": "2026-09-01T10:00:00Z"
        }
    ]
    gateway.diagnostic_reports[pat_id] = [
        {
            "id": "diag-1",
            "resourceType": "DiagnosticReport",
            "status": "final",
            "code": {"text": "Comprehensive Metabolic Panel (CMP)"},
            "conclusion": "Normal metabolic and renal indices."
        }
    ]
    gateway.document_references[pat_id] = [
        {
            "id": "docref-1",
            "resourceType": "DocumentReference",
            "status": "current",
            "type": {"text": "Discharge Summary"},
            "description": "Post-admission cardiology follow-up notes"
        }
    ]
    return gateway


@pytest.mark.asyncio
async def test_patient_reference_and_observations(mock_emr_gateway):
    """
    1. Patient Reference & 2. Observations:
    Verifies fetching Patient entity and vital/laboratory Observations via Clinical Record Gateway.
    """
    pat_id = "fhir-pat-1001"
    patient = await mock_emr_gateway.get_patient(pat_id)
    assert patient is not None
    assert patient["resourceType"] == "Patient"
    assert patient["name"][0]["family"] == "Sharma"

    # Fetch Observations filtered by category
    vitals = await mock_emr_gateway.get_observations(pat_id, category="vital-signs")
    assert len(vitals) == 1
    assert "Blood Pressure" in vitals[0]["code"]["text"]


@pytest.mark.asyncio
async def test_conditions_and_medications(mock_emr_gateway):
    """
    3. Conditions & 4. Medications:
    Verifies fetching Conditions (hypertension/diabetes) and MedicationRequests from EMR.
    """
    pat_id = "fhir-pat-1001"
    conditions = await mock_emr_gateway.get_conditions(pat_id)
    assert len(conditions) == 2
    assert any("Hypertension" in c["code"]["text"] for c in conditions)

    medications = await mock_emr_gateway.get_medications(pat_id)
    assert len(medications) == 1
    assert "Metformin" in medications[0]["medicationCodeableConcept"]["text"]


@pytest.mark.asyncio
async def test_appointments_diagnostic_reports_and_documents(mock_emr_gateway):
    """
    5. Appointments, 6. DiagnosticReports, and 7. DocumentReferences:
    Verifies fetching scheduled visits, lab reports, and document references.
    """
    pat_id = "fhir-pat-1001"
    appts = await mock_emr_gateway.get_appointments(pat_id)
    assert len(appts) == 1
    assert appts[0]["description"] == "Routine Cardiology Consultation"

    reports = await mock_emr_gateway.get_diagnostic_reports(pat_id)
    assert len(reports) == 1
    assert "Metabolic Panel" in reports[0]["code"]["text"]

    docs = await mock_emr_gateway.get_document_references(pat_id)
    assert len(docs) == 1
    assert docs[0]["type"]["text"] == "Discharge Summary"


def test_fhir_anti_duplication_rule():
    """
    8. Anti-Duplication Rule:
    Verifies that clinical concept schemas declare FHIR/EMR as authoritative owner
    while KinGuardian owns only metadata, pointers, and family coordination.
    """
    ownership_map = {item.domain_concept: item for item in DATA_OWNERSHIP_CATALOG}
    
    assert ownership_map["Medication Prescriptions & Dosage"].owner_system == SystemOfRecord.FHIR_EMR
    assert ownership_map["Patient Demographics & Medical Identity"].owner_system == SystemOfRecord.FHIR_EMR
    assert ownership_map["Medication Adherence Tracking"].owner_system == SystemOfRecord.KINGUARDIAN
    assert ownership_map["Parent & Care Circle Relationships"].owner_system == SystemOfRecord.KINGUARDIAN
    assert ownership_map["AI Conversational Session & Reasoning Context"].owner_system == SystemOfRecord.BEZS_AGENT
    assert ownership_map["File Binary Storage (PDF, Images, DICOM)"].owner_system == SystemOfRecord.FILENEST

