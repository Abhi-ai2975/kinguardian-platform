OPENAPI_TAGS: list[dict] = [
    # ── Clinical ──────────────────────────────────────────────────────────────
    {
        "name": "Patients",
        "description": (
            "FHIR R4 Patient resources — individuals receiving care. "
            "Stores demographics, identifiers, contacts, and communication preferences."
        ),
    },
    {
        "name": "Encounters",
        "description": (
            "FHIR R4 Encounter resources — clinical interactions between patients and providers "
            "(office visits, hospital admissions, telehealth). Links to practitioners, locations, "
            "and diagnoses."
        ),
    },
    {
        "name": "Conditions",
        "description": (
            "FHIR R4 Condition resources — clinical diagnoses, problems, and health concerns "
            "associated with a patient. Supports clinical status, verification status, severity, "
            "and onset/abatement dates."
        ),
    },
    {
        "name": "Observations",
        "description": (
            "FHIR R4 Observation resources — measurements and clinical findings such as vital signs, "
            "lab results, imaging results, and clinical assessments. Supports coded values, "
            "quantities, and component observations."
        ),
    },
    {
        "name": "Procedures",
        "description": (
            "FHIR R4 Procedure resources — clinical actions performed on or for a patient, "
            "including surgical procedures, diagnostic procedures, and therapeutic interventions."
        ),
    },
    {
        "name": "DiagnosticReports",
        "description": (
            "FHIR R4 DiagnosticReport resources — findings and interpretation of diagnostic tests "
            "including laboratory, pathology, radiology, and cardiology reports. Links to "
            "Observations and Specimens."
        ),
    },
    {
        "name": "AllergyIntolerances",
        "description": (
            "FHIR R4 AllergyIntolerance resources — risk of harmful or undesirable physiological "
            "responses to a substance. Captures substance, reaction, criticality, and clinical status."
        ),
    },
    {
        "name": "Immunizations",
        "description": (
            "FHIR R4 Immunization resources — administration of a vaccine or immunological product "
            "to a patient. Records vaccine code, lot number, site, route, and performer."
        ),
    },
    {
        "name": "Specimens",
        "description": (
            "FHIR R4 Specimen resources — biological material collected from a patient for "
            "laboratory analysis. Captures collection method, body site, container, and processing."
        ),
    },
    # ── Medications ───────────────────────────────────────────────────────────
    {
        "name": "Medications",
        "description": (
            "FHIR R4 Medication resources — drug definitions including code, form, ingredients, "
            "and manufacturer. Referenced by MedicationRequest and MedicationAdministration."
        ),
    },
    {
        "name": "MedicationRequests",
        "description": (
            "FHIR R4 MedicationRequest resources — prescriptions and medication orders for patients. "
            "Captures drug, dose, route, frequency, prescriber, and dispense instructions."
        ),
    },
    # ── Scheduling ────────────────────────────────────────────────────────────
    {
        "name": "Appointments",
        "description": (
            "FHIR R4 Appointment resources — scheduled healthcare events between patients and "
            "practitioners at a specific date and time. Manages booking, cancellation, and rescheduling."
        ),
    },
    {
        "name": "Schedules",
        "description": (
            "FHIR R4 Schedule resources — availability windows for practitioners, locations, or "
            "devices. Acts as a container for Slots."
        ),
    },
    {
        "name": "Slots",
        "description": (
            "FHIR R4 Slot resources — individual time blocks within a Schedule that can be booked "
            "for an Appointment. Tracks free/busy status."
        ),
    },
    # ── Practitioners & Organizations ─────────────────────────────────────────
    {
        "name": "Practitioners",
        "description": (
            "FHIR R4 Practitioner resources — licensed healthcare providers including physicians, "
            "nurses, pharmacists, and therapists. Stores qualifications, identifiers, and contact info."
        ),
    },
    {
        "name": "PractitionerRoles",
        "description": (
            "FHIR R4 PractitionerRole resources — the role a practitioner performs at an organization "
            "or location. Links specialty, available times, and telecom to a specific context."
        ),
    },
    {
        "name": "Organizations",
        "description": (
            "FHIR R4 Organization resources — formally or informally recognized groups of people "
            "including hospitals, clinics, insurance companies, and departments."
        ),
    },
    {
        "name": "HealthcareServices",
        "description": (
            "FHIR R4 HealthcareService resources — services offered by an organization at a location, "
            "such as cardiology consultations, lab tests, or mental health programs."
        ),
    },
    {
        "name": "Locations",
        "description": (
            "FHIR R4 Location resources — physical places where services are provided, including "
            "hospitals, clinics, wards, rooms, and vehicles. Stores address, coordinates, and mode."
        ),
    },
    {
        "name": "RelatedPersons",
        "description": (
            "FHIR R4 RelatedPerson resources — individuals with a personal or non-healthcare "
            "professional relationship to a patient, such as a spouse, guardian, or emergency contact."
        ),
    },
    # ── Care Management ───────────────────────────────────────────────────────
    {
        "name": "CarePlans",
        "description": (
            "FHIR R4 CarePlan resources — descriptions of planned and ongoing care for a patient. "
            "Captures goals, activities, and the care team involved."
        ),
    },
    {
        "name": "EpisodeOfCares",
        "description": (
            "FHIR R4 EpisodeOfCare resources — an association between a patient and an organization "
            "over a period of time for a set of healthcare-related purposes (e.g. a chronic disease "
            "management program)."
        ),
    },
    {
        "name": "ServiceRequests",
        "description": (
            "FHIR R4 ServiceRequest resources — orders or proposals for clinical actions including "
            "lab tests, imaging, referrals, procedures, and nursing interventions."
        ),
    },
    {
        "name": "DeviceRequests",
        "description": (
            "FHIR R4 DeviceRequest resources — orders for the use of a medical device by a patient, "
            "such as a wheelchair, CPAP machine, or insulin pump."
        ),
    },
    {
        "name": "Tasks",
        "description": (
            "FHIR R4 Task resources — activities to be performed as part of a workflow. Used for "
            "care coordination, tracking action items, and workflow automation."
        ),
    },
    # ── Financial ─────────────────────────────────────────────────────────────
    {
        "name": "Claims",
        "description": (
            "FHIR R4 Claim resources — requests to an insurer for reimbursement of healthcare "
            "products and services. Captures diagnosis, procedures, items, and costs."
        ),
    },
    {
        "name": "ClaimResponses",
        "description": (
            "FHIR R4 ClaimResponse resources — adjudication decisions from an insurer in response "
            "to a Claim. Returns paid amounts, adjustments, denials, and remittance advice."
        ),
    },
    {
        "name": "Coverages",
        "description": (
            "FHIR R4 Coverage resources — insurance or medical plan details for a patient including "
            "payer, plan, subscriber, and coverage period."
        ),
    },
    {
        "name": "Invoices",
        "description": (
            "FHIR R4 Invoice resources — itemized financial charges for healthcare services rendered "
            "to a patient. Links to encounters, practitioners, and line items."
        ),
    },
    # ── Documents & Provenance ────────────────────────────────────────────────
    {
        "name": "DocumentReferences",
        "description": (
            "FHIR R4 DocumentReference resources — references to clinical documents such as "
            "discharge summaries, referral letters, imaging reports, and consent forms."
        ),
    },
    {
        "name": "Provenances",
        "description": (
            "FHIR R4 Provenance resources — information about the creation, revision, and authorship "
            "of other resources. Used for audit trails and data lineage."
        ),
    },
    {
        "name": "AuditEvents",
        "description": (
            "FHIR R4 AuditEvent resources — records of security-relevant events such as login, "
            "data access, and resource modifications. Supports HIPAA audit log requirements."
        ),
    },
    # ── Forms ─────────────────────────────────────────────────────────────────
    {
        "name": "QuestionnaireResponses",
        "description": (
            "FHIR R4 QuestionnaireResponse resources — structured sets of answers to a Questionnaire. "
            "Supports nested items and all FHIR R4 answer value types (string, integer, boolean, "
            "Coding, date, etc.)."
        ),
    },
    # ── Terminology ───────────────────────────────────────────────────────────
    {
        "name": "Terminology",
        "description": (
            "Medical terminology lookup and validation — ICD-10-CM, LOINC, RxNorm, SNOMED CT, "
            "and FHIR R4 built-in code systems. Supports concept search, value set expansion, "
            "field binding validation, code translation, and org-specific custom concepts."
        ),
    },
    # ── Infrastructure ────────────────────────────────────────────────────────
    {
        "name": "Vitals",
        "description": (
            "User vitals data from wearable devices — activity, heart rate, sleep, and demographic "
            "metrics. Not a FHIR resource. Scoped to the authenticated user."
        ),
    },
    {
        "name": "Health",
        "description": (
            "Server liveness and readiness probes. No authentication required. "
            "GET /health — process alive check. GET /health/ready — DB + Redis reachability check."
        ),
    },
]
