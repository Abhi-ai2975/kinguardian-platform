# FHIR Telemedicine Workflow Architecture Guide

# Overview

This document explains how to design a complete telemedicine workflow using FHIR.

This workflow supports:

- Online consultations
- Hybrid consultation models
- Offline fallback to OP workflow
- Patient-uploaded reports
- Doctor-uploaded reports
- AI-assisted workflows
- Video consultation workflows
- Prescription workflows
- Diagnostic workflows
- Follow-up workflows

This guide also explains:

- how DocumentReference should be used
- how historical reports should be handled
- how present consultation reports should be handled
- relationship between telemedicine and outpatient workflows

---

# Core Workflow Principle

Your architecture should support:

```text
Consultation Mode
    ├── online (telemedicine)
    └── offline (outpatient/in-person)
```

IMPORTANT:

Telemedicine and outpatient should NOT be completely separate systems.

They should share:

- Patient
- Encounter
- Observation
- MedicationRequest
- DiagnosticReport
- Condition
- Invoice
- Claim
- Task

The main difference is:

```text
Encounter delivery mode
```

---

# Recommended Encounter Types

Use Encounter.class.

## Telemedicine

```json
"class": {
  "code": "VR"
}
```

Meaning:

```text
Virtual encounter
```

---

## Outpatient

```json
"class": {
  "code": "AMB"
}
```

Meaning:

```text
Ambulatory / in-person
```

---

# HYBRID WORKFLOW MODEL

Recommended architecture:

```text
Appointment
    ↓
Consultation Type Decision
    ├── Online → Telemedicine Workflow
    └── Offline → Outpatient Workflow
```

---

# TELEMEDICINE HIGH LEVEL FLOW

```text
Patient Registers
    ↓
Patient Uploads Reports
    ↓
Online Appointment Booking
    ↓
Virtual Encounter Starts
    ↓
AI Intake Analysis
    ↓
Doctor Consultation
    ↓
Observations + Conditions
    ↓
Lab/Imaging Orders
    ↓
Prescription Generation
    ↓
Doctor Uploads Consultation Notes
    ↓
Invoice + Claim
    ↓
Follow-up Tasks
```

---

# REQUIRED RESOURCES FOR TELEMEDICINE

| Resource | Purpose |
|---|---|
| Patient | Patient record |
| Appointment | Online booking |
| Encounter | Virtual consultation |
| Practitioner | Doctor |
| QuestionnaireResponse | Intake forms |
| Observation | Clinical findings |
| Condition | Diagnoses |
| ServiceRequest | Lab/referral orders |
| DiagnosticReport | Test reports |
| MedicationRequest | Prescriptions |
| DocumentReference | Reports/files/documents |
| Invoice | Billing |
| Claim | Insurance |
| Task | Workflow orchestration |

---

# VERY IMPORTANT RESOURCE

# DocumentReference

This is CRITICAL for telemedicine.

You should strongly implement it.

Without DocumentReference:

- report uploads become messy
- PDFs cannot be managed properly
- prescriptions cannot be attached
- scanned records become difficult
- AI document analysis becomes harder

---

# What DocumentReference Stores

DocumentReference stores:

- PDFs
- scanned reports
- discharge summaries
- prescriptions
- radiology images
- consultation notes
- lab reports
- ECG reports
- insurance documents
- external medical records

---

# IMPORTANT QUESTION

# Should reports be past or present?

ANSWER:

```text
BOTH
```

You NEED both.

---

# 1. Historical Reports

These are uploaded BEFORE consultation.

Examples:

- old lab reports
- old prescriptions
- MRI scans
- discharge summaries
- historical ECGs
- previous diagnoses

Purpose:

```text
Clinical context for doctor
```

---

# Example Flow

```text
Patient uploads old reports
    ↓
DocumentReference created
    ↓
Doctor reviews before consultation
```

---

# Example Historical Report

