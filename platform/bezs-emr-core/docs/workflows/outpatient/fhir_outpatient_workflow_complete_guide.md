# Complete FHIR Outpatient Workflow Guide

## Overview

This document explains how a complete outpatient (OP) workflow can be implemented using your available FHIR resources.

The goal of this document is to:

- Explain real-world outpatient flow step-by-step
- Map every workflow step to FHIR resources
- Provide detailed JSON examples
- Explain relationships between resources
- Help you design database/workflow architecture
- Identify missing resources you may additionally need
- Serve as the source document for implementation

---

# Resources Currently Available

You currently support these FHIR resources:

| Resource | Purpose |
|---|---|
| Appointment | Booking appointments |
| Claim | Insurance/billing claim |
| ClaimResponse | Insurance adjudication result |
| Condition | Diagnoses/problems |
| DeviceRequest | Device orders |
| DiagnosticReport | Lab/radiology results summary |
| Encounter | Actual patient visit |
| HealthcareService | Service offered by hospital |
| Invoice | Billing invoice |
| MedicationRequest | Medication prescriptions |
| Observation | Vitals/lab values/results |
| Organization | Hospital/clinic |
| Patient | Patient demographic |
| Practitioner | Doctor/provider |
| PractitionerRole | Provider role/location |
| Procedure | Procedures performed |
| QuestionnaireResponse | Intake forms/questionnaires |
| Schedule | Provider availability |
| ServiceRequest | Orders/referrals/lab requests |
| Slot | Time slots for appointments |

---

# Recommended Additional Resources

These are strongly recommended for a real outpatient workflow.

| Resource | Why Needed | Priority |
|---|---|---|
| Coverage | Insurance policy information | HIGH |
| Location | Department/room/clinic mapping | HIGH |
| Medication | Medication master data | HIGH |
| AllergyIntolerance | Drug allergy safety | HIGH |
| CarePlan | Longitudinal treatment planning | MEDIUM |
| RelatedPerson | Family/caregiver access | MEDIUM |
| Specimen | Lab sample tracking | MEDIUM |
| DocumentReference | PDFs/scans/uploads | MEDIUM |
| Immunization | Vaccination records | OPTIONAL |
| EncounterHistory (R5) | Better encounter tracking | OPTIONAL |
| Task | Workflow orchestration | VERY HIGH |
| Provenance | Audit/history tracking | HIGH |

---

# High Level Outpatient Workflow

```text
Patient Registration
        ↓
Provider Availability Setup
        ↓
Schedule + Slot Publishing
        ↓
Appointment Booking
        ↓
Patient Check-in
        ↓
Encounter Creation
        ↓
Clinical Assessment
        ↓
Observations + Conditions
        ↓
Orders (ServiceRequest)
        ↓
Diagnostic Execution
        ↓
DiagnosticReport + Observations
        ↓
Treatment
        ↓
MedicationRequest / Procedure / DeviceRequest
        ↓
Billing
        ↓
Invoice
        ↓
Insurance Claim
        ↓
ClaimResponse
        ↓
Encounter Completion
```

---

# STEP 1 — Organization Setup

First create the hospital/clinic.

## Resource Used

- Organization

---

## Example

```json
{
  "resourceType": "Organization",
  "id": "org-1",
  "active": true,
  "name": "City Care Hospital",
  "telecom": [
    {
      "system": "phone",
      "value": "+91-9876543210"
    }
  ],
  "address": [
    {
      "city": "Chennai",
      "state": "Tamil Nadu",
      "country": "India"
    }
  ]
}
```

---

# STEP 2 — Practitioner Creation

Doctors/providers are created.

## Resources Used

- Practitioner
- PractitionerRole

Practitioner = actual doctor

PractitionerRole = what they do in a specific organization

---

## Practitioner Example

```json
{
  "resourceType": "Practitioner",
  "id": "prac-1",
  "active": true,
  "name": [
    {
      "text": "Dr. Arjun Kumar"
    }
  ]
}
```

---

## PractitionerRole Example

