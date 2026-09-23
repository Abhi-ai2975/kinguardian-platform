# Outpatient Visit — End-to-End FHIR R4 Scenario

This document traces a complete outpatient clinic visit from system setup through billing and audit. Resources are ordered by dependency (create prerequisites first). Resources marked **[NOT IMPLEMENTED]** are required for the scenario but not yet in this server — add them when ready.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented in this server |
| ❌ | Not yet implemented — add later |
| `→ ref` | This resource references another resource |

---

## Phase 0 — System / Tenant Setup (one-time, done by admin)

These are the building blocks every clinical resource depends on. Create these before any patient data.

### 0.1 Organization ✅

The clinic or hospital providing care.

```json
POST /organizations
{
  "name": "Green Valley Outpatient Clinic",
  "alias": ["GVOC"],
  "type": "prov",
  "active": true,
  "phone": "555-100-2000",
  "email": "admin@greenvalley.org",
  "address_line": "100 Health Blvd",
  "city": "Springfield",
  "state": "IL",
  "postal_code": "62701",
  "country": "US"
}
```

> Produces `organization_id: 190001`. All subsequent resources carry `org_id` from the JWT pointing to this organization's tenant.

---

### 0.2 Location ✅

Physical place where the clinic operates (rooms, buildings, floors).

```json
POST /locations
{
  "name": "GVOC — Main Clinic, Floor 2",
  "status": "active",
  "mode": "instance",
  "type": "OUTPHARM",
  "address_line": "100 Health Blvd, Floor 2",
  "city": "Springfield",
  "state": "IL",
  "postal_code": "62701",
  "managing_organization_id": 190001   // → Organization
}
```

> Produces `location_id: 230001`.

---

### 0.3 Practitioner ✅

The clinician who will see patients.

```json
POST /practitioners
{
  "active": true,
  "family_name": "Patel",
  "given_name": "Anita",
  "prefix": "Dr.",
  "gender": "female",
  "birth_date": "1978-03-15",
  "qualification_code": "MD",
  "qualification_system": "http://terminology.hl7.org/CodeSystem/v2-0360",
  "phone": "555-100-3000",
  "email": "anita.patel@greenvalley.org"
}
```

> Produces `practitioner_id: 30001`.

---

### 0.4 PractitionerRole ✅

Links the practitioner to the organization with specialty and availability context.

```json
POST /practitioner-roles
{
  "active": true,
  "practitioner_id": 30001,            // → Practitioner
  "organization_id": 190001,           // → Organization
  "location_id": 230001,               // → Location
  "specialty_code": "394814009",
  "specialty_system": "http://snomed.info/sct",
  "specialty_display": "General practice",
  "role_code": "doctor",
  "role_system": "http://terminology.hl7.org/CodeSystem/practitioner-role"
}
```

> Produces `practitioner_role_id: 140001`.

---

### 0.5 HealthcareService ✅

Describes what services the clinic offers (used for appointment booking).

```json
POST /healthcare-services
{
  "active": true,
  "name": "General Outpatient Consultation",
  "provided_by_id": 190001,            // → Organization
  "location_id": 230001,               // → Location
  "category_code": "outpatient",
  "category_system": "http://terminology.hl7.org/CodeSystem/service-category",
  "type_code": "11429006",
  "type_system": "http://snomed.info/sct",
  "type_display": "Consultation",
  "comment": "Walk-in and scheduled outpatient consultations"
}
```

> Produces `healthcare_service_id: 150001`.

---

### 0.6 Medication ✅

Pre-populate the clinic's formulary. Create one entry per drug used in the scenario.

```json
POST /medications
{
  "code": "313782",
  "code_system": "http://www.nlm.nih.gov/research/umls/rxnorm",
  "display": "Amoxicillin 500 MG Oral Capsule",
  "status": "active",
  "form_code": "capsule",
  "form_system": "http://snomed.info/sct",
  "manufacturer_id": null
}
```

> Produces `medication_id: 250001`.

---

### 0.7 Schedule ✅

The practitioner's weekly availability template.

