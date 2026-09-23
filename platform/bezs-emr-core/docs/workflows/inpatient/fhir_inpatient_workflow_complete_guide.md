# Complete FHIR Inpatient (IP) Workflow Guide

# Overview

This document explains how a complete inpatient (IP) workflow works using FHIR resources.

This guide is designed for:

- Hospital Information Systems (HIS)
- EMR/EHR systems
- Bed management systems
- Admission/Discharge/Transfer systems (ADT)
- Nursing workflows
- Clinical workflows
- Billing workflows
- Insurance workflows
- AI workflow orchestration
- Queue management systems

This document provides:

- Real-world inpatient workflow
- FHIR resource relationships
- Step-by-step architecture
- Detailed JSON examples
- Bed/ward management concepts
- Admission workflows
- Transfer workflows
- Discharge workflows
- Billing and insurance flow
- AI orchestration ideas

---

# What is Inpatient Workflow?

Inpatient means:

```text
Patient is admitted into the hospital
and stays for ongoing care.
```

Examples:

- Surgery admission
- ICU admission
- Observation admission
- Cardiology admission
- Maternity admission
- Emergency admission

---

# OUTPATIENT vs INPATIENT

| Outpatient | Inpatient |
|---|---|
| Short visit | Long stay |
| No admission | Admitted |
| Usually one encounter | Multiple encounter stages |
| Simple workflow | Complex workflow |
| Minimal bed tracking | Bed/ward management |
| Lower billing complexity | Higher billing complexity |

---

# STRONGLY RECOMMENDED RESOURCES

For inpatient systems, these become VERY important.

| Resource | Priority |
|---|---|
| Encounter | CRITICAL |
| Location | CRITICAL |
| Task | CRITICAL |
| Coverage | HIGH |
| AllergyIntolerance | HIGH |
| Medication | HIGH |
| CarePlan | HIGH |
| DocumentReference | HIGH |
| Provenance | HIGH |
| AuditEvent | HIGH |
| EpisodeOfCare | VERY HIGH |
| ServiceRequest | VERY HIGH |
| Procedure | VERY HIGH |

---

# IMPORTANT ARCHITECTURAL CONCEPT

# EpisodeOfCare

Strong recommendation.

An inpatient admission is usually:

```text
One EpisodeOfCare
containing
multiple Encounters
```

---

# Example

```text
Hospital Admission
    ↓
EpisodeOfCare
    ├── ER Encounter
    ├── Admission Encounter
    ├── ICU Encounter
    ├── Ward Encounter
    └── Discharge Encounter
```

---

# HIGH LEVEL INPATIENT FLOW

```text
Patient Registration
    ↓
Admission Decision
    ↓
Bed Allocation
    ↓
Admission Encounter
    ↓
Nursing Assessment
    ↓
Doctor Evaluation
    ↓
Orders (Labs/Imaging/Procedures)
    ↓
Medication Administration
    ↓
Monitoring & Progress Notes
    ↓
Transfers (Ward/ICU)
    ↓
Discharge Planning
    ↓
Final Billing
    ↓
Insurance Claim
    ↓
Discharge
```

---

# CORE RESOURCE RELATIONSHIP MAP

```text
Patient
    ↓
EpisodeOfCare
    ↓
Encounter
    ├── Location
    ├── Observation
    ├── Condition
    ├── ServiceRequest
    ├── Procedure
    ├── MedicationRequest
    ├── DiagnosticReport
    ├── DocumentReference
    ├── Invoice
    ├── Claim
    └── Task
```

---

# STEP 1 — Patient Registration

