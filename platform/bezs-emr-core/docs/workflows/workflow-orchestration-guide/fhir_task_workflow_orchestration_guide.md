# FHIR Task Workflow Orchestration Guide

# Overview

This document explains how to use the FHIR Task resource as the orchestration engine for hospital workflows.

This is one of the most important resources for enterprise-grade systems.

Without Task:

- Workflow tracking becomes difficult
- Queue management becomes weak
- Multi-department coordination becomes messy
- AI workflow orchestration becomes hard
- Automation pipelines become fragmented

With Task:

You can build:

- Queue systems
- AI workflows
- Hospital operations pipelines
- Multi-step workflows
- BPM engines
- Workflow automation
- Human approval systems
- Async clinical workflows

---

# Why Task is Important

FHIR resources like:

- Observation
- Condition
- MedicationRequest
- Procedure
- ServiceRequest

store clinical data.

But they DO NOT manage workflow state.

Example:

A ServiceRequest says:

```text
"Do CBC test"
```

But it does not track:

- waiting for sample
- sample collected
- sample in lab
- processing
- verified
- completed

Task solves this.

---

# What Task Represents

Task represents:

```text
A unit of work
```

Examples:

- Collect blood sample
- Call patient
- Review lab report
- Approve insurance
- Dispense medication
- Start consultation
- Move patient to room
- Upload report
- AI summarize encounter

---

# Recommended Task Architecture

```text
Business Event
    ↓
Create Task
    ↓
Assign Task
    ↓
Track Status
    ↓
Perform Work
    ↓
Complete Task
    ↓
Trigger Next Task
```

---

# Recommended Task Status Lifecycle

Use these statuses consistently.

| Status | Meaning |
|---|---|
| requested | Created but not accepted |
| ready | Ready to start |
| in-progress | Currently executing |
| on-hold | Paused |
| completed | Finished |
| failed | Failed |
| cancelled | Cancelled |

---

# Recommended Task Categories

You should create internal workflow categories.

| Category | Purpose |
|---|---|
| registration | Patient registration |
| triage | Nursing/vitals |
| consultation | Doctor consultation |
| laboratory | Lab workflows |
| radiology | Imaging workflows |
| pharmacy | Medication dispensing |
| billing | Billing operations |
| insurance | Claim processing |
| ai | AI-generated workflows |
| admin | Administrative operations |

---

# CORE TASK RELATIONSHIPS

```text
Task
    ├── Patient
    ├── Encounter
    ├── Appointment
    ├── ServiceRequest
    ├── Procedure
    ├── DiagnosticReport
    ├── MedicationRequest
    ├── Practitioner
    └── Organization
```

---

# OUTPATIENT TASK FLOW

# High-Level OP Flow

```text
Appointment Booked
    ↓
Task: Check-in Pending
    ↓
Task: Collect Vitals
    ↓
Task: Doctor Consultation
    ↓
Task: Lab Collection
    ↓
Task: Lab Processing
    ↓
Task: Doctor Review
    ↓
Task: Pharmacy Processing
    ↓
Task: Billing
    ↓
Task: Insurance Processing
    ↓
Task: Encounter Completion
```

---

# STEP 1 — Appointment Booked

Appointment gets created.

## Appointment Example

```json
{
  "resourceType": "Appointment",
  "id": "appointment-1",
  "status": "booked",
  "participant": [
    {
      "actor": {
        "reference": "Patient/patient-1"
      },
      "status": "accepted"
    }
  ]
}
```

---

# STEP 2 — Create Check-in Task

## Purpose

Front desk should check in patient.

## Task Example

```json
{
  "resourceType": "Task",
  "id": "task-checkin-1",
  "status": "requested",
  "intent": "order",
  "code": {
    "text": "Patient Check-in"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "focus": {
    "reference": "Appointment/appointment-1"
  },
  "owner": {
    "reference": "Organization/frontdesk"
  }
}
```

---

# STEP 3 — Check-in Completed

Task becomes:

```json
"status": "completed"
```

Then system creates:

- Encounter
- Next task

---

# STEP 4 — Create Encounter

## Example

```json
{
  "resourceType": "Encounter",
  "id": "encounter-1",
  "status": "in-progress",
  "subject": {
    "reference": "Patient/patient-1"
  }
}
```

---

# STEP 5 — Create Vitals Task

## Purpose

Nurse collects vitals.

## Example

```json
{
  "resourceType": "Task",
  "id": "task-vitals-1",
  "status": "ready",
  "intent": "order",
  "code": {
    "text": "Collect Vitals"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "owner": {
    "reference": "Practitioner/nurse-1"
  }
}
```

---

# STEP 6 — Nurse Records Vitals

## Observation Example