```json
POST /schedules
{
  "active": true,
  "practitioner_id": 30001,            // → Practitioner
  "service_type_code": "11429006",
  "service_type_system": "http://snomed.info/sct",
  "planning_horizon_start": "2026-06-02T08:00:00Z",
  "planning_horizon_end": "2026-06-30T17:00:00Z",
  "comment": "Dr. Patel — Mon-Fri 08:00-17:00"
}
```

> Produces `schedule_id: 200001`.

---

### 0.8 Slot ✅

Individual bookable time windows derived from the schedule.

```json
POST /slots
{
  "schedule_id": 200001,               // → Schedule
  "status": "free",
  "service_type_code": "11429006",
  "service_type_system": "http://snomed.info/sct",
  "start": "2026-06-10T09:00:00Z",
  "end":   "2026-06-10T09:30:00Z"
}
```

> Produces `slot_id: 220001`.

---

## Phase 1 — Patient Registration

### 1.1 Patient ✅

The person receiving care.

```json
POST /patients
{
  "active": true,
  "family_name": "Johnson",
  "given_name": "Marcus",
  "gender": "male",
  "birth_date": "1985-07-22",
  "phone": "555-200-4000",
  "email": "marcus.j@email.com",
  "address_line": "42 Elm Street",
  "city": "Springfield",
  "state": "IL",
  "postal_code": "62702",
  "marital_status": "married",
  "language": "en"
}
```

> Produces `patient_id: 10001`.

---

### 1.2 RelatedPerson ✅ *(optional — for minor or emergency contact)*

A family member or legal guardian linked to the patient.

```json
POST /related-persons
{
  "patient_id": 10001,                 // → Patient
  "active": true,
  "relationship_code": "SPS",
  "relationship_system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
  "relationship_display": "Spouse",
  "family_name": "Johnson",
  "given_name": "Clara",
  "gender": "female",
  "phone": "555-200-4001"
}
```

> Produces `related_person_id: 300001`.

---

### 1.3 Coverage ✅

Patient's insurance policy (links patient → insurer organization).

```json
POST /coverages
{
  "status": "active",
  "subscriber_id": "INS-MJ-98765",
  "patient_id": 10001,                 // → Patient (beneficiary)
  "payor_id": 190001,                  // → Organization (insurer)
  "plan_name": "BlueShield PPO Gold",
  "class_type": "plan",
  "period_start": "2026-01-01",
  "period_end": "2026-12-31",
  "order": 1,
  "network": "in-network"
}
```

> Produces `coverage_id: 240001`.

---

## Phase 2 — Appointment Booking

### 2.1 Appointment ✅

Patient books a slot with the practitioner.

```json
POST /appointments
{
  "status": "booked",
  "patient_id": 10001,                 // → Patient
  "practitioner_id": 30001,            // → Practitioner
  "slot_id": 220001,                   // → Slot
  "healthcare_service_id": 150001,     // → HealthcareService
  "location_id": 230001,               // → Location
  "start": "2026-06-10T09:00:00Z",
  "end":   "2026-06-10T09:30:00Z",
  "service_type_code": "11429006",
  "service_type_system": "http://snomed.info/sct",
  "reason_code": "General checkup",
  "comment": "Follow-up on persistent cough"
}
```

> Produces `appointment_id: 40001`. Update the slot status to `busy`.

---

## Phase 3 — Patient Arrives / Encounter Opens

### 3.1 EpisodeOfCare ✅ *(optional — for chronic/long-term tracking)*

Groups multiple encounters under a single care episode (e.g., diabetes management).

```json
POST /episode-of-cares
{
  "status": "active",
  "patient_id": 10001,                 // → Patient
  "organization_id": 190001,           // → Organization
  "type_code": "CAREMGT",
  "type_system": "http://terminology.hl7.org/CodeSystem/episodeofcare-type",
  "period_start": "2026-06-10",
  "diagnosis_condition_id": null       // set after Condition is created
}
```

> Produces `episode_of_care_id: 350001`.

---

### 3.2 Encounter ✅

The actual clinical visit. This is the central resource — almost every clinical record references it.

