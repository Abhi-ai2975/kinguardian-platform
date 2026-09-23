# Telemedicine (Virtual Care) Visit — End-to-End FHIR R4 Scenario

This document traces a complete telemedicine visit from system setup through billing and audit. It follows the same structure as `outpatient-scenario.md` — read that first for context on shared setup steps. Key differences from in-person care are highlighted throughout.

**Scenario:** A patient notices a spreading rash and books an online video consultation with a dermatologist. They complete a pre-visit form, upload photos, join the video call, receive a diagnosis and e-prescription, and get post-visit care instructions — all without visiting a clinic.

---

## Legend

| Symbol | Meaning |
|--------|---------|
| ✅ | Implemented in this server |
| ❌ | Not yet implemented — add later |
| `→ ref` | This resource references another resource |
| 🔄 | Reused from outpatient setup (same resource, different instance) |
| ⚡ | Telemedicine-specific behaviour or field value |

---

## How Telemedicine Differs from In-Person Care

| Concern | In-Person (Outpatient) | Telemedicine |
|---------|----------------------|--------------|
| Encounter class | `AMB` (ambulatory) | `VR` (virtual) ⚡ |
| Location | Physical clinic room | Virtual endpoint or patient's home ⚡ |
| Appointment | Slot at clinic | Video/phone link — no physical slot required ⚡ |
| Vitals | Measured by nurse | Self-reported by patient at home ⚡ |
| Specimen / Procedure | In-clinic | Sent to external lab or deferred ⚡ |
| Intake forms | Paper or kiosk | Online before the visit ⚡ |
| Patient photos | N/A | Uploaded before/during call (Media) ⚡ |
| Consent | Treatment consent | Telemedicine-specific consent ⚡ |
| Prescription | Paper/fax | Electronic only (e-Rx) ⚡ |
| Post-visit | Printed summary | Sent via secure message (Communication) ⚡ |
| Billing | POS 11 (office) | POS 02 (telehealth) + modifier -95 ⚡ |

---

## Phase 0 — System / Tenant Setup (one-time, done by admin)

Most setup resources are the same as outpatient. The key difference is the **virtual location** and a **telehealth-specific HealthcareService**.

### 0.1 Organization ✅ 🔄

Same organization as outpatient — no change needed.

```json
// Reuse organization_id: 190001 — Green Valley Outpatient Clinic
```

---

### 0.2 Location — Virtual ✅ ⚡

A virtual location represents the telehealth endpoint rather than a physical room.

```json
POST /locations
{
  "name": "GVOC — Telehealth Virtual Clinic",
  "status": "active",
  "mode": "kind",
  "type": "VI",
  "type_system": "http://terminology.hl7.org/CodeSystem/v3-RoleCode",
  "type_display": "Virtual",
  "managing_organization_id": 190001,
  "description": "Virtual consultation via secure video platform"
}
```

> Produces `location_id: 230002`. ⚡ `mode: kind` signals this is a class of location, not a physical instance.

---

### 0.3 Practitioner ✅ 🔄

The dermatologist conducting the telehealth consult.

```json
POST /practitioners
{
  "active": true,
  "family_name": "Sharma",
  "given_name": "Riya",
  "prefix": "Dr.",
  "gender": "female",
  "birth_date": "1982-11-04",
  "qualification_code": "MD",
  "qualification_system": "http://terminology.hl7.org/CodeSystem/v2-0360",
  "phone": "555-300-5000",
  "email": "riya.sharma@greenvalley.org"
}
```

> Produces `practitioner_id: 30002`.

---

### 0.4 PractitionerRole ✅

Links the dermatologist to the org with telehealth delivery mode.

```json
POST /practitioner-roles
{
  "active": true,
  "practitioner_id": 30002,
  "organization_id": 190001,
  "location_id": 230002,               // → Virtual Location ⚡
  "specialty_code": "394582007",
  "specialty_system": "http://snomed.info/sct",
  "specialty_display": "Dermatology",
  "role_code": "doctor",
  "role_system": "http://terminology.hl7.org/CodeSystem/practitioner-role"
}
```

> Produces `practitioner_role_id: 140002`.

---

### 0.5 HealthcareService — Telehealth ✅ ⚡

A separate HealthcareService entry for virtual consultations (different service type, enables proper slot/schedule filtering).

```json
POST /healthcare-services
{
  "active": true,
  "name": "Dermatology Telehealth Consultation",
  "provided_by_id": 190001,
  "location_id": 230002,               // → Virtual Location ⚡
  "category_code": "telehealth",
  "category_system": "http://terminology.hl7.org/CodeSystem/service-category",
  "type_code": "11429006",
  "type_system": "http://snomed.info/sct",
  "type_display": "Consultation",
  "comment": "Video consultation — dermatology, available Mon-Sat 08:00-20:00"
}
```

> Produces `healthcare_service_id: 150002`.

---

### 0.6 Schedule ✅ ⚡

Dermatologist's virtual availability — wider hours than in-person (evenings/weekends possible).

