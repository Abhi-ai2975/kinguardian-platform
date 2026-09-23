from fastapi import APIRouter

from .patient import router as patient_router
from .practitioner import router as practitioner_router
from .encounter import router as encounter_router
from .appointment import router as appointment_router
from .questionnaire_response import router as questionnaire_response_router
from .condition import router as condition_router
from .service_request import router as service_request_router
from .device_request import router as device_request_router
from .diagnostic_report import router as diagnostic_report_router
from .medication_request import router as medication_request_router
from .observation import router as observation_router
from .organization import router as organization_router
from .procedure import router as procedure_router
from .practitioner_role import router as practitioner_role_router
from .schedule import router as schedule_router
from .slot import router as slot_router
from .healthcare_service import router as healthcare_service_router
from .claim import router as claim_router
from .claim_response import router as claim_response_router
from .invoice import router as invoice_router
from .location import router as location_router
from .coverage import router as coverage_router
from .medication import router as medication_router
from .allergy_intolerance import router as allergy_intolerance_router
from .provenance import router as provenance_router
from .task import router as task_router
from .care_plan import router as care_plan_router
from .related_person import router as related_person_router
from .specimen import router as specimen_router
from .document_reference import router as document_reference_router
from .immunization import router as immunization_router
from .audit_event import router as audit_event_router
from .episode_of_care import router as episode_of_care_router
from .insurance_plan import router as insurance_plan_router
api_router = APIRouter()

api_router.include_router(patient_router, prefix="/patients", tags=["Patients"])

api_router.include_router(
    practitioner_router, prefix="/practitioners", tags=["Practitioners"]
)

api_router.include_router(encounter_router, prefix="/encounters", tags=["Encounters"])

api_router.include_router(
    appointment_router, prefix="/appointments", tags=["Appointments"]
)

api_router.include_router(
    questionnaire_response_router,
    prefix="/questionnaire-responses",
    tags=["QuestionnaireResponses"],
)

api_router.include_router(condition_router, prefix="/conditions", tags=["Conditions"])

api_router.include_router(
    service_request_router, prefix="/service-requests", tags=["ServiceRequests"]
)

api_router.include_router(
    device_request_router, prefix="/device-requests", tags=["DeviceRequests"]
)

api_router.include_router(
    diagnostic_report_router, prefix="/diagnostic-reports", tags=["DiagnosticReports"]
)

api_router.include_router(
    medication_request_router, prefix="/medication-requests", tags=["MedicationRequests"]
)

api_router.include_router(
    observation_router, prefix="/observations", tags=["Observations"]
)

api_router.include_router(
    organization_router, prefix="/organizations", tags=["Organizations"]
)

api_router.include_router(
    procedure_router, prefix="/procedures", tags=["Procedures"]
)

api_router.include_router(
    practitioner_role_router, prefix="/practitioner-roles", tags=["PractitionerRoles"]
)

api_router.include_router(
    schedule_router, prefix="/schedules", tags=["Schedules"]
)

api_router.include_router(
    slot_router, prefix="/slots", tags=["Slots"]
)

api_router.include_router(
    healthcare_service_router, prefix="/healthcare-services", tags=["HealthcareServices"]
)

api_router.include_router(claim_router, prefix="/claims", tags=["Claims"])

api_router.include_router(
    claim_response_router, prefix="/claim-responses", tags=["ClaimResponses"]
)

api_router.include_router(invoice_router, prefix="/invoices", tags=["Invoices"])

api_router.include_router(location_router, prefix="/locations", tags=["Locations"])

api_router.include_router(coverage_router, prefix="/coverages", tags=["Coverages"])

api_router.include_router(medication_router, prefix="/medications", tags=["Medications"])

api_router.include_router(
    allergy_intolerance_router, prefix="/allergy-intolerances", tags=["AllergyIntolerances"]
)

api_router.include_router(provenance_router, prefix="/provenances", tags=["Provenances"])

api_router.include_router(task_router, prefix="/tasks", tags=["Tasks"])
api_router.include_router(care_plan_router, prefix="/care-plans", tags=["CarePlans"])
api_router.include_router(related_person_router, prefix="/related-persons", tags=["RelatedPersons"])
api_router.include_router(specimen_router, prefix="/specimens", tags=["Specimens"])
api_router.include_router(document_reference_router, prefix="/document-references", tags=["DocumentReferences"])
api_router.include_router(immunization_router, prefix="/immunizations", tags=["Immunizations"])
api_router.include_router(audit_event_router, prefix="/audit-events", tags=["AuditEvents"])
api_router.include_router(episode_of_care_router, prefix="/episode-of-cares", tags=["EpisodeOfCares"])
api_router.include_router(insurance_plan_router, prefix="/insurance-plans", tags=["InsurancePlans"])
