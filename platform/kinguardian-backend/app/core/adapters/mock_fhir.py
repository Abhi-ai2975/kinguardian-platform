"""
MockFHIRGateway - Development & Testing Adapter Fallback for FHIR R4 Services.
Provides synthetic clinical records (Patient, Practitioner, Observations, Conditions,
Medications, Appointments, Encounters, DiagnosticReports) without requiring EMR backend.
"""

import uuid
from typing import Dict, Any, List, Optional
from datetime import datetime, timezone, timedelta


class MockFHIRGateway:
    """
    In-memory Mock FHIR R4 Gateway.
    Allows local development and end-to-end integration testing
    without running bezs-emr-gql or bezs-emr-core.
    """

    def __init__(self):
        self._patients: Dict[str, Dict[str, Any]] = {}
        self._practitioners: Dict[str, Dict[str, Any]] = {}
        self._observations: Dict[str, List[Dict[str, Any]]] = {}
        self._conditions: Dict[str, List[Dict[str, Any]]] = {}
        self._medications: Dict[str, List[Dict[str, Any]]] = {}
        self._appointments: Dict[str, List[Dict[str, Any]]] = {}
        self._encounters: Dict[str, List[Dict[str, Any]]] = {}
        self._diagnostic_reports: Dict[str, List[Dict[str, Any]]] = {}
        self._service_requests: Dict[str, List[Dict[str, Any]]] = {}
        self._document_references: Dict[str, List[Dict[str, Any]]] = {}

        self._seed_default_synthetic_data()

    def _seed_default_synthetic_data(self):
        """Populates realistic synthetic FHIR resources for local dev."""
        # Patient Ramesh
        self.register_patient({
            "id": "synthetic-pat-ramesh-001",
            "resourceType": "Patient",
            "name": [{"use": "official", "family": "Sharma", "given": ["Ramesh"]}],
            "gender": "male",
            "birthDate": "1954-06-15",
            "address": [{"city": "Chennai", "country": "IN"}]
        })

        # Patient Lakshmi
        self.register_patient({
            "id": "synthetic-pat-lakshmi-002",
            "resourceType": "Patient",
            "name": [{"use": "official", "family": "Sharma", "given": ["Lakshmi"]}],
            "gender": "female",
            "birthDate": "1958-09-22",
            "address": [{"city": "Chennai", "country": "IN"}]
        })

        # Practitioner Dr. Rao
        self.register_practitioner({
            "id": "synthetic-doc-rao-001",
            "resourceType": "Practitioner",
            "name": [{"use": "official", "family": "Rao", "given": ["Karthik"]}],
            "qualification": [{"code": {"text": "Cardiologist"}}]
        })

        # Observations for Ramesh (Blood Pressure & Sleep)
        now = datetime.now(timezone.utc)
        for i in range(14):
            dt = (now - timedelta(days=13 - i)).isoformat()
            self.add_observation("synthetic-pat-ramesh-001", {
                "id": f"obs-bp-{i}",
                "resourceType": "Observation",
                "status": "final",
                "category": [{"coding": [{"code": "vital-signs"}]}],
                "code": {"coding": [{"code": "85354-9", "display": "Blood Pressure"}]},
                "effectiveDateTime": dt,
                "component": [
                    {"code": {"coding": [{"code": "8480-6", "display": "Systolic"}]}, "valueQuantity": {"value": 122 + (i % 5), "unit": "mmHg"}},
                    {"code": {"coding": [{"code": "8462-4", "display": "Diastolic"}]}, "valueQuantity": {"value": 78 + (i % 4), "unit": "mmHg"}}
                ]
            })
            self.add_observation("synthetic-pat-ramesh-001", {
                "id": f"obs-sleep-{i}",
                "resourceType": "Observation",
                "status": "final",
                "category": [{"coding": [{"code": "vital-signs"}]}],
                "code": {"coding": [{"code": "93832-4", "display": "Sleep Duration"}]},
                "effectiveDateTime": dt,
                "valueQuantity": {"value": 7.2 + (i % 3) * 0.2, "unit": "hours"}
            })

        # Medications
        self.add_medication("synthetic-pat-ramesh-001", {
            "id": "synthetic-med-req-001",
            "resourceType": "MedicationRequest",
            "status": "active",
            "intent": "order",
            "medicationCodeableConcept": {"text": "Synthetic Metformin 500mg"},
            "dosageInstruction": [{"text": "Take 1 tablet daily with breakfast"}]
        })

        self.add_medication("synthetic-pat-lakshmi-002", {
            "id": "synthetic-med-req-002",
            "resourceType": "MedicationRequest",
            "status": "active",
            "intent": "order",
            "medicationCodeableConcept": {"text": "Synthetic Amlodipine 5mg"},
            "dosageInstruction": [{"text": "Take 1 tablet every morning"}]
        })

        # Appointments
        self.add_appointment("synthetic-pat-ramesh-001", {
            "id": "synthetic-appt-cardio-001",
            "resourceType": "Appointment",
            "status": "booked",
            "start": (now + timedelta(days=3)).isoformat(),
            "description": "Cardiology Routine Follow-up",
            "participant": [{"actor": {"reference": "Practitioner/synthetic-doc-rao-001"}}]
        })

    def register_patient(self, patient_dict: Dict[str, Any]):
        self._patients[patient_dict["id"]] = patient_dict

    def register_practitioner(self, doc_dict: Dict[str, Any]):
        self._practitioners[doc_dict["id"]] = doc_dict

    def add_observation(self, patient_id: str, obs_dict: Dict[str, Any]):
        self._observations.setdefault(patient_id, []).append(obs_dict)

    def add_medication(self, patient_id: str, med_dict: Dict[str, Any]):
        self._medications.setdefault(patient_id, []).append(med_dict)

    def add_appointment(self, patient_id: str, appt_dict: Dict[str, Any]):
        self._appointments.setdefault(patient_id, []).append(appt_dict)

    # ClinicalRecordGateway Protocol Implementation

    async def get_patient(self, fhir_patient_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self._patients.get(fhir_patient_id)

    async def get_practitioner(self, fhir_practitioner_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self._practitioners.get(fhir_practitioner_id)

    async def get_observations(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        obs_list = self._observations.get(fhir_patient_id, [])
        if not category:
            return obs_list
        return [
            o for o in obs_list
            if any(c.get("code") == category for cat in o.get("category", []) for c in cat.get("coding", []))
        ]

    async def get_conditions(self, fhir_patient_id: str, clinical_status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._conditions.get(fhir_patient_id, [])

    async def get_medications(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        meds = self._medications.get(fhir_patient_id, [])
        if not status:
            return meds
        return [m for m in meds if m.get("status") == status]

    async def get_medication_by_id(self, fhir_medication_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        for meds in self._medications.values():
            for m in meds:
                if m.get("id") == fhir_medication_id:
                    return m
        return None

    async def get_appointments(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        appts = self._appointments.get(fhir_patient_id, [])
        if not status:
            return appts
        return [a for a in appts if a.get("status") == status]

    async def get_appointment_by_id(self, fhir_appointment_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        for appts in self._appointments.values():
            for a in appts:
                if a.get("id") == fhir_appointment_id:
                    return a
        return None

    async def get_encounters(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._encounters.get(fhir_patient_id, [])

    async def get_diagnostic_reports(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._diagnostic_reports.get(fhir_patient_id, [])

    async def get_document_references(self, fhir_patient_id: str, doc_type: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._document_references.get(fhir_patient_id, [])

    async def get_service_requests(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self._service_requests.get(fhir_patient_id, [])