```json
POST /schedules
{
  "active": true,
  "practitioner_id": 30002,
  "service_type_code": "11429006",
  "service_type_system": "http://snomed.info/sct",
  "planning_horizon_start": "2026-06-02T08:00:00Z",
  "planning_horizon_end": "2026-06-30T20:00:00Z",
  "comment": "Dr. Sharma — telehealth Mon-Sat 08:00-20:00"
}
```

> Produces `schedule_id: 200002`.

---

### 0.7 Slot ✅ ⚡

A virtual slot — no physical room required, shorter slots possible (15 min vs 30 min).

```json
POST /slots
{
  "schedule_id": 200002,
  "status": "free",
  "service_type_code": "11429006",
  "service_type_system": "http://snomed.info/sct",
  "start": "2026-06-11T18:00:00Z",
  "end":   "2026-06-11T18:15:00Z",
  "comment": "Telehealth slot — video link sent on booking"
}
```

> Produces `slot_id: 220002`.

---

## Phase 1 — Patient Registration

### 1.1 Patient ✅ 🔄

```json
// Reuse patient_id: 10001 — Marcus Johnson
// OR register new patient:
POST /patients
{
  "active": true,
  "family_name": "Torres",
  "given_name": "Sofia",
  "gender": "female",
  "birth_date": "1992-04-18",
  "phone": "555-400-6000",
  "email": "sofia.torres@email.com",
  "address_line": "88 Maple Drive",
  "city": "Springfield",
  "state": "IL",
  "postal_code": "62703"
}
```

> Produces `patient_id: 10002`.

---

### 1.2 Coverage ✅

Patient's insurance — same pattern as outpatient.

```json
POST /coverages
{
  "status": "active",
  "subscriber_id": "INS-ST-54321",
  "patient_id": 10002,
  "payor_id": 190001,
  "plan_name": "Aetna HMO Silver",
  "class_type": "plan",
  "period_start": "2026-01-01",
  "period_end": "2026-12-31",
  "order": 1,
  "network": "in-network"
}
```

> Produces `coverage_id: 240002`.

---

## Phase 2 — Pre-Visit (Online, Before the Call)

This phase is unique to telemedicine — everything happens before the video call starts.

### 2.1 Appointment ✅ ⚡

Patient books a virtual slot from a web/mobile app. No physical location — uses virtual location and telehealth service.

```json
POST /appointments
{
  "status": "booked",
  "patient_id": 10002,
  "practitioner_id": 30002,
  "slot_id": 220002,                   // → Virtual Slot ⚡
  "healthcare_service_id": 150002,     // → Telehealth Service ⚡
  "location_id": 230002,               // → Virtual Location ⚡
  "start": "2026-06-11T18:00:00Z",
  "end":   "2026-06-11T18:15:00Z",
  "service_type_code": "11429006",
  "service_type_system": "http://snomed.info/sct",
  "reason_code": "Rash assessment",
  "comment": "Patient reports spreading rash on forearm — 3 days. Video link: https://telehealth.greenvalley.org/join/room-abc123"
}
```

> Produces `appointment_id: 40002`. ⚡ The video call URL is stored in `comment` or as a telecom extension.

---

### 2.2 Consent — Telemedicine ❌ *(not yet implemented)*

Patient must consent to telehealth delivery before the visit. This is a regulatory requirement in most jurisdictions.

```json
POST /consents
{
  "status": "active",
  "scope_code": "patient-privacy",
  "scope_system": "http://terminology.hl7.org/CodeSystem/consentscope",
  "patient_id": 10002,
  "organization_id": 190001,
  "date_time": "2026-06-10T20:30:00Z",
  "policy_rule_code": "OPTIN",
  "policy_rule_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  "category_code": "59284-0",
  "category_system": "http://loinc.org",
  "category_display": "Consent Document",
  "provision_type": "permit",
  "provision_purpose_code": "TREAT",
  "note": "Patient consented to telemedicine delivery of care via secure video platform"
}
```