```json
{
  "resourceType": "PractitionerRole",
  "id": "role-1",
  "active": true,
  "practitioner": {
    "reference": "Practitioner/prac-1"
  },
  "organization": {
    "reference": "Organization/org-1"
  },
  "specialty": [
    {
      "text": "Cardiology"
    }
  ]
}
```

---

# STEP 3 — HealthcareService Setup

Represents services offered.

Examples:

- Cardiology OP
- Diabetes Clinic
- General Consultation
- ECG Service
- Lab Testing

## Resource Used

- HealthcareService

---

## Example

```json
{
  "resourceType": "HealthcareService",
  "id": "service-1",
  "active": true,
  "providedBy": {
    "reference": "Organization/org-1"
  },
  "name": "Cardiology Consultation"
}
```

---

# STEP 4 — Schedule Creation

Schedule defines provider availability.

## Resource Used

- Schedule

---

## Example

```json
{
  "resourceType": "Schedule",
  "id": "schedule-1",
  "active": true,
  "actor": [
    {
      "reference": "Practitioner/prac-1"
    }
  ],
  "planningHorizon": {
    "start": "2026-05-20T09:00:00+05:30",
    "end": "2026-06-20T17:00:00+05:30"
  }
}
```

---

# STEP 5 — Slot Creation

Slots are actual appointment windows.

## Resource Used

- Slot

Relationship:

```text
Schedule → many Slots
```

---

## Example

```json
{
  "resourceType": "Slot",
  "id": "slot-1",
  "schedule": {
    "reference": "Schedule/schedule-1"
  },
  "status": "free",
  "start": "2026-05-20T10:00:00+05:30",
  "end": "2026-05-20T10:15:00+05:30"
}
```

---

# STEP 6 — Patient Registration

Patient gets registered.

## Resource Used

- Patient

---

## Example

```json
{
  "resourceType": "Patient",
  "id": "patient-1",
  "active": true,
  "name": [
    {
      "text": "Rahul Sharma"
    }
  ],
  "gender": "male",
  "birthDate": "1995-04-12"
}
```

---

# STEP 7 — Intake Form Submission

Patient may complete:

- Symptoms form
- Past history
- Consent form
- Screening form

## Resource Used

- QuestionnaireResponse

---

## Example

```json
{
  "resourceType": "QuestionnaireResponse",
  "id": "qr-1",
  "status": "completed",
  "subject": {
    "reference": "Patient/patient-1"
  },
  "item": [
    {
      "text": "Chief Complaint",
      "answer": [
        {
          "valueString": "Chest pain for 2 days"
        }
      ]
    }
  ]
}
```

---

# STEP 8 — Appointment Booking

Patient books appointment.

## Resource Used

- Appointment

Relationships:

```text
Appointment → Patient
Appointment → Practitioner
Appointment → Slot
Appointment → HealthcareService
```

---

## Example

```json
{
  "resourceType": "Appointment",
  "id": "appointment-1",
  "status": "booked",
  "slot": [
    {
      "reference": "Slot/slot-1"
    }
  ],
  "participant": [
    {
      "actor": {
        "reference": "Patient/patient-1"
      },
      "status": "accepted"
    },
    {
      "actor": {
        "reference": "Practitioner/prac-1"
      },
      "status": "accepted"
    }
  ]
}
```

---

# STEP 9 — Patient Check-in

When patient arrives:

- Appointment becomes fulfilled/arrived
- Encounter is created

IMPORTANT:

Appointment is booking.
Encounter is actual visit.

---

# STEP 10 — Encounter Creation

## Resource Used

- Encounter

Relationships:

```text
Encounter → Appointment
Encounter → Patient
Encounter → Practitioner
Encounter → Organization
```

---

## Example

```json
{
  "resourceType": "Encounter",
  "id": "encounter-1",
  "status": "in-progress",
  "class": {
    "code": "AMB"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "appointment": [
    {
      "reference": "Appointment/appointment-1"
    }
  ],
  "participant": [
    {
      "individual": {
        "reference": "Practitioner/prac-1"
      }
    }
  ],
  "period": {
    "start": "2026-05-20T10:05:00+05:30"
  }
}
```