```json
{
  "resourceType": "DocumentReference",
  "id": "doc-old-report-1",
  "status": "current",
  "type": {
    "text": "Historical Lab Report"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "date": "2026-05-01T10:00:00+05:30",
  "description": "CBC report from previous hospital",
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "url": "https://files.example.com/reports/cbc-old.pdf",
        "title": "CBC Report"
      }
    }
  ]
}
```

---

# 2. Current Consultation Documents

Generated DURING or AFTER consultation.

Examples:

- consultation summary
- e-prescription
- doctor notes
- AI summaries
- encounter summary
- diagnostic reports

Purpose:

```text
Current episode documentation
```

---

# Example Current Consultation Report

```json
{
  "resourceType": "DocumentReference",
  "id": "doc-consult-summary-1",
  "status": "current",
  "type": {
    "text": "Telemedicine Consultation Summary"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "context": {
    "encounter": [
      {
        "reference": "Encounter/encounter-1"
      }
    ]
  },
  "date": "2026-05-17T14:00:00+05:30",
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "url": "https://files.example.com/consult/summary.pdf",
        "title": "Consultation Summary"
      }
    }
  ]
}
```

---

# RECOMMENDED DOCUMENT CATEGORIES

Use categories.

| Category | Example |
|---|---|
| historical-report | Old reports |
| consultation-note | Doctor notes |
| prescription | E-prescription |
| lab-report | Diagnostic reports |
| radiology-report | Imaging |
| discharge-summary | Hospital discharge |
| insurance-document | Insurance papers |
| consent-form | Telemedicine consent |
| ai-summary | AI-generated notes |

---

# TELEMEDICINE APPOINTMENT FLOW

# STEP 1 — Patient Registration

## Example

```json
{
  "resourceType": "Patient",
  "id": "patient-1",
  "name": [
    {
      "text": "Rahul Sharma"
    }
  ]
}
```

---

# STEP 2 — Upload Historical Reports

Patient uploads:

- old reports
- scans
- prescriptions
- images

Create:

```text
DocumentReference
```

---

# STEP 3 — Telemedicine Appointment Booking

## Example