```json
POST /encounters
{
  "status": "in-progress",
  "class_code": "AMB",
  "class_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  "class_display": "ambulatory",
  "patient_id": 10001,                 // → Patient
  "practitioner_id": 30001,            // → Practitioner
  "appointment_id": 40001,             // → Appointment
  "location_id": 230001,               // → Location
  "organization_id": 190001,           // → Organization
  "episode_of_care_id": 350001,        // → EpisodeOfCare
  "period_start": "2026-06-10T09:05:00Z",
  "reason_code": "11429006",
  "reason_system": "http://snomed.info/sct",
  "reason_display": "Consultation",
  "service_type_code": "394814009",
  "service_type_system": "http://snomed.info/sct"
}
```

> Produces `encounter_id: 20001`.

---

## Phase 4 — Clinical Assessment (in-room)

### 4.1 QuestionnaireResponse ✅

Patient intake form completed before or during the visit.

```json
POST /questionnaire-responses
{
  "status": "completed",
  "patient_id": 10001,                 // → Patient
  "encounter_id": 20001,               // → Encounter
  "authored": "2026-06-10T09:08:00Z",
  "questionnaire": "http://greenvalley.org/fhir/Questionnaire/intake-v1",
  "items": [
    {
      "link_id": "1",
      "text": "Chief complaint",
      "answer": "Persistent cough for 2 weeks"
    },
    {
      "link_id": "2",
      "text": "Current medications",
      "answer": "None"
    }
  ]
}
```

---

### 4.2 AllergyIntolerance ✅

Documented allergies and adverse reactions.

```json
POST /allergy-intolerances
{
  "patient_id": 10001,                 // → Patient
  "encounter_id": 20001,              // → Encounter
  "clinical_status": "active",
  "verification_status": "confirmed",
  "type": "allergy",
  "category": "medication",
  "criticality": "high",
  "code": "372687004",
  "code_system": "http://snomed.info/sct",
  "code_display": "Penicillin",
  "onset_date": "2010-01-01",
  "reaction_substance": "Penicillin",
  "reaction_manifestation": "Anaphylaxis",
  "reaction_severity": "severe"
}
```

> Produces `allergy_intolerance_id: 260001`.

---

### 4.3 Vitals (Observation) ✅

Vital signs recorded by nurse before physician sees patient.

```json
POST /vitals
{
  "patient_id": 10001,                 // → Patient
  "encounter_id": 20001,              // → Encounter
  "practitioner_id": 30001,            // → Practitioner
  "effective_date_time": "2026-06-10T09:10:00Z",
  "height_cm": 178.0,
  "weight_kg": 82.5,
  "systolic_bp": 128,
  "diastolic_bp": 82,
  "heart_rate": 76,
  "respiratory_rate": 16,
  "temperature_celsius": 37.1,
  "oxygen_saturation": 98.5
}
```

---

### 4.4 Observation ✅ *(clinical findings)*

Any structured clinical observation beyond vitals (e.g., cough duration assessment).

```json
POST /observations
{
  "status": "final",
  "patient_id": 10001,
  "encounter_id": 20001,
  "practitioner_id": 30001,
  "code": "84229001",
  "code_system": "http://snomed.info/sct",
  "code_display": "Fatigue",
  "value_string": "Patient reports fatigue for 2 weeks alongside cough",
  "effective_date_time": "2026-06-10T09:12:00Z",
  "category_code": "exam",
  "category_system": "http://terminology.hl7.org/CodeSystem/observation-category"
}
```

---

### 4.5 Condition ✅

Diagnosis established during the encounter.

```json
POST /conditions
{
  "patient_id": 10001,                 // → Patient
  "encounter_id": 20001,              // → Encounter
  "practitioner_id": 30001,            // → Practitioner
  "clinical_status": "active",
  "verification_status": "confirmed",
  "category_code": "encounter-diagnosis",
  "category_system": "http://terminology.hl7.org/CodeSystem/condition-category",
  "code": "195967001",
  "code_system": "http://snomed.info/sct",
  "code_display": "Asthma",
  "severity_code": "255604002",
  "severity_system": "http://snomed.info/sct",
  "severity_display": "Mild",
  "onset_date": "2026-05-27",
  "recorded_date": "2026-06-10"
}
```

> Produces `condition_id: 120001`. Update `EpisodeOfCare.diagnosis_condition_id` with this ID.