## Resource

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
  "birthDate": "1988-05-10"
}
```

---

# STEP 2 — Insurance Verification

Strong recommendation:

Use:

```text
Coverage
```

---

# Coverage Example

```json
{
  "resourceType": "Coverage",
  "id": "coverage-1",
  "status": "active",
  "beneficiary": {
    "reference": "Patient/patient-1"
  },
  "payor": [
    {
      "display": "ABC Insurance"
    }
  ]
}
```

---

# STEP 3 — Admission Decision

Doctor decides patient requires admission.

Common reasons:

- Surgery
- Observation
- Critical monitoring
- ICU care
- Severe infection

---

# STEP 4 — Create EpisodeOfCare

## WHY IMPORTANT

Tracks the complete hospitalization.

---

## Example

```json
{
  "resourceType": "EpisodeOfCare",
  "id": "episode-1",
  "status": "active",
  "patient": {
    "reference": "Patient/patient-1"
  },
  "type": [
    {
      "text": "Inpatient Admission"
    }
  ],
  "managingOrganization": {
    "reference": "Organization/org-1"
  }
}
```

---

# STEP 5 — Bed & Ward Allocation

VERY IMPORTANT.

Use:

```text
Location
```

---

# Recommended Location Hierarchy

```text
Hospital
    ├── Building
    ├── Floor
    ├── Ward
    ├── Room
    └── Bed