> ❌ Add `Consent` resource to the server. See [Consent R4](https://www.hl7.org/fhir/R4/consent.html).

---

### 2.3 Communication — Appointment Confirmation ❌ *(not yet implemented)*

System sends the patient their video link and pre-visit instructions via secure message.

```json
POST /communications
{
  "status": "completed",
  "patient_id": 10002,
  "sender_practitioner_id": null,      // system-generated
  "sender_organization_id": 190001,
  "category_code": "appointment-reminder",
  "priority": "routine",
  "subject_id": 10002,
  "encounter_id": null,                // no encounter yet
  "payload_content": "Your telehealth appointment with Dr. Sharma is confirmed for June 11 at 6:00 PM. Join here: https://telehealth.greenvalley.org/join/room-abc123. Please complete your pre-visit form before the call.",
  "sent": "2026-06-10T20:35:00Z",
  "medium_code": "EMAILWRIT",
  "medium_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationMode"
}
```

> ❌ Add `Communication` resource to the server. See [Communication R4](https://www.hl7.org/fhir/R4/communication.html).

---

### 2.4 QuestionnaireResponse — Pre-Visit Intake ✅ ⚡

Patient completes the intake form online at home before the call. No encounter exists yet — it is linked later once the encounter is created.

```json
POST /questionnaire-responses
{
  "status": "completed",
  "patient_id": 10002,
  "encounter_id": null,                // ⚡ linked to encounter after it is created
  "authored": "2026-06-11T17:30:00Z",
  "questionnaire": "http://greenvalley.org/fhir/Questionnaire/derm-intake-v1",
  "items": [
    {
      "link_id": "1",
      "text": "Describe your skin concern",
      "answer": "Red, itchy rash on left forearm, appeared 3 days ago"
    },
    {
      "link_id": "2",
      "text": "Does it spread when scratched?",
      "answer": "Yes"
    },
    {
      "link_id": "3",
      "text": "Any new soaps, detergents, or plants in the past week?",
      "answer": "Used a new laundry detergent 4 days ago"
    },
    {
      "link_id": "4",
      "text": "Current medications",
      "answer": "None"
    },
    {
      "link_id": "5",
      "text": "Known allergies",
      "answer": "None known"
    }
  ]
}
```

---

### 2.5 Media — Patient-Uploaded Photos ❌ *(not yet implemented)*

Patient uploads photos of the rash through the patient portal before the call. The dermatologist reviews these before joining.

```json
POST /media
{
  "status": "completed",
  "type_code": "photo",
  "type_system": "http://terminology.hl7.org/CodeSystem/media-type",
  "subject_patient_id": 10002,
  "operator_patient_id": 10002,        // patient is the operator (self-taken)
  "created_date_time": "2026-06-11T17:45:00Z",
  "body_site_code": "14975008",
  "body_site_system": "http://snomed.info/sct",
  "body_site_display": "Forearm",
  "content_content_type": "image/jpeg",
  "content_url": "https://media.greenvalley.org/patient/10002/rash-forearm-1.jpg",
  "content_title": "Rash photo — left forearm, natural light",
  "note": "Taken by patient at home. Shows spreading erythematous papular rash."
}
```

> ❌ Add `Media` resource to the server. See [Media R4](https://www.hl7.org/fhir/R4/media.html).

---

## Phase 3 — Video Call Begins / Encounter Opens

### 3.1 Encounter ✅ ⚡

The virtual visit. Note `class_code: VR` instead of `AMB`, and the virtual location.

```json
POST /encounters
{
  "status": "in-progress",
  "class_code": "VR",                  // ⚡ Virtual — not AMB
  "class_system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
  "class_display": "virtual",
  "patient_id": 10002,
  "practitioner_id": 30002,
  "appointment_id": 40002,             // → Appointment ⚡
  "location_id": 230002,               // → Virtual Location ⚡
  "organization_id": 190001,
  "period_start": "2026-06-11T18:02:00Z",
  "reason_code": "271807003",
  "reason_system": "http://snomed.info/sct",
  "reason_display": "Skin rash",
  "service_type_code": "394582007",
  "service_type_system": "http://snomed.info/sct"
}
```

> Produces `encounter_id: 20002`.

---

## Phase 4 — Clinical Assessment (During Video Call)

### 4.1 AllergyIntolerance ✅

Documented during the call based on patient's verbal history (pre-visit form showed none, but doctor confirms).

```json
POST /allergy-intolerances
{
  "patient_id": 10002,
  "encounter_id": 20002,
  "clinical_status": "active",
  "verification_status": "unconfirmed",
  "type": "intolerance",
  "category": "environment",
  "criticality": "low",
  "code": "256259004",
  "code_system": "http://snomed.info/sct",
  "code_display": "Latex",
  "onset_date": "2020-06-01",
  "reaction_manifestation": "Mild hives",
  "reaction_severity": "mild"
}
```

---

### 4.2 Observation — Self-Reported Vitals ✅ ⚡

Patient takes their own blood pressure and temperature at home using consumer devices and reports them verbally. Practitioner records these as patient-reported observations.

```json
POST /observations
{
  "status": "final",
  "patient_id": 10002,
  "encounter_id": 20002,
  "practitioner_id": 30002,
  "code": "55284-4",
  "code_system": "http://loinc.org",
  "code_display": "Blood pressure systolic and diastolic",
  "value_string": "Patient-reported: 118/74 mmHg",
  "effective_date_time": "2026-06-11T18:05:00Z",
  "category_code": "vital-signs",
  "category_system": "http://terminology.hl7.org/CodeSystem/observation-category",
  "note": "Self-measured by patient with home cuff — not verified"
}
```

> ⚡ Telemedicine vitals are self-reported. Use `note` to flag unverified values. Vitals endpoint can also be used if the server accepts patient-self values.

---

### 4.3 Observation — Visual Clinical Finding ✅ ⚡

Doctor's visual assessment of the rash from the video and uploaded photos.

```json
POST /observations
{
  "status": "final",
  "patient_id": 10002,
  "encounter_id": 20002,
  "practitioner_id": 30002,
  "code": "271807003",
  "code_system": "http://snomed.info/sct",
  "code_display": "Skin rash",
  "value_string": "Erythematous, papular rash approximately 4x6 cm on left volar forearm. Well-demarcated. No blistering. Pattern consistent with allergic contact dermatitis.",
  "effective_date_time": "2026-06-11T18:06:00Z",
  "category_code": "exam",
  "category_system": "http://terminology.hl7.org/CodeSystem/observation-category",
  "body_site_code": "14975008",
  "body_site_system": "http://snomed.info/sct",
  "body_site_display": "Forearm",
  "note": "Assessment based on patient-uploaded photos and live video — no physical palpation"
}
```

> ⚡ Include `note` flagging that physical examination was not performed.

---

### 4.4 Condition ✅

Diagnosis established via visual assessment during the video call.

```json
POST /conditions
{
  "patient_id": 10002,
  "encounter_id": 20002,
  "practitioner_id": 30002,
  "clinical_status": "active",
  "verification_status": "provisional",  // ⚡ provisional — not confirmed by in-person exam
  "category_code": "encounter-diagnosis",
  "category_system": "http://terminology.hl7.org/CodeSystem/condition-category",
  "code": "40275004",
  "code_system": "http://snomed.info/sct",
  "code_display": "Contact dermatitis",
  "severity_code": "255604002",
  "severity_system": "http://snomed.info/sct",
  "severity_display": "Mild",
  "onset_date": "2026-06-08",
  "recorded_date": "2026-06-11",
  "note": "Presumed allergic contact dermatitis — likely new laundry detergent. Diagnosis provisional pending response to treatment. In-person review if not improving in 7 days."
}
```

> Produces `condition_id: 120002`. ⚡ Use `verification_status: provisional` for telemedicine diagnoses that cannot be physically confirmed.

---

### 4.5 ClinicalImpression — Differential Diagnosis ❌ *(not yet implemented)*

Structured differential considered before settling on the provisional diagnosis.

```json
POST /clinical-impressions
{
  "status": "completed",
  "patient_id": 10002,
  "encounter_id": 20002,
  "assessor_id": 30002,
  "date": "2026-06-11T18:10:00Z",
  "description": "Spreading pruritic rash following new detergent exposure. Differential: allergic contact dermatitis (most likely), irritant contact dermatitis, early eczema.",
  "finding_code": "40275004",
  "finding_system": "http://snomed.info/sct",
  "finding_display": "Contact dermatitis",
  "prognosis": "Good — expected resolution within 7-10 days with avoidance of trigger and topical steroid use."
}
```

> ❌ Add `ClinicalImpression` resource. See [ClinicalImpression R4](https://www.hl7.org/fhir/R4/clinicalimpression.html).

---

## Phase 5 — Orders (Sent Electronically)

### 5.1 MedicationRequest — e-Prescription ✅ ⚡

Electronic prescription sent directly to the patient's pharmacy. No paper prescription.

```json
POST /medication-requests
{
  "status": "active",
  "intent": "order",
  "patient_id": 10002,
  "encounter_id": 20002,
  "requester_id": 30002,
  "medication_id": 250002,             // → Medication (Hydrocortisone 1% cream)
  "reason_reference_id": 120002,       // → Condition
  "dosage_instruction": "Apply a thin layer to affected area twice daily for 7 days. Do not cover with occlusive dressing.",
  "route_code": "6064005",
  "route_system": "http://snomed.info/sct",
  "route_display": "Topical route",
  "authored_on": "2026-06-11T18:12:00Z",
  "dispense_quantity": 30,
  "dispense_unit": "g",
  "number_of_repeats_allowed": 0,
  "note": "e-Rx sent electronically to patient's preferred pharmacy. Patient to avoid new laundry detergent."
}
```

> Produces `medication_request_id: 90002`. ⚡ In telemedicine, prescriptions are always electronic — no paper/fax.

---

### 5.2 ServiceRequest — External Lab Order ✅ ⚡

Patch test ordered at a lab near the patient's home to identify the specific allergen — the patient does not come to the clinic.

```json
POST /service-requests
{
  "status": "active",
  "intent": "order",
  "patient_id": 10002,
  "encounter_id": 20002,
  "requester_id": 30002,
  "code": "16254-3",
  "code_system": "http://loinc.org",
  "code_display": "Patch test panel",
  "category_code": "108252007",
  "category_system": "http://snomed.info/sct",
  "category_display": "Laboratory procedure",
  "priority": "routine",
  "authored_on": "2026-06-11T18:13:00Z",
  "reason_reference_id": 120002,
  "note": "Patient to attend any Quest Diagnostics location near Springfield IL. Results shared electronically."
}
```

> ⚡ `ServiceRequest` with `note` directing patient to an external lab — no in-clinic specimen collection.

---

### 5.3 ServiceRequest — In-Person Follow-Up Referral ✅ ⚡

If rash does not resolve, a referral to in-person dermatology is pre-authorized.

```json
POST /service-requests
{
  "status": "active",
  "intent": "proposal",              // ⚡ proposal — conditional, not a firm order
  "patient_id": 10002,
  "encounter_id": 20002,
  "requester_id": 30002,
  "code": "306206005",
  "code_system": "http://snomed.info/sct",
  "code_display": "Referral to dermatologist",
  "category_code": "306206005",
  "category_system": "http://snomed.info/sct",
  "priority": "routine",
  "authored_on": "2026-06-11T18:14:00Z",
  "reason_reference_id": 120002,
  "note": "Activate only if rash not improving after 7 days on hydrocortisone. Patient to call to schedule."
}
```

---

## Phase 6 — Encounter Closes

Update Encounter status to `finished`.

```json
PATCH /encounters/20002
{
  "status": "finished",
  "period_end": "2026-06-11T18:15:00Z",
  "discharge_disposition_code": "home",
  "discharge_disposition_system": "http://terminology.hl7.org/CodeSystem/discharge-disposition"
}
```

---

## Phase 7 — Post-Visit (After the Call)

### 7.1 DocumentReference — Clinical Note ✅ ⚡

Physician's encounter note — generated and sent electronically to the patient immediately after the call.

```json
POST /document-references
{
  "status": "current",
  "doc_status": "final",
  "patient_id": 10002,
  "encounter_id": 20002,
  "author_id": 30002,
  "type_code": "11488-4",
  "type_system": "http://loinc.org",
  "type_display": "Consult note",
  "category_code": "clinical-note",
  "date": "2026-06-11T18:20:00Z",
  "description": "Telehealth dermatology consultation note — Dr. Sharma",
  "content_attachment_url": "https://docs.greenvalley.org/notes/enc-20002.pdf",
  "content_attachment_content_type": "application/pdf",
  "content_attachment_title": "Virtual Consultation Note 2026-06-11"
}
```

---

### 7.2 Communication — Post-Visit Instructions ❌ *(not yet implemented)*

Post-visit care instructions and e-prescription confirmation sent to patient via secure message.

```json
POST /communications
{
  "status": "completed",
  "patient_id": 10002,
  "sender_organization_id": 190001,
  "category_code": "discharge-instructions",
  "priority": "routine",
  "encounter_id": 20002,
  "payload_content": "Thank you for your visit with Dr. Sharma. Diagnosis: Contact Dermatitis. Your prescription (Hydrocortisone 1% cream) has been sent to your pharmacy. Apply twice daily for 7 days. Avoid the new detergent. If the rash worsens or does not improve in 7 days, please call us. Your patch test order has been sent to Quest Diagnostics.",
  "sent": "2026-06-11T18:21:00Z",
  "medium_code": "EMAILWRIT",
  "medium_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationMode"
}
```

> ❌ Add `Communication` resource to the server.

---

### 7.3 MedicationDispense — Pharmacy Fulfils e-Prescription ❌ *(not yet implemented)*

Once the pharmacy dispenses the medication, a MedicationDispense record closes the loop on the MedicationRequest.

```json
POST /medication-dispenses
{
  "status": "completed",
  "patient_id": 10002,
  "medication_request_id": 90002,      // → MedicationRequest
  "medication_id": 250002,
  "performer_organization_id": null,   // external pharmacy
  "when_handed_over": "2026-06-11T19:30:00Z",
  "quantity": 30,
  "unit": "g",
  "days_supply": 7,
  "dosage_instruction": "Apply thin layer to affected area twice daily for 7 days"
}
```

> ❌ Add `MedicationDispense` resource. See [MedicationDispense R4](https://www.hl7.org/fhir/R4/medicationdispense.html).

---

### 7.4 DiagnosticReport — External Lab Results ✅ ⚡

Results from the external patch test lab arrive electronically a few days later.

```json
POST /diagnostic-reports
{
  "status": "final",
  "patient_id": 10002,
  "encounter_id": 20002,
  "practitioner_id": 30002,
  "code": "16254-3",
  "code_system": "http://loinc.org",
  "code_display": "Patch test panel",
  "category_code": "LAB",
  "category_system": "http://terminology.hl7.org/CodeSystem/v2-0074",
  "effective_date_time": "2026-06-14T10:00:00Z",
  "issued": "2026-06-14T10:30:00Z",
  "conclusion": "Positive reaction to preservative Methylisothiazolinone (MI) — commonly found in laundry detergents. Consistent with allergic contact dermatitis.",
  "specimen_id": null                  // collected externally
}
```

> Produces `diagnostic_report_id: 110002`. ⚡ Results arrive from external lab without an in-server Specimen record.

---

### 7.5 Observation — Lab Result Values ✅

Patch test result recorded as a structured observation.

```json
POST /observations
{
  "status": "final",
  "patient_id": 10002,
  "encounter_id": 20002,
  "practitioner_id": 30002,
  "diagnostic_report_id": 110002,
  "code": "406756007",
  "code_system": "http://snomed.info/sct",
  "code_display": "Patch test positive",
  "value_string": "Positive (+2) at 72h — Methylisothiazolinone (MI), 0.02% aq",
  "interpretation_code": "POS",
  "interpretation_system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
  "interpretation_display": "Positive",
  "effective_date_time": "2026-06-14T10:00:00Z",
  "category_code": "laboratory",
  "category_system": "http://terminology.hl7.org/CodeSystem/observation-category"
}
```

---

### 7.6 Condition — Updated with Confirmed Allergen ✅

Update the existing condition from `provisional` to `confirmed` after lab results confirm the allergen.

```json
PATCH /conditions/120002
{
  "verification_status": "confirmed",
  "note": "Confirmed allergic contact dermatitis to Methylisothiazolinone (MI) via patch testing 2026-06-14."
}
```

---

### 7.7 Communication — Lab Result Notification ❌ *(not yet implemented)*

System notifies the patient of their lab results via secure message.

```json
POST /communications
{
  "status": "completed",
  "patient_id": 10002,
  "sender_practitioner_id": 30002,
  "category_code": "lab-results",
  "priority": "routine",
  "encounter_id": 20002,
  "payload_content": "Hi Sofia, your patch test results are in. You have a confirmed allergy to Methylisothiazolinone (MI), a preservative in many detergents and personal care products. We recommend checking all product labels. Your doctor has updated your allergy record. No further treatment is needed — the rash should have resolved by now.",
  "sent": "2026-06-14T11:00:00Z",
  "medium_code": "EMAILWRIT",
  "medium_system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationMode"
}
```

---

## Phase 8 — Care Planning

### 8.1 CarePlan ✅

Allergen avoidance plan created after confirmed diagnosis.

```json
POST /care-plans
{
  "status": "active",
  "intent": "plan",
  "patient_id": 10002,
  "encounter_id": 20002,
  "author_id": 30002,
  "title": "Allergic Contact Dermatitis — Allergen Avoidance Plan",
  "description": "Avoid MI-containing products. Use fragrance-free, MI-free detergents, soaps, and cosmetics. Carry hydrocortisone for flare-ups. Annual follow-up via telehealth.",
  "period_start": "2026-06-14",
  "period_end": "2027-06-14",
  "category_code": "736055001",
  "category_system": "http://snomed.info/sct",
  "category_display": "Allergy management plan",
  "addresses_condition_id": 120002
}
```

---

### 8.2 AllergyIntolerance — Update with Confirmed Allergen ✅

Add the confirmed specific allergen (MI) as a separate allergy record for the patient's permanent record.

```json
POST /allergy-intolerances
{
  "patient_id": 10002,
  "encounter_id": 20002,
  "clinical_status": "active",
  "verification_status": "confirmed",
  "type": "allergy",
  "category": "environment",
  "criticality": "low",
  "code": "763522001",
  "code_system": "http://snomed.info/sct",
  "code_display": "Methylisothiazolinone",
  "onset_date": "2026-06-08",
  "reaction_manifestation": "Allergic contact dermatitis",
  "reaction_severity": "mild",
  "note": "Confirmed by patch test 2026-06-14. Avoid MI in detergents, cosmetics, and personal care products."
}
```

---

### 8.3 Task — Follow-Up Reminder ✅

Automated task to check in with the patient in 7 days.

```json
POST /tasks
{
  "status": "requested",
  "intent": "order",
  "patient_id": 10002,
  "encounter_id": 20002,
  "requester_id": 30002,
  "owner_id": 30002,
  "code": "185389009",
  "code_system": "http://snomed.info/sct",
  "code_display": "Follow-up visit",
  "description": "Telehealth follow-up — confirm rash resolution and MI avoidance education",
  "authored_on": "2026-06-14T11:00:00Z",
  "restriction_period_end": "2026-06-21"
}
```

---

## Phase 9 — Billing (Telehealth-Specific Codes)

### 9.1 Claim ✅ ⚡

Telehealth claims use different CPT codes and the **Place of Service 02** (Telehealth).

```json
POST /claims
{
  "status": "active",
  "use": "claim",
  "patient_id": 10002,
  "encounter_id": 20002,
  "coverage_id": 240002,
  "provider_id": 190001,
  "billable_period_start": "2026-06-11",
  "billable_period_end": "2026-06-11",
  "created": "2026-06-11T19:00:00Z",
  "priority": "normal",
  "diagnosis_id": 120002,
  "item_sequence": 1,
  "item_service_code": "99213-95",     // ⚡ CPT 99213 + modifier -95 = telehealth
  "item_service_system": "http://www.ama-assn.org/go/cpt",
  "item_service_display": "Office/outpatient visit, established patient, telehealth (modifier -95)",
  "item_unit_price": 120.00,
  "item_quantity": 1,
  "item_location_code": "02",          // ⚡ POS 02 = Telehealth
  "item_location_system": "https://www.cms.gov/Medicare/Coding/place-of-service-codes"
}
```

> Produces `claim_id: 170002`. ⚡ POS 02 and modifier -95 are required for insurance reimbursement of telehealth visits.

---

### 9.2 ClaimResponse ✅

```json
POST /claim-responses
{
  "status": "active",
  "use": "claim",
  "patient_id": 10002,
  "claim_id": 170002,
  "insurer_id": 190001,
  "outcome": "complete",
  "created": "2026-06-12T08:00:00Z",
  "payment_amount": 96.00,
  "payment_date": "2026-06-18",
  "adjudication_category": "benefit",
  "adjudication_amount": 96.00
}
```

---

### 9.3 Invoice ✅

```json
POST /invoices
{
  "status": "issued",
  "patient_id": 10002,
  "encounter_id": 20002,
  "issuer_id": 190001,
  "date": "2026-06-12",
  "line_item_service_code": "99213-95",
  "line_item_price": 120.00,
  "line_item_discount": 96.00,
  "total_net": 24.00,
  "total_gross": 24.00,
  "currency": "USD",
  "note": "Telehealth co-pay — due within 30 days"
}
```

---

## Phase 10 — Audit & Provenance

### 10.1 Provenance ✅

```json
POST /provenances
{
  "target_resource_type": "Condition",
  "target_resource_id": 120002,
  "recorded": "2026-06-11T18:12:00Z",
  "activity_code": "CREATE",
  "activity_system": "http://terminology.hl7.org/CodeSystem/v3-DataOperation",
  "agent_practitioner_id": 30002,
  "agent_role_code": "author",
  "agent_role_system": "http://terminology.hl7.org/CodeSystem/provenance-participant-type",
  "entity_role": "source",
  "entity_reference": "Media/patient-photo-forearm",
  "note": "Diagnosis based on patient-uploaded photos and live video assessment"
}
```

---

### 10.2 AuditEvent ✅

```json
POST /audit-events
{
  "type_code": "110110",
  "type_system": "http://dicom.nema.org/resources/ontology/DCM",
  "type_display": "Patient Record",
  "action": "R",
  "recorded": "2026-06-11T18:15:00Z",
  "outcome": "0",
  "patient_id": 10002,
  "agent_user_id": "practitioner-jwt-sub-30002",
  "agent_name": "Dr. Riya Sharma",
  "agent_requestor": true,
  "source_site": "GVOC-Telehealth",
  "entity_type_code": "1",
  "entity_role_code": "1",
  "entity_reference": "Encounter/20002"
}
```

---

## Resource Dependency Graph

```
Organization ─────────────────────────┐
    │                                 │
    ├── Location (virtual) ◄────┐     │
    │                           │     │
    ├── Practitioner             │     │
    │       │                   │     │
    └── PractitionerRole ───────┘     │
            │                         │
HealthcareService (telehealth)         │
            │                         │
Schedule ◄──┘                         │
    │                                 │
    └── Slot ◄── Appointment          │
                     │                │
Patient ─────────────┤                │
    │                │                │
Coverage             ▼                │
                 Encounter ◄──────────┘
                     │
    ┌────────────────┼───────────────────────┐
    │                │                       │
Consent (❌)     QuestionnaireResponse    Media (❌)
    │             (pre-visit)             (patient photos)
    │
    ├── AllergyIntolerance
    ├── Observation (self-reported vitals)
    ├── Observation (visual exam finding)
    ├── Condition (provisional)
    │       │
    │       ├── MedicationRequest (e-Rx) ──► MedicationDispense (❌)
    │       ├── ServiceRequest (external lab)
    │       └── ServiceRequest (referral — conditional)
    │
    ├── DiagnosticReport (external lab results)
    │       └── Observation (lab result values)
    │
    ├── Condition (PATCH → confirmed)
    ├── AllergyIntolerance (confirmed allergen)
    │
    ├── CarePlan
    ├── Task (follow-up)
    ├── DocumentReference (encounter note)
    │
    ├── Communication (❌) × 3 (confirmation, post-visit, lab results)
    │
    ├── Claim (POS 02 + modifier -95) ──► ClaimResponse ──► Invoice
    │
    ├── Provenance
    └── AuditEvent
```

---

## Summary Table — All Resources Used

| # | Resource | Phase | Status | Telemedicine Note |
|---|----------|-------|--------|-------------------|
| 1 | Organization | 0 — Setup | ✅ | Same as outpatient |
| 2 | Location | 0 — Setup | ✅ | `type: VI` (virtual) |
| 3 | Practitioner | 0 — Setup | ✅ | Dermatologist |
| 4 | PractitionerRole | 0 — Setup | ✅ | Linked to virtual location |
| 5 | HealthcareService | 0 — Setup | ✅ | Telehealth service type |
| 6 | Schedule | 0 — Setup | ✅ | Extended hours (evenings) |
| 7 | Slot | 0 — Setup | ✅ | 15-min virtual slots |
| 8 | Patient | 1 — Registration | ✅ | Remote — no in-person registration |
| 9 | Coverage | 1 — Registration | ✅ | Must verify telehealth coverage |
| 10 | Appointment | 2 — Pre-Visit | ✅ | Video link in comment field |
| 11 | Consent | 2 — Pre-Visit | ❌ | Telehealth consent — **add first** |
| 12 | Communication | 2 — Pre-Visit | ❌ | Appointment confirmation + video link |
| 13 | QuestionnaireResponse | 2 — Pre-Visit | ✅ | Completed online before call |
| 14 | Media | 2 — Pre-Visit | ❌ | Patient-uploaded rash photos |
| 15 | Encounter | 3 — Call Starts | ✅ | `class: VR` (virtual) |
| 16 | AllergyIntolerance | 4 — Assessment | ✅ | Verbal history during call |
| 17 | Observation | 4 — Assessment | ✅ | Self-reported vitals + visual exam |
| 18 | Condition | 4 — Assessment | ✅ | `verification_status: provisional` |
| 19 | ClinicalImpression | 4 — Assessment | ❌ | Differential diagnosis structured |
| 20 | MedicationRequest | 5 — Orders | ✅ | e-Prescription — always electronic |
| 21 | ServiceRequest | 5 — Orders | ✅ | External lab + conditional referral |
| 22 | DocumentReference | 7 — Post-Visit | ✅ | Sent electronically after call |
| 23 | Communication | 7 — Post-Visit | ❌ | Post-visit instructions |
| 24 | MedicationDispense | 7 — Post-Visit | ❌ | Pharmacy fulfilment |
| 25 | DiagnosticReport | 7 — Post-Visit | ✅ | External lab results |
| 26 | Observation | 7 — Post-Visit | ✅ | Lab result values |
| 27 | Condition | 7 — Post-Visit | ✅ | PATCH → `confirmed` |
| 28 | Communication | 7 — Post-Visit | ❌ | Lab result notification |
| 29 | CarePlan | 8 — Care Plan | ✅ | Allergen avoidance plan |
| 30 | AllergyIntolerance | 8 — Care Plan | ✅ | Confirmed allergen record |
| 31 | Task | 8 — Care Plan | ✅ | 7-day follow-up reminder |
| 32 | Claim | 9 — Billing | ✅ | POS 02 + CPT modifier -95 |
| 33 | ClaimResponse | 9 — Billing | ✅ | Adjudication result |
| 34 | Invoice | 9 — Billing | ✅ | Patient co-pay |
| 35 | Provenance | 10 — Audit | ✅ | Source: patient photos |
| 36 | AuditEvent | 10 — Audit | ✅ | Virtual encounter audit |

---

## Telemedicine-Specific Implementation Notes

### Encounter Class
Always set `class_code: VR` (from `http://terminology.hl7.org/CodeSystem/v3-ActCode`) for virtual visits. This is how payers, analytics, and FHIR queries distinguish telehealth from in-person.

### Provisional Diagnoses
Conditions established via telemedicine where physical examination was not possible should use `verification_status: provisional`. Update to `confirmed` when lab results, in-person follow-up, or treatment response confirms the diagnosis.

### Self-Reported Vitals
Patient-reported measurements (home BP cuff, consumer thermometer) should be recorded in Observation with:
- A `note` flagging the measurement as self-reported and unverified
- Category `vital-signs` is still appropriate
- Do **not** use the Vitals endpoint unless the server is updated to accept a `self_reported` flag

### Billing Modifiers
Telehealth claims require:
- Place of Service code **02** (Telehealth — Provided in patient's home) or **10** (Telehealth — Patient not in home)
- CPT modifier **-95** (synchronous telemedicine) or **-G0** (real-time interactive audio/video)
- Some payers require modifier **GT** instead — check payer-specific rules

### No Physical Slot Required
Virtual appointments do not need a physical room — the Slot resource still exists for scheduling purposes but `location` points to the virtual Location, not a physical room.

### External Lab Orders
ServiceRequests for tests at external labs have no in-server Specimen. The DiagnosticReport arrives externally and is recorded with `specimen_id: null`. Reference the order via `based_on` (ServiceRequest reference) in the DiagnosticReport if the field is available.

---

## Missing Resources — Priority for Telemedicine

These are the same resources flagged in `outpatient-scenario.md`, but priority is elevated for telemedicine because some are core to the workflow:

| Resource | Priority in Telemedicine | Reason |
|----------|--------------------------|--------|
| **Consent** ❌ | 🔴 Critical | Telemedicine consent is legally required before the encounter |
| **Communication** ❌ | 🔴 Critical | Appointment confirmations, video links, post-visit instructions, lab results — the entire async communication channel |
| **Media** ❌ | 🟠 High | Patient-uploaded photos are primary diagnostic input in dermatology telehealth |
| **MedicationDispense** ❌ | 🟠 High | Closes the loop on e-prescriptions — needed for medication reconciliation |
| **ClinicalImpression** ❌ | 🟡 Medium | Structured differential is more important in telemedicine where diagnosis is provisional |
| **Flag** ❌ | 🟡 Medium | Technical flags (patient connectivity issues, unsuitable for telehealth) |
| **Questionnaire** ❌ | 🟡 Medium | Form definitions for pre-visit intake forms |
| **ExplanationOfBenefit** ❌ | 🟡 Medium | Patient-accessible claim history including telehealth visits |
| **RiskAssessment** ❌ | 🟢 Lower | Structured risk scores (PHQ-9 for mental telehealth) |
| **ImagingStudy** ❌ | 🟢 Lower | Relevant if radiology read is part of the telehealth consult |