---

## Phase 5 — Orders

### 5.1 ServiceRequest ✅ *(lab / imaging / referral orders)*

Physician orders a chest X-ray and spirometry.

```json
POST /service-requests
{
  "status": "active",
  "intent": "order",
  "patient_id": 10001,
  "encounter_id": 20001,
  "requester_id": 30001,               // → Practitioner
  "code": "399208008",
  "code_system": "http://snomed.info/sct",
  "code_display": "Spirometry",
  "category_code": "108252007",
  "category_system": "http://snomed.info/sct",
  "category_display": "Laboratory procedure",
  "priority": "routine",
  "authored_on": "2026-06-10T09:20:00Z",
  "reason_reference_id": 120001        // → Condition
}
```

> Produces `service_request_id: 80001`.

---

### 5.2 DeviceRequest ✅ *(medical device orders — e.g., peak flow meter)*

```json
POST /device-requests
{
  "status": "active",
  "intent": "order",
  "patient_id": 10001,
  "encounter_id": 20001,
  "requester_id": 30001,
  "device_code": "468687009",
  "device_code_system": "http://snomed.info/sct",
  "device_code_display": "Peak flow meter",
  "authored_on": "2026-06-10T09:22:00Z",
  "reason_reference_id": 120001
}
```

---

### 5.3 MedicationRequest ✅ *(prescription)*

Physician prescribes Amoxicillin (note: patient is allergic to Penicillin — in practice a CDS alert fires here; this is a scenario illustration).

```json
POST /medication-requests
{
  "status": "active",
  "intent": "order",
  "patient_id": 10001,
  "encounter_id": 20001,
  "requester_id": 30001,
  "medication_id": 250001,             // → Medication
  "reason_reference_id": 120001,       // → Condition
  "dosage_instruction": "500 mg orally every 8 hours for 7 days",
  "route_code": "26643006",
  "route_system": "http://snomed.info/sct",
  "route_display": "Oral route",
  "authored_on": "2026-06-10T09:25:00Z",
  "dispense_quantity": 21,
  "dispense_unit": "capsule",
  "number_of_repeats_allowed": 0
}
```

> Produces `medication_request_id: 90001`.

---

### 5.4 Immunization ✅ *(vaccines given during visit)*

Flu vaccine administered at the end of the visit.

```json
POST /immunizations
{
  "status": "completed",
  "patient_id": 10001,
  "encounter_id": 20001,
  "practitioner_id": 30001,
  "vaccine_code": "140",
  "vaccine_code_system": "http://hl7.org/fhir/sid/cvx",
  "vaccine_code_display": "Influenza, seasonal, injectable, preservative free",
  "occurrence_date_time": "2026-06-10T09:40:00Z",
  "lot_number": "LOT-2026-A",
  "expiration_date": "2026-12-31",
  "site_code": "368209003",
  "site_system": "http://snomed.info/sct",
  "site_display": "Right arm",
  "dose_quantity": 0.5,
  "dose_unit": "mL",
  "primary_source": true
}
```

---

## Phase 6 — In-Clinic Procedures & Specimens

### 6.1 Procedure ✅

Spirometry test performed in-clinic.

```json
POST /procedures
{
  "status": "completed",
  "patient_id": 10001,
  "encounter_id": 20001,
  "practitioner_id": 30001,
  "code": "399208008",
  "code_system": "http://snomed.info/sct",
  "code_display": "Spirometry",
  "performed_date_time": "2026-06-10T09:35:00Z",
  "reason_reference_id": 120001,       // → Condition
  "location_id": 230001,               // → Location
  "outcome_code": "385669000",
  "outcome_system": "http://snomed.info/sct",
  "outcome_display": "Successful"
}
```

---

### 6.2 Specimen ✅ *(if lab samples collected)*

Throat swab collected for culture.

```json
POST /specimens
{
  "status": "available",
  "patient_id": 10001,
  "encounter_id": 20001,
  "collector_id": 30001,
  "type_code": "258500001",
  "type_system": "http://snomed.info/sct",
  "type_display": "Nasopharyngeal swab",
  "collection_date_time": "2026-06-10T09:38:00Z",
  "body_site_code": "71836000",
  "body_site_system": "http://snomed.info/sct",
  "body_site_display": "Nasopharyngeal structure"
}
```