```

---

# Example

```json
{
  "resourceType": "Location",
  "id": "bed-101",
  "status": "active",
  "name": "Ward A - Bed 101",
  "physicalType": {
    "text": "Bed"
  }
}
```

---

# STEP 6 — Create Admission Encounter

## Resource

- Encounter

---

# IMPORTANT

Use:

```json
"class": {
  "code": "IMP"
}
```

Meaning:

```text
Inpatient Encounter
```

---

# Example

```json
{
  "resourceType": "Encounter",
  "id": "encounter-admission-1",
  "status": "in-progress",
  "class": {
    "code": "IMP"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "episodeOfCare": [
    {
      "reference": "EpisodeOfCare/episode-1"
    }
  ],
  "location": [
    {
      "location": {
        "reference": "Location/bed-101"
      }
    }
  ]
}
```

---

# STEP 7 — Admission Assessment

Nurse and doctor perform assessment.

Resources:

- Observation
- Condition
- QuestionnaireResponse
- DocumentReference

---

# Nursing Assessment Example

```json
{
  "resourceType": "Observation",
  "id": "obs-admission-1",
  "status": "final",
  "code": {
    "text": "Admission Assessment"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-admission-1"
  },
  "valueString": "Patient conscious and stable"
}
```

---

# STEP 8 — Diagnosis Recording

## Resource

- Condition

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
    "text": "Pneumonia"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-admission-1"
  }
}
```

---

# STEP 9 — Create CarePlan

Strong recommendation.

CarePlan coordinates:

- medications
- procedures
- monitoring
- goals
- discharge planning

---

# Example

```json
{
  "resourceType": "CarePlan",
  "id": "careplan-1",
  "status": "active",
  "intent": "plan",
  "subject": {
    "reference": "Patient/patient-1"
  }
}
```

---

# STEP 10 — Doctor Orders

Use:

```text
ServiceRequest
```

Examples:

- CBC
- MRI
- Surgery
- ICU transfer
- Physiotherapy

---

# Example

```json
{
  "resourceType": "ServiceRequest",
  "id": "sr-cbc-1",
  "status": "active",
  "intent": "order",
  "code": {
    "text": "Complete Blood Count"
  },
  "subject": {
    "reference": "Patient/patient-1"
  }
}
```

---

# STEP 11 — Task Orchestration

VERY IMPORTANT.

Inpatient systems REQUIRE Task.

---

# Example Workflow

```text
Admission Task
    ↓
Vitals Task
    ↓
Lab Collection Task
    ↓
Medication Administration Task
    ↓
Doctor Review Task
    ↓
Discharge Planning Task
```

---

# Example Task

```json
{
  "resourceType": "Task",
  "id": "task-medication-1",
  "status": "ready",
  "intent": "order",
  "code": {
    "text": "Administer Antibiotic"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-admission-1"
  }
}
```

---

# STEP 12 — Medication Management

## Resources

- Medication
- MedicationRequest

---

# MedicationRequest Example

```json
{
  "resourceType": "MedicationRequest",
  "id": "medreq-1",
  "status": "active",
  "intent": "order",
  "medicationCodeableConcept": {
    "text": "Ceftriaxone 1g"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-admission-1"
  }
}
```

---

# IMPORTANT RECOMMENDATION

For production:

Implement:

```text
MedicationAdministration
```

Because:

```text
MedicationRequest = Order
MedicationAdministration = Actual administration
```

---

# STEP 13 — Monitoring & Vitals

Inpatients require continuous monitoring.

## Resource

- Observation

Examples:

- BP
- Pulse
- SPO2
- Temperature
- Intake/output
- Pain score

---

# Example

```json
{
  "resourceType": "Observation",
  "id": "obs-spo2-1",
  "status": "final",
  "code": {
    "text": "Oxygen Saturation"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "valueQuantity": {
    "value": 95,
    "unit": "%"
  }
}
```

---

# STEP 14 — Diagnostic Workflow

Resources:

- Observation
- DiagnosticReport
- ServiceRequest

---

# Example Flow

```text
Doctor Orders MRI
    ↓
ServiceRequest
    ↓
Radiology Task
    ↓
DiagnosticReport Generated
    ↓
Doctor Review Task
```

---

# STEP 15 — Procedure Workflow

Examples:

- Surgery
- Intubation
- Central line insertion
- Dialysis

---

# Procedure Example

```json
{
  "resourceType": "Procedure",
  "id": "procedure-1",
  "status": "completed",
  "code": {
    "text": "Appendectomy"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-admission-1"
  }
}
```

---

# STEP 16 — ICU / Ward Transfer

VERY IMPORTANT inpatient workflow.

---

# Example

```text
Ward
    ↓
ICU
    ↓
Ward
```

---

# Use Encounter + Location

## Example

```json
{
  "location": [
    {
      "location": {
        "reference": "Location/icu-bed-1"
      },
      "status": "active"
    }
  ]
}
```

---

# Recommended Transfer Task

```json
{
  "resourceType": "Task",
  "id": "task-transfer-1",
  "status": "requested",
  "intent": "order",
  "code": {
    "text": "Transfer Patient to ICU"
  }
}
```

---

# STEP 17 — Clinical Documentation

Strong recommendation:

Use:

```text
DocumentReference
```

Examples:

- progress notes
- surgery notes
- discharge summaries
- scanned reports
- ICU notes
- consent forms

---

# Example

```json
{
  "resourceType": "DocumentReference",
  "id": "doc-progress-note-1",
  "status": "current",
  "type": {
    "text": "Progress Note"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "url": "https://files.example.com/progress-note.pdf"
      }
    }
  ]
}
```

---

# STEP 18 — AI Workflow Opportunities

Inpatient systems are VERY suitable for AI.

---

# AI Use Cases

| AI Agent | Purpose |
|---|---|
| Monitoring Agent | Detect deterioration |
| Documentation Agent | Generate summaries |
| Coding Agent | ICD/CPT suggestions |
| Risk Agent | Sepsis/fall risk |
| Bed Management Agent | Optimize bed allocation |
| Discharge Agent | Predict discharge |
| Pharmacy Agent | Drug interaction checks |

---

# Example AI Workflow

```text
Vitals Updated
    ↓
AI Monitoring Agent
    ↓
Detects abnormal SPO2 trend
    ↓
Creates Urgent Task
    ↓
Doctor Alert
```

---

# STEP 19 — Discharge Planning

Discharge planning often starts EARLY.

Resources:

- CarePlan
- Task
- DocumentReference

---

# Example Tasks

```text
Physiotherapy Evaluation
Medication Counseling
Insurance Clearance
Discharge Summary Preparation
```

---

# STEP 20 — Generate Discharge Summary

Strong recommendation:

Store as:

```text
DocumentReference
```

---

# Example

```json
{
  "resourceType": "DocumentReference",
  "id": "doc-discharge-1",
  "status": "current",
  "type": {
    "text": "Discharge Summary"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "context": {
    "encounter": [
      {
        "reference": "Encounter/encounter-admission-1"
      }
    ]
  }
}
```

---

# STEP 21 — Billing Workflow

Resources:

- Invoice
- Claim
- ClaimResponse

---

# IMPORTANT

Inpatient billing is MUCH more complex.

Includes:

- bed charges
- nursing charges
- ICU charges
- procedures
- labs
- imaging
- medications
- consumables

---

# Invoice Example

```json
{
  "resourceType": "Invoice",
  "id": "invoice-1",
  "status": "issued",
  "subject": {
    "reference": "Patient/patient-1"
  },
  "totalNet": {
    "value": 185000,
    "currency": "INR"
  }
}
```

---

# STEP 22 — Insurance Workflow

## Claim Example

```json
{
  "resourceType": "Claim",
  "id": "claim-1",
  "status": "active",
  "patient": {
    "reference": "Patient/patient-1"
  }
}
```

---

# STEP 23 — Discharge

Encounter becomes:

```json
"status": "finished"
```

EpisodeOfCare becomes:

```json
"status": "finished"
```

---

# COMPLETE INPATIENT FLOW

```text
Patient Registration
    ↓
Coverage Verification
    ↓
Admission Decision
    ↓
EpisodeOfCare Created
    ↓
Bed Allocation
    ↓
Admission Encounter
    ↓
Nursing Assessment
    ↓
Doctor Evaluation
    ↓
Orders
    ↓
Medication Administration
    ↓
Monitoring
    ↓
Transfers
    ↓
Procedures
    ↓
Progress Notes
    ↓
Discharge Planning
    ↓
Invoice
    ↓
Claim
    ↓
Discharge Summary
    ↓
Discharge
```

---

# IMPORTANT TASK WORKFLOWS

# Recommended Task Categories

| Category | Purpose |
|---|---|
| admission | Admission processing |
| nursing | Nursing workflows |
| medication | Medication administration |
| lab | Lab workflows |
| radiology | Imaging workflows |
| transfer | Bed/ward transfer |
| surgery | OR workflows |
| discharge | Discharge planning |
| billing | Billing workflows |
| insurance | Claims processing |

---

# BED MANAGEMENT ARCHITECTURE

VERY IMPORTANT.

---

# Recommended Location Types

```text
Hospital
Building
Floor
Ward
Room
Bed
ICU Bed
Operation Theater
```

---

# Recommended Bed States

```text
available
occupied
cleaning
reserved
maintenance
blocked
```

---

# RECOMMENDED AI WORKFLOWS

# 1. Deterioration Detection

```text
Vitals trend analysis
```

---

# 2. Bed Optimization

```text
Predict discharges
Suggest bed assignments
```

---

# 3. Clinical Summaries

```text
Generate progress notes
Generate discharge summaries
```

---

# 4. Insurance Automation

```text
Predict denials
Generate claims
Validate documentation
```

---

# RECOMMENDED EVENT-DRIVEN ARCHITECTURE

# Suggested Events

```text
patient.admitted
bed.assigned
encounter.started
medication.administered
vitals.recorded
procedure.completed
patient.transferred
patient.discharged
invoice.generated
claim.submitted
```

---

# RECOMMENDED PRODUCTION RESOURCE SET

Strongly recommended inpatient resources:

```text
Patient
Coverage
Encounter
EpisodeOfCare
Location
Task
Observation
Condition
CarePlan
ServiceRequest
Procedure
Medication
MedicationRequest
MedicationAdministration
DiagnosticReport
DocumentReference
Invoice
Claim
ClaimResponse
AllergyIntolerance
Provenance
AuditEvent
```

---

# IMPORTANT ARCHITECTURAL PRINCIPLES

# 1. EpisodeOfCare = Hospitalization

```text
One hospitalization
=
One EpisodeOfCare
```

---

# 2. Encounter = Clinical Interaction

```text
Admission
Ward
ICU
Transfer
Discharge
```

---

# 3. Location = Physical Tracking

Tracks:

- bed
- ward
- ICU
- OT
- room

---

# 4. Task = Workflow Orchestration

Tracks:

- nursing
- medications
- transfers
- billing
- discharge

---

# 5. DocumentReference = Clinical Documents

Stores:

- discharge summaries
- progress notes
- scanned reports
- surgical notes

---

# FINAL ARCHITECTURE RECOMMENDATION

```text
FHIR Resources = Clinical Truth
EpisodeOfCare = Hospitalization Context
Task = Workflow Engine
Location = Physical Hospital Tracking
AI Agents = Automation Layer
Events = Communication Layer
```

---

# FINAL SUMMARY

Inpatient workflow is MUCH more complex than outpatient.

The most important additions are:

1. EpisodeOfCare
2. Location
3. Task
4. CarePlan
5. MedicationAdministration
6. Coverage
7. DocumentReference
8. AI Monitoring Workflows

The best architecture is:

```text
FHIR + Task + Events + AI + Location + EpisodeOfCare
```

This architecture scales well for:

- enter