---

# STEP 11 — Vitals Collection

Nurse or doctor records vitals.

## Resource Used

- Observation

Examples:

- BP
- Pulse
- Weight
- Temperature
- SPO2

---

## Blood Pressure Example

```json
{
  "resourceType": "Observation",
  "id": "obs-bp-1",
  "status": "final",
  "category": [
    {
      "text": "vital-signs"
    }
  ],
  "code": {
    "text": "Blood Pressure"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "effectiveDateTime": "2026-05-20T10:10:00+05:30",
  "component": [
    {
      "code": {
        "text": "Systolic"
      },
      "valueQuantity": {
        "value": 130,
        "unit": "mmHg"
      }
    },
    {
      "code": {
        "text": "Diastolic"
      },
      "valueQuantity": {
        "value": 85,
        "unit": "mmHg"
      }
    }
  ]
}
```

---

# STEP 12 — Diagnosis Recording

Doctor records diagnosis.

## Resource Used

- Condition

Relationships:

```text
Condition → Patient
Condition → Encounter
```

---

## Example

```json
{
  "resourceType": "Condition",
  "id": "condition-1",
  "clinicalStatus": {
    "text": "active"
  },
  "code": {
    "text": "Hypertension"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "onsetDateTime": "2026-05-20"
}
```

---

# STEP 13 — Ordering Labs / Imaging / Referrals

Doctor orders investigations.

## Resource Used

- ServiceRequest

Examples:

- Blood test
- X-ray
- ECG
- Referral
- MRI
- Physiotherapy

---

## Example — Lab Order

```json
{
  "resourceType": "ServiceRequest",
  "id": "service-request-1",
  "status": "active",
  "intent": "order",
  "code": {
    "text": "Complete Blood Count"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "requester": {
    "reference": "Practitioner/prac-1"
  }
}
```

---

# STEP 14 — Performing Diagnostics

Lab/radiology generates:

- Observations
- DiagnosticReport

Relationship:

```text
ServiceRequest → DiagnosticReport
DiagnosticReport → Observation
```

---

# STEP 15 — Lab Result Observation

## Example

```json
{
  "resourceType": "Observation",
  "id": "obs-hb-1",
  "status": "final",
  "code": {
    "text": "Hemoglobin"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "valueQuantity": {
    "value": 13.2,
    "unit": "g/dL"
  }
}
```

---

# STEP 16 — Diagnostic Report Creation

## Resource Used

- DiagnosticReport

---

## Example

```json
{
  "resourceType": "DiagnosticReport",
  "id": "diag-report-1",
  "status": "final",
  "code": {
    "text": "Complete Blood Count"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "basedOn": [
    {
      "reference": "ServiceRequest/service-request-1"
    }
  ],
  "result": [
    {
      "reference": "Observation/obs-hb-1"
    }
  ]
}
```

---

# STEP 17 — Medication Prescription

Doctor prescribes medication.

## Resource Used

- MedicationRequest

---

## Example

```json
{
  "resourceType": "MedicationRequest",
  "id": "medreq-1",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "text": "Amlodipine 5mg"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "requester": {
    "reference": "Practitioner/prac-1"
  },
  "dosageInstruction": [
    {
      "text": "Take once daily after food"
    }
  ]
}
```

---

# STEP 18 — Procedure Recording

Procedures performed are recorded.

## Resource Used

- Procedure

Examples:

- ECG
- Wound dressing
- Minor surgery
- Injection

---

## Example

```json
{
  "resourceType": "Procedure",
  "id": "procedure-1",
  "status": "completed",
  "code": {
    "text": "ECG"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "performedDateTime": "2026-05-20T11:00:00+05:30"
}
```

---

# STEP 19 — Device Orders

Used when devices are prescribed.

## Resource Used

- DeviceRequest

Examples:

- Glucometer
- CPAP
- Wheelchair
- Holter monitor

---

## Example

```json
{
  "resourceType": "DeviceRequest",
  "id": "device-request-1",
  "status": "active",
  "intent": "order",
  "codeCodeableConcept": {
    "text": "Blood Glucose Monitor"
  },
  "subject": {
    "reference": "Patient/patient-1"
  }
}
```

---

# STEP 20 — Billing

Charges are aggregated.

## Resource Used

- Invoice

Invoice can include:

- Consultation fees
- Lab charges
- Procedure fees
- Medication fees

---

## Example

```json
{
  "resourceType": "Invoice",
  "id": "invoice-1",
  "status": "issued",
  "subject": {
    "reference": "Patient/patient-1"
  },
  "date": "2026-05-20T12:00:00+05:30",
  "totalNet": {
    "value": 2500,
    "currency": "INR"
  }
}
```

---

# STEP 21 — Insurance Claim

If insurance exists:

- Claim is generated
- Sent to payer

## Resource Used

- Claim

---

## Example

```json
{
  "resourceType": "Claim",
  "id": "claim-1",
  "status": "active",
  "use": "claim",
  "patient": {
    "reference": "Patient/patient-1"
  },
  "created": "2026-05-20",
  "provider": {
    "reference": "Organization/org-1"
  },
  "priority": {
    "text": "normal"
  }
}
```

---

# STEP 22 — Claim Response

Insurance adjudication result.

## Resource Used

- ClaimResponse

---

## Example

```json
{
  "resourceType": "ClaimResponse",
  "id": "claim-response-1",
  "status": "active",
  "claim": {
    "reference": "Claim/claim-1"
  },
  "outcome": "complete",
  "disposition": "Claim approved"
}
```

---

# STEP 23 — Encounter Completion

Visit finishes.

Encounter status becomes:

```json
"status": "finished"
```

---

# COMPLETE RESOURCE RELATIONSHIP MAP

```text
Organization
    └── PractitionerRole
            └── Practitioner

HealthcareService

Schedule
    └── Slot
            └── Appointment
                    ├── Patient
                    └── Practitioner

Appointment
    └── Encounter
            ├── Observation
            ├── Condition
            ├── ServiceRequest
            │       └── DiagnosticReport
            │               └── Observation
            ├── MedicationRequest
            ├── Procedure
            ├── DeviceRequest
            ├── Invoice
            └── Claim
                    └── ClaimResponse
```

---

# IMPORTANT FHIR WORKFLOW CONCEPTS

# Appointment vs Encounter

| Appointment | Encounter |
|---|---|
| Planned visit | Actual visit |
| Before patient arrives | After patient arrives |
| Scheduling workflow | Clinical workflow |
| Linked to Slot | Linked to clinical records |

---

# ServiceRequest vs Procedure

| ServiceRequest | Procedure |
|---|---|
| Order/request | Actual performed action |
| Future intent | Completed activity |
| "Do CBC" | "CBC collected" |
| "Do ECG" | "ECG performed" |

---

# Observation vs DiagnosticReport

| Observation | DiagnosticReport |
|---|---|
| Individual result | Summary/report |
| Hemoglobin = 13 | CBC report |
| BP reading | Radiology report |
| Atomic data | Human-readable summary |

---

# Recommended Additional Workflow Resources

# 1. Coverage

VERY IMPORTANT for insurance.

Without Coverage:

- Claims become incomplete
- Insurance workflows weak

Example use:

```text
Patient → Coverage → Claim
```

---

# 2. Location

Strongly recommended.

Needed for:

- OP room
- Consultation room
- Lab room
- ECG room
- Radiology room

Relationship:

```text
Encounter → Location
Schedule → Location
PractitionerRole → Location
```

---

# 3. Task (Highly Recommended)

This is VERY useful for workflow orchestration.

Examples:

- Pending lab collection
- Waiting for doctor
- Ready for consultation
- Lab completed
- Pharmacy pending

Without Task:

Workflow tracking becomes difficult.

---