> Produces `specimen_id: 310001`.

---

## Phase 7 — Results & Reports

### 7.1 DiagnosticReport ✅

Spirometry report issued by the respiratory technician.

```json
POST /diagnostic-reports
{
  "status": "final",
  "patient_id": 10001,
  "encounter_id": 20001,
  "practitioner_id": 30001,
  "code": "399208008",
  "code_system": "http://snomed.info/sct",
  "code_display": "Spirometry",
  "category_code": "LAB",
  "category_system": "http://terminology.hl7.org/CodeSystem/v2-0074",
  "effective_date_time": "2026-06-10T10:00:00Z",
  "issued": "2026-06-10T10:05:00Z",
  "conclusion": "Mild obstructive pattern consistent with mild asthma. FEV1/FVC = 0.68.",
  "specimen_id": 310001                // → Specimen
}
```

> Produces `diagnostic_report_id: 110001`.

---

### 7.2 Observation ✅ *(lab result observations linked to the report)*

FEV1 result from the spirometry.

```json
POST /observations
{
  "status": "final",
  "patient_id": 10001,
  "encounter_id": 20001,
  "practitioner_id": 30001,
  "diagnostic_report_id": 110001,      // → DiagnosticReport
  "specimen_id": 310001,               // → Specimen
  "code": "20152-5",
  "code_system": "http://loinc.org",
  "code_display": "FEV1 measured",
  "value_quantity": 2.8,
  "value_unit": "L",
  "value_unit_code": "L",
  "reference_range_low": 3.2,
  "reference_range_high": 5.0,
  "interpretation_code": "L",
  "interpretation_system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
  "interpretation_display": "Low",
  "effective_date_time": "2026-06-10T09:55:00Z",
  "category_code": "laboratory",
  "category_system": "http://terminology.hl7.org/CodeSystem/observation-category"
}
```

---

### 7.3 DocumentReference ✅ *(clinical note / discharge summary)*

Physician's encounter note stored as a document.

```json
POST /document-references
{
  "status": "current",
  "doc_status": "final",
  "patient_id": 10001,
  "encounter_id": 20001,
  "author_id": 30001,
  "type_code": "11488-4",
  "type_system": "http://loinc.org",
  "type_display": "Consult note",
  "category_code": "clinical-note",
  "date": "2026-06-10T10:10:00Z",
  "description": "Outpatient consultation note — Dr. Patel",
  "content_attachment_url": "https://docs.greenvalley.org/notes/enc-20001.pdf",
  "content_attachment_content_type": "application/pdf",
  "content_attachment_title": "Consultation Note 2026-06-10"
}
```

---

## Phase 8 — Care Planning & Follow-up

### 8.1 CarePlan ✅

Ongoing asthma management plan created for the patient.

```json
POST /care-plans
{
  "status": "active",
  "intent": "plan",
  "patient_id": 10001,
  "encounter_id": 20001,
  "author_id": 30001,
  "title": "Asthma Management Plan",
  "description": "Mild asthma — inhaler therapy, spirometry in 3 months, smoking cessation counseling",
  "period_start": "2026-06-10",
  "period_end": "2026-12-10",
  "category_code": "736055001",
  "category_system": "http://snomed.info/sct",
  "category_display": "Asthma management plan",
  "addresses_condition_id": 120001     // → Condition
}
```

---

### 8.2 Task ✅ *(follow-up actions)*

Automated or manual follow-up tasks triggered by the encounter.

```json
POST /tasks
{
  "status": "requested",
  "intent": "order",
  "patient_id": 10001,
  "encounter_id": 20001,
  "requester_id": 30001,
  "owner_id": 30001,
  "code": "409073007",
  "code_system": "http://snomed.info/sct",
  "code_display": "Education",
  "description": "Schedule inhaler technique education session",
  "authored_on": "2026-06-10T10:15:00Z",
  "restriction_period_end": "2026-06-24"
}
```

---

## Phase 9 — Encounter Closes

Update Encounter status to `finished`.

