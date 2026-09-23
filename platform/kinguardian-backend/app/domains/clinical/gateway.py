from typing import Protocol, List, Optional, Dict, Any
import httpx
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger(__name__)

# Standard FHIR R4 content-type headers
FHIR_R4_ACCEPT_HEADER = "application/fhir+json; fhirVersion=4.0, application/json"
FHIR_R4_CONTENT_TYPE = "application/fhir+json; fhirVersion=4.0"


class ClinicalRecordGateway(Protocol):
    """
    Clinical Record Gateway abstraction to fetch FHIR R4 resources.
    Decouples domain logic from concrete FHIR server / GraphQL API implementations.

    Standard FHIR R4 Resource Boundaries:
    - Family subject  -> Patient (R4)
    - Doctor          -> Practitioner / PractitionerRole (R4)
    - Appointment     -> Appointment (R4)
    - Encounter       -> Encounter (R4)
    - Medication      -> MedicationRequest (R4)
    - Vital           -> Observation (R4, category=vital-signs)
    - Lab result      -> DiagnosticReport + Observation (R4, category=laboratory)
    - Condition       -> Condition (R4)
    - Document        -> DocumentReference (R4)
    - Lab/test request -> ServiceRequest (R4)
    """
    async def get_patient(self, fhir_patient_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]: ...
    async def get_practitioner(self, fhir_practitioner_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]: ...
    async def get_observations(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def get_conditions(self, fhir_patient_id: str, clinical_status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def get_medications(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def get_medication_by_id(self, fhir_medication_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]: ...
    async def get_appointments(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def get_appointment_by_id(self, fhir_appointment_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]: ...
    async def get_encounters(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...

    async def get_diagnostic_reports(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def get_document_references(self, fhir_patient_id: str, doc_type: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def get_service_requests(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]: ...
    async def record_medication_statement(self, fhir_patient_id: str, medication_name: str, dosage: str, status: str = "active", auth_token: Optional[str] = None) -> Dict[str, Any]: ...
    async def record_observation(self, fhir_patient_id: str, code: str, value: Any, unit: Optional[str] = None, category: str = "vital-signs", auth_token: Optional[str] = None) -> Dict[str, Any]: ...


from app.core.resilience.http_client import ResilientHTTPClient, TimeoutConfig, RetryPolicy
from app.core.resilience.circuit_breaker import fhir_circuit_breaker


class FHIRClinicalRecordGateway:
    """
    FHIR R4 adapter backed by bezs-emr-gql (for query projections)
    and bezs-emr-core (for FHIR R4 resource queries).
    Supports JWT Bearer authentication and resource-level permissions.
    Transforms remote FHIR R4 JSON responses into clean dicts without leaking
    FHIR server internal classes into the domain.
    Protected by Circuit Breaker to prevent thread starvation during EMR outages.
    """
    def __init__(
        self,
        emr_gql_url: Optional[str] = None,
        emr_core_url: Optional[str] = None,
        default_auth_token: Optional[str] = None,
        timeout: float = 5.0
    ):
        self.emr_gql_url = (emr_gql_url or settings.EMR_GQL_URL).rstrip("/")
        self.emr_core_url = (emr_core_url or settings.EMR_CORE_URL).rstrip("/")
        self.default_auth_token = default_auth_token
        self.timeout = timeout
        self.timeout_config = TimeoutConfig(
            connect=2.0,
            read=min(timeout, 4.0),
            write=3.0,
            pool=1.5,
            total=timeout
        )

        self.retry_policy = RetryPolicy(max_retries=3, base_backoff_seconds=0.2)
        self.client = ResilientHTTPClient(
            service_name="FHIRClinicalGateway",
            timeout_config=self.timeout_config,
            retry_policy=self.retry_policy
        )

    def _get_headers(self, auth_token: Optional[str] = None) -> Dict[str, str]:
        token = auth_token or self.default_auth_token
        headers = {
            "Accept": FHIR_R4_ACCEPT_HEADER,
            "Content-Type": FHIR_R4_CONTENT_TYPE,
            "X-FHIR-Version": "4.0.1"
        }
        if token:
            headers["Authorization"] = f"Bearer {token}"
        return headers

    async def get_patient(self, fhir_patient_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        async def _do_fetch():
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/patients/{fhir_patient_id}",
                headers=headers
            )
            if response.status_code == 200:
                return response.json().get("data")
            if response.status_code == 404:
                return None
            raise RuntimeError(f"FHIR returned {response.status_code}")

        try:
            return await fhir_circuit_breaker.call(_do_fetch)
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_patient({fhir_patient_id}) failed: {e}")
            return None

    async def get_practitioner(self, fhir_practitioner_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        async def _do_fetch():
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/practitioners/{fhir_practitioner_id}",
                headers=headers
            )
            if response.status_code == 200:
                return response.json().get("data")
            if response.status_code == 404:
                return None
            raise RuntimeError(f"FHIR returned {response.status_code}")

        try:
            return await fhir_circuit_breaker.call(_do_fetch)
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_practitioner({fhir_practitioner_id}) failed: {e}")
            return None


    async def get_observations(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if category:
            params["category"] = category

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/observations",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_observations({fhir_patient_id}) failed: {e}")
        return []

    async def get_conditions(self, fhir_patient_id: str, clinical_status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if clinical_status:
            params["clinical_status"] = clinical_status

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/conditions",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_conditions({fhir_patient_id}) failed: {e}")
        return []

    async def get_medications(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if status:
            params["status"] = status

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/medication-requests",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_medications({fhir_patient_id}) failed: {e}")
        return []

    async def get_medication_by_id(self, fhir_medication_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/medication-requests/{fhir_medication_id}",
                headers=headers
            )
            if response.status_code == 200:
                return response.json().get("data")
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_medication_by_id({fhir_medication_id}) failed: {e}")
        return None

    async def get_appointments(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if status:
            params["status"] = status

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/appointments",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_appointments({fhir_patient_id}) failed: {e}")
        return []

    async def get_appointment_by_id(self, fhir_appointment_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/appointments/{fhir_appointment_id}",
                headers=headers
            )
            if response.status_code == 200:
                return response.json().get("data")
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_appointment_by_id({fhir_appointment_id}) failed: {e}")
        return None

    async def get_encounters(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if status:
            params["status"] = status

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/encounters",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_encounters({fhir_patient_id}) failed: {e}")
        return []

    async def get_diagnostic_reports(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if category:
            params["category"] = category

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/diagnostic-reports",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_diagnostic_reports({fhir_patient_id}) failed: {e}")
        return []

    async def get_document_references(self, fhir_patient_id: str, doc_type: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if doc_type:
            params["type"] = doc_type

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/document-references",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_document_references({fhir_patient_id}) failed: {e}")
        return []

    async def get_service_requests(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        headers = self._get_headers(auth_token)
        params = {"patient": fhir_patient_id}
        if status:
            params["status"] = status

        try:
            response = await self.client.execute_request(
                method="GET",
                url=f"{self.emr_gql_url}/service-requests",
                params=params,
                headers=headers
            )
            if response.status_code == 200:
                data = response.json()
                return data.get("data", [])
        except Exception as e:
            logger.warning(f"FHIR R4 Gateway: get_service_requests({fhir_patient_id}) failed: {e}")
        return []




class MockClinicalRecordGateway:
    """
    In-memory / mock implementation of ClinicalRecordGateway for unit testing and local development.
    """
    def __init__(self):
        self.patients: Dict[str, Dict[str, Any]] = {}
        self.practitioners: Dict[str, Dict[str, Any]] = {}
        self.observations: Dict[str, List[Dict[str, Any]]] = {}
        self.conditions: Dict[str, List[Dict[str, Any]]] = {}
        self.medications: Dict[str, List[Dict[str, Any]]] = {}
        self.appointments: Dict[str, List[Dict[str, Any]]] = {}
        self.encounters: Dict[str, List[Dict[str, Any]]] = {}
        self.diagnostic_reports: Dict[str, List[Dict[str, Any]]] = {}
        self.document_references: Dict[str, List[Dict[str, Any]]] = {}
        self.service_requests: Dict[str, List[Dict[str, Any]]] = {}

    async def get_patient(self, fhir_patient_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self.patients.get(fhir_patient_id, {
            "id": fhir_patient_id,
            "resourceType": "Patient",
            "name": [{"text": "Mock Patient"}]
        })

    async def get_practitioner(self, fhir_practitioner_id: str, auth_token: Optional[str] = None) -> Optional[Dict[str, Any]]:
        return self.practitioners.get(fhir_practitioner_id, {
            "id": fhir_practitioner_id,
            "resourceType": "Practitioner",
            "name": [{"text": "Dr. Sharma"}],
            "role": "Cardiologist"
        })

    async def get_observations(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        obs_list = self.observations.get(fhir_patient_id, [
            {
                "id": "obs-bp-1",
                "code": {"text": "Blood Pressure"},
                "value_quantity": {"value": 120, "unit": "mmHg"},
                "effective_date_time": "2026-08-23T07:00:00Z"
            }
        ])
        if category:
            return [o for o in obs_list if o.get("category") == category or "category" not in o]
        return obs_list

    async def get_conditions(self, fhir_patient_id: str, clinical_status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.conditions.get(fhir_patient_id, [
            {
                "id": "cond-htn-1",
                "code": {"text": "Essential Hypertension"},
                "clinical_status": clinical_status or "active"
            }
        ])

    async def get_medications(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.medications.get(fhir_patient_id, [
            {
                "medication_request_id": "med-req-1",
                "medication_name": "Amlodipine 5mg",
                "status": status or "active",
                "dosage_instruction": "Once daily with water",
                "authored_on": "2026-08-01T00:00:00Z",
                "requester_name": "Dr. Sharma"
            }
        ])

    async def get_appointments(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.appointments.get(fhir_patient_id, [
            {
                "appointment_id": "appt-1",
                "status": status or "booked",
                "start": "2026-08-25T10:00:00Z",
                "end": "2026-08-25T10:30:00Z",
                "description": "Routine Cardiology Review",
                "practitioner_name": "Dr. Sharma"
            }
        ])

    async def get_encounters(self, fhir_patient_id: str, status: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.encounters.get(fhir_patient_id, [
            {
                "id": "enc-1",
                "status": status or "finished",
                "class": "AMB",
                "type": [{"text": "Outpatient Follow-up"}],
                "period": {"start": "2026-08-15T09:00:00Z", "end": "2026-08-15T09:30:00Z"}
            }
        ])

    async def get_diagnostic_reports(self, fhir_patient_id: str, category: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.diagnostic_reports.get(fhir_patient_id, [
            {
                "id": "diag-1",
                "code": {"text": "Complete Blood Count"},
                "status": "final",
                "effective_date_time": "2026-08-20T09:00:00Z"
            }
        ])

    async def get_document_references(self, fhir_patient_id: str, doc_type: Optional[str] = None, auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.document_references.get(fhir_patient_id, [
            {
                "id": "doc-ref-1",
                "type": {"text": doc_type or "Clinical Summary"},
                "status": "current",
                "date": "2026-08-21T14:00:00Z"
            }
        ])

    async def get_service_requests(self, fhir_patient_id: str, status: Optional[str] = "active", auth_token: Optional[str] = None) -> List[Dict[str, Any]]:
        return self.service_requests.get(fhir_patient_id, [
            {
                "id": "srv-req-1",
                "code": {"text": "Lipid Profile Panel"},
                "status": status or "active",
                "authored_on": "2026-08-22T08:00:00Z",
                "requester": "Dr. Sharma"
            }
        ])

    async def record_medication_statement(self, fhir_patient_id: str, medication_name: str, dosage: str, status: str = "active", auth_token: Optional[str] = None) -> Dict[str, Any]:
        med = {
            "medication_request_id": f"med-write-{len(self.medications.get(fhir_patient_id, [])) + 1}",
            "medication_name": medication_name,
            "dosage_instruction": dosage,
            "status": status,
            "authored_on": "2026-08-24T00:00:00Z"
        }
        if fhir_patient_id not in self.medications:
            self.medications[fhir_patient_id] = []
        self.medications[fhir_patient_id].append(med)
        return med

    async def record_observation(self, fhir_patient_id: str, code: str, value: Any, unit: Optional[str] = None, category: str = "vital-signs", auth_token: Optional[str] = None) -> Dict[str, Any]:
        obs = {
            "id": f"obs-write-{len(self.observations.get(fhir_patient_id, [])) + 1}",
            "category": category,
            "code": {"text": code},
            "value_quantity": {"value": value, "unit": unit or ""},
            "effective_date_time": "2026-08-24T00:00:00Z"
        }
        if fhir_patient_id not in self.observations:
            self.observations[fhir_patient_id] = []
        self.observations[fhir_patient_id].append(obs)
        return obs