```json
{
  "resourceType": "Appointment",
  "id": "appointment-1",
  "status": "booked",
  "serviceType": [
    {
      "text": "Telemedicine Consultation"
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

# STEP 4 — Create Telemedicine Encounter

## Example

```json
{
  "resourceType": "Encounter",
  "id": "encounter-1",
  "status": "in-progress",
  "class": {
    "code": "VR"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "appointment": [
    {
      "reference": "Appointment/appointment-1"
    }
  ]
}
```

---

# STEP 5 — Intake Questionnaire

Patient fills symptoms form.

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
      "text": "Symptoms",
      "answer": [
        {
          "valueString": "Fever and cough"
        }
      ]
    }
  ]
}
```

---

# STEP 6 — AI Intake Analysis (Optional)

AI agent analyzes:

- symptoms
- uploaded reports
- historical conditions

Outputs:

- urgency score
- suggested specialty
- doctor briefing

---

# STEP 7 — Doctor Consultation

Doctor reviews:

- uploaded historical reports
- live symptoms
- questionnaire
- previous encounters

Doctor records:

- Observation
- Condition

---

# Observation Example

```json
{
  "resourceType": "Observation",
  "id": "obs-1",
  "status": "final",
  "code": {
    "text": "Reported Temperature"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "valueString": "100 F"
}
```

---

# Condition Example

```json
{
  "resourceType": "Condition",
  "id": "condition-1",
  "clinicalStatus": {
    "text": "active"
  },
  "code": {
    "text": "Upper Respiratory Infection"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  }
}
```

---

# STEP 8 — Lab Orders

Doctor creates ServiceRequest.

## Example

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
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  }
}
```

---

# STEP 9 — Prescription Generation

## MedicationRequest Example

```json
{
  "resourceType": "MedicationRequest",
  "id": "medreq-1",
  "status": "active",
  "intent": "order",
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "medicationCodeableConcept": {
    "text": "Paracetamol 500mg"
  }
}
```

---

# STEP 10 — Generate E-Prescription PDF

Strong recommendation:

Generate PDF prescription.

Store as:

```text
DocumentReference
```

---

# Prescription Document Example

```json
{
  "resourceType": "DocumentReference",
  "id": "doc-prescription-1",
  "status": "current",
  "type": {
    "text": "E-Prescription"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "context": {
    "encounter": [
      {
        "reference": "Encounter/encounter-1"
      }
    ]
  },
  "content": [
    {
      "attachment": {
        "contentType": "application/pdf",
        "url": "https://files.example.com/prescriptions/rx-1.pdf"
      }
    }
  ]
}
```

---

# STEP 11 — Doctor Consultation Notes

Strong recommendation:

Doctor notes should also be stored as:

```text
DocumentReference
```

---

# STEP 12 — AI Summary Generation

AI can generate:

- encounter summary
- patient-friendly summary
- follow-up instructions

Store using:

```text
DocumentReference
```

---

# STEP 13 — Billing

Generate:

- Invoice
- Claim
- ClaimResponse

Same as outpatient workflow.

---

# STEP 14 — Follow-up Workflow

Doctor may recommend:

- another telemedicine visit
- physical OP visit
- emergency escalation
- lab follow-up

---

# IMPORTANT HYBRID WORKFLOW

# Online → Offline Transition

Very important pattern.

Example:

```text
Telemedicine consultation
    ↓
Doctor suspects serious issue
    ↓
Create OP Appointment
    ↓
Physical consultation required
```

---

# Example Workflow

```text
Virtual Encounter
    ↓
Doctor detects chest pain risk
    ↓
Task: Emergency OP Evaluation
    ↓
Create In-Person Appointment
    ↓
Follow Outpatient Workflow
```

---

# IMPORTANT DESIGN PRINCIPLE

Telemedicine should NOT duplicate outpatient.

Instead:

```text
Telemedicine = Another Encounter Mode
```

Same resources.

Different interaction model.

---

# RECOMMENDED TELEMEDICINE-SPECIFIC FIELDS

# Appointment

Add extensions or custom fields:

| Field | Purpose |
|---|---|
| consultationMode | online/offline |
| videoMeetingUrl | video link |
| platform | Zoom/Meet/WebRTC |
| waitingRoomStatus | queue handling |

---

# Encounter

Add:

| Field | Purpose |
|---|---|
| virtualPlatform | platform used |
| recordingAvailable | recording metadata |
| telemedicineConsent | consent tracking |

---

# DOCUMENT STORAGE ARCHITECTURE

# Recommended Pattern

```text
FHIR stores metadata
Actual files stored in object storage
```

Examples:

- S3
- MinIO
- Cloudflare R2
- GCS

---

# Recommended Document Flow

```text
Upload File
    ↓
Store in Object Storage
    ↓
Generate Secure URL
    ↓
Create DocumentReference
```

---

# RECOMMENDED SECURITY

VERY IMPORTANT for telemedicine.

Protect:

- uploaded reports
- prescriptions
- video session metadata
- AI summaries
- consultation notes

---

# Recommended Security Features

| Feature | Purpose |
|---|---|
| signed URLs | secure document access |
| expiring links | prevent leaks |
| audit logging | compliance |
| encryption | privacy |
| RBAC | access control |

---

# AI WORKFLOWS FOR TELEMEDICINE

Very powerful area.

---

# AI Intake Agent

Analyzes:

- uploaded reports
- symptoms
- historical conditions

Outputs:

- triage
- urgency
- doctor summary

---

# AI Report Summarization

AI reads uploaded PDFs.

Generates:

- structured findings
- trend summaries
- alerts

---

# AI Follow-Up Agent

Example:

```text
Lab abnormality detected
    ↓
AI creates follow-up task
    ↓
Patient notified
```

---

# TELEMEDICINE TASK WORKFLOW

## Example

```text
Appointment Booked
    ↓
Task: Verify Uploaded Reports
    ↓
Task: AI Intake Summary
    ↓
Tas