```json
PATCH /encounters/20001
{
  "status": "finished",
  "period_end": "2026-06-10T10:20:00Z",
  "discharge_disposition_code": "home",
  "discharge_disposition_system": "http://terminology.hl7.org/CodeSystem/discharge-disposition"
}
```

---

## Phase 10 — Billing

### 10.1 Claim ✅

Insurance claim submitted after the encounter closes.

```json
POST /claims
{
  "status": "active",
  "use": "claim",
  "patient_id": 10001,                 // → Patient
  "encounter_id": 20001,              // → Encounter
  "coverage_id": 240001,               // → Coverage
  "provider_id": 190001,               // → Organization
  "billable_period_start": "2026-06-10",
  "billable_period_end": "2026-06-10",
  "created": "2026-06-10T10:30:00Z",
  "priority": "normal",
  "diagnosis_id": 120001,              // → Condition
  "procedure_id": null,
  "item_sequence": 1,
  "item_service_code": "99213",
  "item_service_system": "http://www.ama-assn.org/go/cpt",
  "item_service_display": "Office/outpatient visit, established patient, moderate complexity",
  "item_unit_price": 150.00,
  "item_quantity": 1
}
```

> Produces `claim_id: 170001`.

---

### 10.2 ClaimResponse ✅

Insurer's adjudication response to the submitted claim.

```json
POST /claim-responses
{
  "status": "active",
  "use": "claim",
  "patient_id": 10001,
  "claim_id": 170001,                  // → Claim
  "insurer_id": 190001,                // → Organization (insurer)
  "outcome": "complete",
  "created": "2026-06-11T08:00:00Z",
  "payment_amount": 120.00,
  "payment_date": "2026-06-15",
  "adjudication_category": "benefit",
  "adjudication_amount": 120.00
}
```

---

### 10.3 Invoice ✅

Patient-facing invoice for the remaining balance after insurance.

```json
POST /invoices
{
  "status": "issued",
  "patient_id": 10001,
  "encounter_id": 20001,
  "issuer_id": 190001,                 // → Organization
  "date": "2026-06-11",
  "line_item_service_code": "99213",
  "line_item_price": 150.00,
  "line_item_discount": 120.00,
  "total_net": 30.00,
  "total_gross": 30.00,
  "currency": "USD",
  "note": "Co-pay amount due within 30 days"
}
```

---

## Phase 11 — Audit & Provenance

### 11.1 Provenance ✅

Records who created / modified critical clinical resources (data lineage).

```json
POST /provenances
{
  "target_resource_type": "Condition",
  "target_resource_id": 120001,        // → Condition
  "recorded": "2026-06-10T09:20:00Z",
  "activity_code": "CREATE",
  "activity_system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
  "agent_practitioner_id": 30001,      // → Practitioner
  "agent_role_code": "author",
  "agent_role_system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
  "entity_role": "source",
  "entity_reference": "QuestionnaireResponse/qr-intake-001"
}
```

---

### 11.2 AuditEvent ✅

System-level audit trail entry (typically auto-generated by middleware, but can be explicit).

```json
POST /audit-events
{
  "type_code": "110110",
  "type_system": "http://dicom.nema.org/resources/ontology/DCM",
  "type_display": "Patient Record",
  "action": "R",
  "recorded": "2026-06-10T10:20:00Z",
  "outcome": "0",
  "patient_id": 10001,
  "agent_user_id": "practitioner-jwt-sub",
  "agent_name": "Dr. Anita Patel",
  "agent_requestor": true,
  "source_site": "GVOC-EHR",
  "entity_type_code": "1",
  "entity_role_code": "1",
  "entity_reference": "Encounter/20001"
}
```

---

## Resource Dependency Graph