# Example Task Flow

```text
Appointment booked
    ↓
Task: Patient check-in pending
    ↓
Task: Waiting for vitals
    ↓
Task: Waiting for doctor
    ↓
Task: Lab collection pending
    ↓
Task: Pharmacy pending
    ↓
Task: Billing pending
```

---

# 4. AllergyIntolerance

Critical patient safety resource.

Before prescribing medication:

```text
Check AllergyIntolerance
```

Example:

- Penicillin allergy
- NSAID allergy

---

# 5. Medication Resource

Currently your MedicationRequest directly uses text.

Production systems should:

```text
MedicationRequest → Medication
```

Benefits:

- Medication catalog
- Standard dosage
- Generic mapping
- Drug database

---

# Recommended Database/Architecture Ideas

# 1. Separate Clinical vs Scheduling Domain

Recommended modules:

```text
scheduling/
    appointment
    schedule
    slot

clinical/
    encounter
    observation
    condition
    diagnostic_report
    procedure
    medication_request

billing/
    invoice
    claim
    claim_response

admin/
    organization
    practitioner
    practitioner_role
    healthcare_service
```

---

# 2. Use FHIR References Consistently

Store:

```text
resource_type
resource_id
reference_display
```

Example:

```text
Practitioner/prac-1
```

---

# 3. Event Driven Workflow Recommended

Useful events:

```text
appointment.booked
encounter.started
vitals.completed
lab.ordered
lab.completed
invoice.generated
claim.submitted
```

This helps:

- AI workflow integration
- Notifications
- Automation
- Queue systems

---

# 4. Strong Recommendation: Implement Task Resource

Task becomes your orchestration engine.

Especially useful for:

- AI workflows
- BPM/workflow engines
- A2A workflows
- Queue management
- Lab pipelines
- Billing pipeline

---

# Suggested Future Workflow Enhancements

| Feature | Suggested Resources |
|---|---|
| Pharmacy workflow | MedicationDispense |
| Lab specimen tracking | Specimen |
| File uploads | DocumentReference |
| AI summarization | Composition + DocumentReference |
| Care pathways | CarePlan |
| Chronic disease tracking | CareTeam + CarePlan |
| Consent management | Consent |
| Admission workflows | EpisodeOfCare |

---

# Final Recommended Minimum Production Resources

Strongly recommended production-ready set:

```text
Patient
Practitioner
PractitionerRole
Organization
Location
HealthcareService
Schedule
Slot
Appointment
Encounter
Observation
Condition
ServiceRequest
DiagnosticReport
Medication
MedicationRequest
Procedure
Task
Invoice
Claim
ClaimResponse
Coverage
AllergyIntolerance
DocumentReference
```

---

# Final Notes

Your current resource list is already strong enough to build:

- OP consultation system
- Appointment scheduling system
- Basic EMR/EHR
- Lab workflows
- Prescription workflows
- Billing workflows
- Insurance workflows

The biggest missing pieces for enterprise-grade workflow orchestration are:

1. Task
2. Location
3. Coverage
4. AllergyIntolerance
5. Medication

Task is especially important if you plan:

- AI workflows
- Queue management
- Automation
- Event orchestration
- Agentic systems
- BPMN workflow engines
- Multi-step hospital operations

---

# Example End-to-End OP Journey Summary

```text
1. Patient registers
2. Doctor availability published
3. Slot created
4. Appointment booked
5. Patient checks in
6. Encounter starts
7. Vitals recorded
8. Diagnosis added
9. Lab ordered
10. Lab performed
11. Diagnostic report generated
12. Medicines prescribed
13. Procedures performed
14. Invoice generated
15. Insurance claim submitted
16. Claim response received
17. Encounter completed
```

---

# Recommended Next Steps

You should next implement:

1. Task
2. Coverage
3. Location
4. AllergyIntolerance
5. Medication

Then build:

- workflow engine
- status orchestration
- event bus
- AI workflow layer
- queue management
- audit/provenance

That will make your FHIR server enterprise-grade.