```json
{
  "resourceType": "Observation",
  "id": "obs-temp-1",
  "status": "final",
  "code": {
    "text": "Body Temperature"
  },
  "subject": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "valueQuantity": {
    "value": 98.6,
    "unit": "F"
  }
}
```

---

# STEP 7 — Complete Vitals Task

Task status:

```json
"status": "completed"
```

System triggers next task.

---

# STEP 8 — Doctor Consultation Task

## Example

```json
{
  "resourceType": "Task",
  "id": "task-consult-1",
  "status": "ready",
  "intent": "order",
  "code": {
    "text": "Doctor Consultation"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "owner": {
    "reference": "Practitioner/prac-1"
  }
}
```

---

# STEP 9 — Doctor Orders Lab

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
  }
}
```

---

# STEP 10 — Create Lab Collection Task

This is where Task becomes powerful.

## Example

```json
{
  "resourceType": "Task",
  "id": "task-lab-collect-1",
  "status": "requested",
  "intent": "order",
  "code": {
    "text": "Collect Blood Sample"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "focus": {
    "reference": "ServiceRequest/sr-cbc-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  },
  "owner": {
    "reference": "Organization/laboratory"
  }
}
```

---

# STEP 11 — Sample Collection Workflow

## Workflow States

```text
requested
    ↓
ready
    ↓
in-progress
    ↓
completed
```

---

# STEP 12 — Create Lab Processing Task

Once sample collected:

```text
Task: Lab Processing
```

## Example

```json
{
  "resourceType": "Task",
  "id": "task-lab-process-1",
  "status": "ready",
  "intent": "order",
  "code": {
    "text": "Process CBC"
  },
  "focus": {
    "reference": "ServiceRequest/sr-cbc-1"
  },
  "for": {
    "reference": "Patient/patient-1"
  }
}
```

---

# STEP 13 — Diagnostic Result Generation

Lab generates:

- Observation
- DiagnosticReport

## DiagnosticReport Example

```json
{
  "resourceType": "DiagnosticReport",
  "id": "dr-cbc-1",
  "status": "final",
  "subject": {
    "reference": "Patient/patient-1"
  },
  "basedOn": [
    {
      "reference": "ServiceRequest/sr-cbc-1"
    }
  ]
}
```

---

# STEP 14 — Create Doctor Review Task

## Purpose

Doctor reviews report.

## Example

```json
{
  "resourceType": "Task",
  "id": "task-review-1",
  "status": "ready",
  "intent": "order",
  "code": {
    "text": "Review Lab Result"
  },
  "focus": {
    "reference": "DiagnosticReport/dr-cbc-1"
  },
  "owner": {
    "reference": "Practitioner/prac-1"
  }
}
```

---

# STEP 15 — Prescription Workflow

Doctor prescribes medication.

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
  "medicationCodeableConcept": {
    "text": "Paracetamol 500mg"
  }
}
```

---

# STEP 16 — Create Pharmacy Task

## Example

```json
{
  "resourceType": "Task",
  "id": "task-pharmacy-1",
  "status": "requested",
  "intent": "order",
  "code": {
    "text": "Dispense Medication"
  },
  "focus": {
    "reference": "MedicationRequest/medreq-1"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "owner": {
    "reference": "Organization/pharmacy"
  }
}
```

---

# STEP 17 — Billing Task

## Purpose

Billing team prepares invoice.

## Example

```json
{
  "resourceType": "Task",
  "id": "task-billing-1",
  "status": "ready",
  "intent": "order",
  "code": {
    "text": "Generate Invoice"
  },
  "for": {
    "reference": "Patient/patient-1"
  },
  "encounter": {
    "reference": "Encounter/encounter-1"
  }
}
```

---

# STEP 18 — Invoice Generation

## Invoice Example

```json
{
  "resourceType": "Invoice",
  "id": "invoice-1",
  "status": "issued",
  "subject": {
    "reference": "Patient/patient-1"
  },
  "totalNet": {
    "value": 4500,
    "currency": "INR"
  }
}
```

---

# STEP 19 — Insurance Workflow

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

# STEP 20 — Insurance Approval Task

## Example

```json
{
  "resourceType": "Task",
  "id": "task-insurance-1",
  "status": "requested",
  "intent": "order",
  "code": {
    "text": "Insurance Approval"
  },
  "focus": {
    "reference": "Claim/claim-1"
  }
}
```

---

# TASK CHAINING

One of the strongest patterns.

```text
Task A completes
    ↓
Create Task B
    ↓
Task B completes
    ↓
Create Task C
```

---

# Recommended Event-Driven Architecture

## Recommended Events

```text
task.created
task.assigned
task.started
task.completed
task.failed
```

Clinical events:

```text
appointment.booked
encounter.started
service_request.created
diagnostic_report.completed
invoice.generated
claim.submitted
```

---

# AI WORKFLOW INTEGRATION

Task is PERFECT for AI orchestration.

---

# Example AI Workflow

```text
Encounter Completed
    ↓
AI Task Created
    ↓
Generate Encounter Summary
    ↓
Generate Coding Suggestions
    ↓
Generate Claim Draft
    ↓
Human Review Task
```

---

# AI Task Example

```json
{
  "resourceType": "Task",
  "id": "task-ai-summary-1",
  "status": "requested",
  "intent": "order",
  "code": {
    "text": "AI Generate Encounter Summary"
  },
  "focus": {
    "reference": "Encounter/encounter-1"
  },
  "owner": {
    "display": "AI Workflow Engine"
  }
}
```

---

# QUEUE MANAGEMENT WITH TASK

Task can power:

- doctor queue
- nursing queue
- pharmacy queue
- lab queue
- billing queue

---

# Example Queue Query

```text
GET /Task?status=ready&code=Collect Vitals
```

Returns:

```text
Patients waiting for vitals
```

---

# PRIORITY MANAGEMENT

Task supports priority.

## Example

```json
"priority": "urgent"
```

Useful for:

- STAT labs
- Emergency review
- Critical findings

---

# ESCALATION WORKFLOWS

Example:

```text
Task not completed within 30 mins
    ↓
Escalate to supervisor
    ↓
Create escalation task
```

---

# TASK OWNERSHIP MODELS

# 1. Human Assignment

```text
Task → Practitioner
```

Example:

```text
Assigned to Dr. Kumar
```

---

# 2. Department Assignment

```text
Task → Organization
```

Example:

```text
Assigned to Laboratory
```

---

# 3. AI Assignment

```text
Task → AI Agent
```

Example:

```text
AI summarization
```

---

# RECOMMENDED TASK SEARCHES

# Tasks for Patient

```text
GET /Task?patient=Patient/patient-1
```

---

# Tasks for Encounter

```text
GET /Task?encounter=Encounter/encounter-1
```

---

# Pending Tasks

```text
GET /Task?status=requested
```

---

# Department Queue

```text
GET /Task?owner=Organization/laboratory
```

---

# Recommended Production Architecture

# Suggested Modules

```text
workflow/
    task_engine
    task_rules
    queue_management
    escalation_engine
    automation_engine
    ai_orchestration
```

---

# Suggested Internal Workflow Engine

```text
Event Bus
    ↓
Workflow Rules Engine
    ↓
Task Generator
    ↓
Task Queue
    ↓
Notification Engine
```

---

# RECOMMENDED DATABASE TABLES

# Core Tables

```text
task
task_history
task_assignment
task_comment
task_event
task_queue
```

---

# Recommended Task Metadata

Useful additional fields:

| Field | Purpose |
|---|---|
| queue_number | Queue management |
| sla_due_time | Escalation/SLA |
| retry_count | Retry workflows |
| workflow_stage | Tracking |
| automation_source | AI/manual/system |
| parent_task_id | Task hierarchy |

---

# TASK VS SERVICE REQUEST

Very important distinction.

| ServiceRequest | Task |
|---|---|
| Clinical order | Workflow action |
| "Do CBC" | "Collect sample" |
| Medical intent | Operational execution |
| Clinical domain | Workflow domain |

---

# TASK VS APPOINTMENT

| Appointment | Task |
|---|---|
| Scheduled visit | Action item |
| Time reservation | Unit of work |
| Scheduling | Operations |

---

# TASK HIERARCHY EXAMPLE

```text
Encounter Workflow Task
    ├── Vitals Task
    ├── Consultation Task
    ├── Lab Task
    │       ├── Sample Collection
    │       ├── Processing
    │       └── Verification
    ├── Pharmacy Task
    └── Billing Task
```

---

# FINAL RECOMMENDED RESOURCES FOR WORKFLOW ENGINE

Strongly recommended set:

```text
Task
Appointment
Encounter
ServiceRequest
DiagnosticReport
Procedure
MedicationRequest
Observation
Claim
Invoice
Practitioner
Organization
Location
```

---

# FINAL ARCHITECTURE RECOMMENDATION

If you want enterprise-grade FHIR workflows:

Use:

```text
FHIR Resources = Clinical Data Layer
Task Resource = Workflow Layer
Event Bus = Integration Layer
AI Agents = Automation Layer
```

This architecture scales VERY well.

---

# FINAL SUMMARY

Task is the missing orchestration layer between:

```text
FHIR Clinical Data
AND
Hospital Operations
```

Task enables:

- workflow orchestration
- queues
- automation
- AI workflows
- async processing
- escalations
- BPM engines
- human approvals
- operational tracking

Without Task:

FHIR becomes mostly a clinical storage model.

With Task:

FHIR becomes a full operational healthcare platform.