```
Organization ─────────────────────────┐
    │                                 │
    ├── Location ◄──────────────┐     │
    │       │                   │     │
    ├── Practitioner             │     │
    │       │                   │     │
    ├── PractitionerRole ────────┘     │
    │                                 │
    └── HealthcareService             │
            │                         │
Schedule ◄──┘                         │
    │                                 │
Slot ◄──────────────── Appointment    │
                           │          │
Patient ───────────────────┤          │
    │                      │          │
RelatedPerson              │          │
    │                      ▼          │
Coverage             Encounter ◄──────┘
                          │
         ┌────────────────┼────────────────────┐
         │                │                    │
  Condition          AllergyIntolerance    Observation
    │    │                                  Vitals
    │    │         QuestionnaireResponse
    │    │
    │  ServiceRequest ──► Procedure ──► Specimen
    │  DeviceRequest               │
    │  MedicationRequest           ▼
    │  Immunization          DiagnosticReport ──► Observation
    │
    └──► CarePlan
         Task
         DocumentReference
         Provenance
         AuditEvent
              │
         Claim ──► ClaimResponse ──► Invoice
```

---

## Summary Table — All Resources Used

| # | Resource | Phase | Status | Notes |
|---|----------|-------|--------|-------|
| 1 | Organization | 0 — Setup | ✅ | Clinic + insurer |
| 2 | Location | 0 — Setup | ✅ | Physical clinic location |
| 3 | Practitioner | 0 — Setup | ✅ | Attending physician |
| 4 | PractitionerRole | 0 — Setup | ✅ | Links practitioner → org + specialty |
| 5 | HealthcareService | 0 — Setup | ✅ | Offered services catalog |
| 6 | Medication | 0 — Setup | ✅ | Formulary entry |
| 7 | Schedule | 0 — Setup | ✅ | Availability template |
| 8 | Slot | 0 — Setup | ✅ | Bookable time windows |
| 9 | Patient | 1 — Registration | ✅ | Beneficiary |
| 10 | RelatedPerson | 1 — Registration | ✅ | Emergency contact / guardian |
| 11 | Coverage | 1 — Registration | ✅ | Insurance policy |
| 12 | Appointment | 2 — Booking | ✅ | Books a slot |
| 13 | EpisodeOfCare | 3 — Encounter | ✅ | Chronic care grouper |
| 14 | Encounter | 3 — Encounter | ✅ | The visit itself |
| 15 | QuestionnaireResponse | 4 — Assessment | ✅ | Intake form |
| 16 | AllergyIntolerance | 4 — Assessment | ✅ | Documented allergies |
| 17 | Vitals | 4 — Assessment | ✅ | Vital signs |
| 18 | Observation | 4 — Assessment | ✅ | Clinical findings |
| 19 | Condition | 4 — Assessment | ✅ | Diagnoses |
| 20 | ServiceRequest | 5 — Orders | ✅ | Lab / imaging / referral |
| 21 | DeviceRequest | 5 — Orders | ✅ | Medical device orders |
| 22 | MedicationRequest | 5 — Orders | ✅ | Prescriptions |
| 23 | Immunization | 5 — Orders | ✅ | Vaccines administered |
| 24 | Procedure | 6 — Procedures | ✅ | In-clinic procedures |
| 25 | Specimen | 6 — Procedures | ✅ | Lab samples |
| 26 | DiagnosticReport | 7 — Results | ✅ | Test reports |
| 27 | Observation | 7 — Results | ✅ | Result values (linked to report) |
| 28 | DocumentReference | 7 — Results | ✅ | Clinical notes / documents |
| 29 | CarePlan | 8 — Care Plan | ✅ | Ongoing management plan |
| 30 | Task | 8 — Care Plan | ✅ | Follow-up action items |
| 31 | Claim | 10 — Billing | ✅ | Insurance claim |
| 32 | ClaimResponse | 10 — Billing | ✅ | Adjudication result |
| 33 | Invoice | 10 — Billing | ✅ | Patient bill |
| 34 | Provenance | 11 — Audit | ✅ | Data lineage record |
| 35 | AuditEvent | 11 — Audit | ✅ | System audit trail |

---

## Additional Resources Needed (Not Yet Implemented) ❌

These FHIR R4 resources are commonly required in real outpatient workflows but are not yet in this server. Add them as needed.

| Resource | Why Needed | FHIR R4 Spec |
|----------|-----------|--------------|
| **Consent** ❌ | Patient consent for treatment, data sharing, and privacy notices (HIPAA). Required before storing PHI in many jurisdictions. | [Consent R4](https://www.hl7.org/fhir/R4/consent.html) |
| **Flag** ❌ | Patient-level alerts visible across all encounters (e.g., fall risk, do-not-resuscitate, infectious isolation). | [Flag R4](https://www.hl7.org/fhir/R4/flag.html) |
| **FamilyMemberHistory** ❌ | Family history of conditions used for risk stratification and genetic screening decisions. | [FamilyMemberHistory R4](https://www.hl7.org/fhir/R4/familymemberhistory.html) |
| **Communication** ❌ | Secure messages between provider and patient (appointment reminders, lab result notifications, post-visit instructions). | [Communication R4](https://www.hl7.org/fhir/R4/communication.html) |
| **CommunicationRequest** ❌ | Orders a communication to be sent (e.g., "send patient discharge instructions"). | [CommunicationRequest R4](https://www.hl7.org/fhir/R4/communicationrequest.html) |
| **NutritionOrder** ❌ | Dietary instructions or enteral/parenteral nutrition orders relevant to condition management. | [NutritionOrder R4](https://www.hl7.org/fhir/R4/nutritionorder.html) |
| **ImagingStudy** ❌ | Radiology studies (X-ray, CT, MRI) ordered via ServiceRequest but results represented as ImagingStudy + DiagnosticReport. | [ImagingStudy R4](https://www.hl7.org/fhir/R4/imagingstudy.html) |
| **Media** ❌ | Photos, wound images, waveforms, or video clips captured during the encounter. | [Media R4](https://www.hl7.org/fhir/R4/media.html) |
| **RiskAssessment** ❌ | Structured risk scores (e.g., CHADS2, Framingham, PHQ-9) attached to the encounter. | [RiskAssessment R4](https://www.hl7.org/fhir/R4/riskassessment.html) |
| **ClinicalImpression** ❌ | Physician's structured clinical impression / differential diagnosis before final Condition is confirmed. | [ClinicalImpression R4](https://www.hl7.org/fhir/R4/clinicalimpression.html) |
| **Referral (via ServiceRequest)** | Already modeled via ServiceRequest `intent=referral` — no separate resource needed in R4. | — |
| **SupplyRequest / SupplyDelivery** ❌ | Supply orders for consumables (gloves, bandages) and their fulfilment tracking in the clinic. | [SupplyRequest R4](https://www.hl7.org/fhir/R4/supplyrequest.html) |
| **MedicationDispense** ❌ | Records that a medication was actually dispensed by a pharmacist (closes the loop from MedicationRequest). | [MedicationDispense R4](https://www.hl7.org/fhir/R4/medicationdispense.html) |
| **MedicationAdministration** ❌ | Records that a medication was administered in-clinic (e.g., injection, IV, in-office vaccine beyond Immunization). | [MedicationAdministration R4](https://www.hl7.org/fhir/R4/medicationadministration.html) |
| **ExplanationOfBenefit** ❌ | Full adjudicated claim summary returned by the payer — richer than ClaimResponse, required for patient-accessible claim history. | [ExplanationOfBenefit R4](https://www.hl7.org/fhir/R4/explanationofbenefit.html) |
| **PaymentNotice / PaymentReconciliation** ❌ | Tracks actual payment receipt and reconciliation across multiple claims in a billing run. | [PaymentReconciliation R4](https://www.hl7.org/fhir/R4/paymentreconciliation.html) |
| **Questionnaire** ❌ | The form definition that QuestionnaireResponse answers. Currently stored as an external URL reference only. | [Questionnaire R4](https://www.hl7.org/fhir/R4/questionnaire.html) |

---

## Implementation Priority for Missing Resources

**High priority** (core clinical safety / regulatory):
1. Consent — needed before storing PHI
2. Flag — patient safety alerts
3. MedicationDispense + MedicationAdministration — medication reconciliation

**Medium priority** (workflow completeness):
4. Communication + CommunicationRequest — patient messaging
5. FamilyMemberHistory — clinical decision support
6. ExplanationOfBenefit — patient-accessible billing
7. Questionnaire — form definitions

**Lower priority** (advanced / specialty):
8. RiskAssessment, ClinicalImpression, ImagingStudy, Media, NutritionOrder
9. PaymentNotice / PaymentReconciliation, SupplyRequest / SupplyDelivery
