# Outpatient Workflow — Accurate Mock Data

All request bodies match the actual `CreateSchema` field names and types in this application.
Fields are **snake_case** as accepted by the API. All IDs are public sequence IDs.

**Scenario:** Rahul Sharma visits City Care Hospital for chest pain.
Dr. Arjun Kumar (Cardiologist) conducts the full outpatient visit on 2026-05-20.

---

## Sequence ID Reference

| Resource                          | Public ID |
| --------------------------------- | --------- |
| Organization — City Care Hospital | 190001    |
| Practitioner — Dr. Arjun Kumar    | 30001     |
| PractitionerRole                  | 140001    |
| HealthcareService — Cardiology OP | 150001    |
| Schedule                          | 200001    |
| Slot (10:00 AM)                   | 220001    |
| Patient — Rahul Sharma            | 10001     |
| QuestionnaireResponse             | 60001     |
| Appointment                       | 40001     |
| Encounter                         | 20001     |
| Observation — BP                  | 160001    |
| Observation — Pulse               | 160002    |
| Observation — Weight              | 160003    |
| Observation — Temperature         | 160004    |
| Observation — SpO2                | 160005    |
| Condition — Hypertension          | 120001    |
| Condition — Chest pain            | 120002    |
| ServiceRequest — CBC              | 80001     |
| ServiceRequest — ECG              | 80002     |
| Observation — Hemoglobin          | 160006    |
| Observation — WBC                 | 160007    |
| Observation — Platelets           | 160008    |
| DiagnosticReport — CBC            | 110001    |
| Procedure — ECG                   | 100001    |
| MedicationRequest — Amlodipine    | 90001     |
| MedicationRequest — Aspirin       | 90002     |
| DeviceRequest — Glucometer        | 130001    |
| Invoice                           | 210001    |
| Claim                             | 170001    |
| ClaimResponse                     | 180001    |

---

## Creation Order

Resources must be created in this order so all references resolve:

```
Phase 1 — Admin:    Organization → Practitioner → PractitionerRole → HealthcareService
Phase 2 — Schedule: Schedule → Slot
Phase 3 — Patient:  Patient → (sub-resources: name, telecom, address)
Phase 4 — Pre-visit: QuestionnaireResponse → Appointment
Phase 5 — Clinical: Encounter → Observations (vitals) → Conditions
                    → ServiceRequests → Observations (labs) → DiagnosticReport
                    → Procedure → MedicationRequests → DeviceRequest
Phase 6 — Billing:  Invoice → Claim → ClaimResponse
Phase 7 — Close:    PATCH Encounter (status = completed)
```

---

## STEP 1 — Organization

**POST** `/organizations`

```json
{
  "name": "City Care Hospital",
  "active": true,
  "telecom": [
    {
      "system": "phone",
      "value": "+91-9876543210",
      "use": "work"
    },
    {
      "system": "email",
      "value": "info@citycarehosp.in",
      "use": "work"
    }
  ],
  "address": [
    {
      "use": "work",
      "type": "physical",
      "line": "12, Anna Salai",
      "city": "Chennai",
      "state": "Tamil Nadu",
      "postal_code": "600002",
      "country": "India"
    }
  ]
}
```

> Returns `organization_id: 190001`

---

## STEP 2 — Practitioner

**POST** `/practitioners`

> Practitioner top-level only has scalar fields. Name and qualification are posted as sub-resources after creation.

```json
{
  "active": true,
  "gender": "male",
  "birth_date": "1980-03-15"
}
```

> Returns `practitioner_id: 30001`

**POST** `/practitioners/30001/names`

```json
{
  "use": "official",
  "text": "Dr. Arjun Kumar",
  "family": "Kumar",
  "given": "Arjun",
  "prefix": "Dr."
}
```

**POST** `/practitioners/30001/qualifications`

```json
{
  "code_text": "MBBS"
}
```

**POST** `/practitioners/30001/qualifications`

```json
{
  "code_text": "DM Cardiology"
}
```

---

## STEP 3 — PractitionerRole

**POST** `/practitioner-roles`

```json
{
  "practitioner": "Practitioner/30001",
  "practitioner_display": "Dr. Arjun Kumar",
  "organization": "Organization/190001",
  "organization_display": "City Care Hospital",
  "active": true,
  "specialty": [
    {
      "system": "http://snomed.info/sct",
      "code": "394579002",
      "display": "Cardiology",
      "text": "Cardiology"
    }
  ],
  "availability": [
    {
      "available_time": [
        {
          "days_of_week": "mon",
          "available_start_time": "09:00:00",
          "available_end_time": "17:00:00"
        },
        {
          "days_of_week": "tue",
          "available_start_time": "09:00:00",
          "available_end_time": "17:00:00"
        },
        {
          "days_of_week": "wed",
          "available_start_time": "09:00:00",
          "available_end_time": "17:00:00"
        },
        {
          "days_of_week": "thu",
          "available_start_time": "09:00:00",
          "available_end_time": "17:00:00"
        },
        {
          "days_of_week": "fri",
          "available_start_time": "09:00:00",
          "available_end_time": "17:00:00"
        }
      ]
    }
  ]
}
```

> Returns `practitioner_role_id: 140001`

---

## STEP 4 — HealthcareService

**POST** `/healthcare-services`

```json
{
  "provided_by": "Organization/190001",
  "provided_by_display": "City Care Hospital",
  "active": true,
  "name": "Cardiology Outpatient Consultation",
  "comment": "OP consultation for cardiac conditions. Hypertension, arrhythmia, and heart failure.",
  "appointment_required": true,
  "specialty": [
    {
      "system": "http://snomed.info/sct",
      "code": "394579002",
      "display": "Cardiology",
      "text": "Cardiology"
    }
  ],
  "telecom": [
    {
      "system": "phone",
      "value": "+91-9876500001",
      "use": "work"
    }
  ],
  "available_time": [
    {
      "days_of_week": "mon",
      "available_start_time": "09:00:00",
      "available_end_time": "13:00:00"
    },
    {
      "days_of_week": "tue",
      "available_start_time": "09:00:00",
      "available_end_time": "13:00:00"
    },
    {
      "days_of_week": "wed",
      "available_start_time": "09:00:00",
      "available_end_time": "13:00:00"
    },
    {
      "days_of_week": "thu",
      "available_start_time": "09:00:00",
      "available_end_time": "13:00:00"
    },
    {
      "days_of_week": "fri",
      "available_start_time": "09:00:00",
      "available_end_time": "13:00:00"
    }
  ]
}
```

> Returns `healthcare_service_id: 150001`

---

## STEP 5 — Schedule

**POST** `/schedules`

```json
{
  "active": true,
  "comment": "Cardiology OP schedule for May 2026 — Dr. Arjun Kumar",
  "planning_horizon_start": "2026-05-01T09:00:00+05:30",
  "planning_horizon_end": "2026-05-31T17:00:00+05:30",
  "actor": [
    {
      "reference": "Practitioner/30001",
      "display": "Dr. Arjun Kumar"
    },
    {
      "reference": "HealthcareService/150001",
      "display": "Cardiology Outpatient Consultation"
    }
  ]
}
```

> Returns `schedule_id: 200001`

---

## STEP 6 — Slots

**POST** `/slots` (10:00 AM slot)

```json
{
  "schedule": "Schedule/200001",
  "schedule_display": "Cardiology OP — Dr. Arjun Kumar",
  "status": "free",
  "start": "2026-05-20T10:00:00+05:30",
  "end": "2026-05-20T10:15:00+05:30",
  "comment": "10:00 AM cardiology slot"
}
```

> Returns `slot_id: 220001`

**POST** `/slots` (10:15 AM slot)

```json
{
  "schedule": "Schedule/200001",
  "schedule_display": "Cardiology OP — Dr. Arjun Kumar",
  "status": "free",
  "start": "2026-05-20T10:15:00+05:30",
  "end": "2026-05-20T10:30:00+05:30",
  "comment": "10:15 AM cardiology slot"
}
```

> Returns `slot_id: 220002`

---

## STEP 7 — Patient Registration

**POST** `/patients`

> Core demographics only. Name, telecom, address posted as sub-resources below.

```json
{
  "active": true,
  "gender": "male",
  "birth_date": "1995-04-12",
  "managing_organization": "Organization/190001",
  "managing_organization_display": "City Care Hospital"
}
```

> Returns `patient_id: 10001`

**POST** `/patients/10001/names`

```json
{
  "use": "official",
  "text": "Rahul Sharma",
  "family": "Sharma",
  "given": "Rahul"
}
```

**POST** `/patients/10001/telecoms`

```json
{
  "system": "phone",
  "value": "+91-9988776655",
  "use": "mobile"
}
```

**POST** `/patients/10001/telecoms`

```json
{
  "system": "email",
  "value": "rahul.sharma@example.com",
  "use": "home"
}
```

**POST** `/patients/10001/addresses`

```json
{
  "use": "home",
  "type": "physical",
  "text": "45, T Nagar, Chennai, Tamil Nadu 600017",
  "line": "45, T Nagar",
  "city": "Chennai",
  "state": "Tamil Nadu",
  "postal_code": "600017",
  "country": "India"
}
```

---

## STEP 8 — Intake Form (QuestionnaireResponse)

**POST** `/questionnaire-responses`

> `questionnaire` field is **required** (canonical URL of the Questionnaire resource).
> `status` is **required**.

```json
{
  "questionnaire": "https://citycarehosp.in/fhir/Questionnaire/op-intake-form",
  "status": "completed",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "authored": "2026-05-20T09:30:00+05:30",
  "item": [
    {
      "link_id": "1",
      "text": "Chief Complaint",
      "answer": [{ "value_string": "Chest pain for the past 2 days" }]
    },
    {
      "link_id": "2",
      "text": "Pain location",
      "answer": [{ "value_string": "Central chest, radiates to left arm" }]
    },
    {
      "link_id": "3",
      "text": "Pain severity (1–10)",
      "answer": [{ "value_integer": 6 }]
    },
    {
      "link_id": "4",
      "text": "Previous medical history",
      "answer": [
        {
          "value_string": "No known chronic conditions. Father has hypertension."
        }
      ]
    },
    {
      "link_id": "5",
      "text": "Current medications",
      "answer": [{ "value_string": "None" }]
    },
    {
      "link_id": "6",
      "text": "Known drug allergies",
      "answer": [{ "value_string": "No known drug allergies" }]
    },
    {
      "link_id": "7",
      "text": "Consent to treatment",
      "answer": [{ "value_boolean": true }]
    }
  ]
}
```

> Returns `questionnaire_response_id: 60001`

---

## STEP 9 — Appointment Booking

**POST** `/appointments`

> `status` is **required**.
> `participant` list is **required** (min 1 item).

```json
{
  "status": "booked",
  "start": "2026-05-20T10:00:00+05:30",
  "end": "2026-05-20T10:15:00+05:30",
  "created": "2026-05-19T18:00:00+05:30",
  "description": "Cardiology OP consultation — chest pain evaluation",
  "minutes_duration": 15,
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "slot": [
    {
      "reference": "Slot/220001",
      "display": "2026-05-20 10:00 AM"
    }
  ],
  "service_type": [
    {
      "system": "http://snomed.info/sct",
      "code": "394579002",
      "display": "Cardiology",
      "text": "Cardiology Consultation"
    }
  ],
  "reason": [
    {
      "system": "http://hl7.org/fhir/sid/icd-10",
      "code": "R07.9",
      "display": "Chest pain",
      "text": "Chest pain evaluation"
    }
  ],
  "participant": [
    {
      "actor_reference": "Patient/10001",
      "actor_display": "Rahul Sharma",
      "required": "required",
      "status": "accepted"
    },
    {
      "actor_reference": "Practitioner/30001",
      "actor_display": "Dr. Arjun Kumar",
      "required": "required",
      "status": "accepted"
    }
  ]
}
```

> Returns `appointment_id: 40001`

---

## STEP 10 — Patient Check-in (Appointment status update)

**PATCH** `/appointments/40001`

```json
{
  "status": "arrived"
}
```

---

## STEP 11 — Encounter Creation

**POST** `/encounters`

> `status` is **required**.
> Valid statuses: `planned | in-progress | on-hold | discharged | completed | cancelled | discontinued | entered-in-error | unknown`

```json
{
  "status": "in-progress",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "service_provider": "Organization/190001",
  "service_provider_display": "City Care Hospital",
  "actual_period_start": "2026-05-20T10:05:00+05:30",
  "class": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      "code": "AMB",
      "display": "Ambulatory"
    }
  ],
  "type": [
    {
      "system": "http://snomed.info/sct",
      "code": "11429006",
      "display": "Consultation",
      "text": "Outpatient Consultation"
    }
  ],
  "appointment": [
    {
      "reference": "Appointment/40001",
      "display": "Cardiology OP — Rahul Sharma"
    }
  ],
  "participant": [
    {
      "actor_reference": "Practitioner/30001",
      "actor_display": "Dr. Arjun Kumar",
      "type": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ParticipationType",
          "code": "PPRF",
          "display": "Primary Performer",
          "text": "Primary Performer"
        }
      ]
    }
  ],
  "reason": [
    {
      "use": [
        {
          "system": "http://terminology.hl7.org/CodeSystem/v3-ActReason",
          "code": "CC",
          "display": "Chief Complaint"
        }
      ],
      "value": [
        {
          "concept_system": "http://hl7.org/fhir/sid/icd-10",
          "concept_code": "R07.9",
          "concept_display": "Chest pain",
          "concept_text": "Chest pain for 2 days"
        }
      ]
    }
  ]
}
```

> Returns `encounter_id: 20001`

---

## STEP 12 — Vitals (Observations)

> `status` is **required**.
> `encounter_id` takes the **internal DB primary key** of the Encounter (returned from POST as the internal id).
> `subject` is a FHIR reference string using the public sequence ID.

### 12a — Blood Pressure

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T10:10:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "55284-4",
  "code_display": "Blood Pressure panel",
  "code_text": "Blood Pressure",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "display": "Vital Signs",
      "text": "Vital Signs"
    }
  ],
  "performer": [
    { "reference": "Practitioner/30001", "display": "Dr. Arjun Kumar" }
  ],
  "component": [
    {
      "code_system": "http://loinc.org",
      "code_code": "8480-6",
      "code_display": "Systolic blood pressure",
      "code_text": "Systolic",
      "value_quantity_value": 148,
      "value_quantity_unit": "mmHg",
      "value_quantity_system": "http://unitsofmeasure.org",
      "value_quantity_code": "mm[Hg]"
    },
    {
      "code_system": "http://loinc.org",
      "code_code": "8462-4",
      "code_display": "Diastolic blood pressure",
      "code_text": "Diastolic",
      "value_quantity_value": 94,
      "value_quantity_unit": "mmHg",
      "value_quantity_system": "http://unitsofmeasure.org",
      "value_quantity_code": "mm[Hg]"
    }
  ]
}
```

> Returns `observation_id: 160001`

### 12b — Pulse

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T10:10:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "8867-4",
  "code_display": "Heart rate",
  "code_text": "Pulse / Heart Rate",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "text": "Vital Signs"
    }
  ],
  "value_quantity_value": 92,
  "value_quantity_unit": "beats/min",
  "value_quantity_system": "http://unitsofmeasure.org",
  "value_quantity_code": "/min"
}
```

> Returns `observation_id: 160002`

### 12c — Body Weight

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T10:10:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "29463-7",
  "code_display": "Body weight",
  "code_text": "Body Weight",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "text": "Vital Signs"
    }
  ],
  "value_quantity_value": 78,
  "value_quantity_unit": "kg",
  "value_quantity_system": "http://unitsofmeasure.org",
  "value_quantity_code": "kg"
}
```

> Returns `observation_id: 160003`

### 12d — Body Temperature

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T10:10:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "8310-5",
  "code_display": "Body temperature",
  "code_text": "Body Temperature",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "text": "Vital Signs"
    }
  ],
  "value_quantity_value": 98.4,
  "value_quantity_unit": "°F",
  "value_quantity_system": "http://unitsofmeasure.org",
  "value_quantity_code": "[degF]"
}
```

> Returns `observation_id: 160004`

### 12e — SpO2

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T10:10:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "59408-5",
  "code_display": "Oxygen saturation in Arterial blood by Pulse oximetry",
  "code_text": "SpO2 / Oxygen Saturation",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "vital-signs",
      "text": "Vital Signs"
    }
  ],
  "value_quantity_value": 98,
  "value_quantity_unit": "%",
  "value_quantity_system": "http://unitsofmeasure.org",
  "value_quantity_code": "%"
}
```

> Returns `observation_id: 160005`

---

## STEP 13 — Diagnosis (Conditions)

**POST** `/conditions`

### 13a — Hypertension (Confirmed)

```json
{
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "clinical_status_system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
  "clinical_status_code": "active",
  "clinical_status_display": "Active",
  "verification_status_system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
  "verification_status_code": "confirmed",
  "verification_status_display": "Confirmed",
  "severity_system": "http://snomed.info/sct",
  "severity_code": "6736007",
  "severity_display": "Moderate",
  "severity_text": "Moderate",
  "code_system": "http://hl7.org/fhir/sid/icd-10",
  "code_code": "I10",
  "code_display": "Essential (primary) hypertension",
  "code_text": "Hypertension",
  "onset_datetime": "2026-05-20T10:00:00+05:30",
  "recorded_date": "2026-05-20T10:30:00+05:30",
  "recorder": "Practitioner/30001",
  "recorder_display": "Dr. Arjun Kumar",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/condition-category",
      "code": "encounter-diagnosis",
      "display": "Encounter Diagnosis",
      "text": "Encounter Diagnosis"
    }
  ],
  "note": [
    {
      "text": "BP 148/94 on presentation. Family history of hypertension. Likely new onset essential hypertension."
    }
  ]
}
```

> Returns `condition_id: 120001`

### 13b — Chest Pain (Provisional)

```json
{
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "clinical_status_system": "http://terminology.hl7.org/CodeSystem/condition-clinical",
  "clinical_status_code": "active",
  "verification_status_system": "http://terminology.hl7.org/CodeSystem/condition-ver-status",
  "verification_status_code": "provisional",
  "code_system": "http://hl7.org/fhir/sid/icd-10",
  "code_code": "R07.9",
  "code_display": "Chest pain, unspecified",
  "code_text": "Chest pain — under evaluation",
  "onset_datetime": "2026-05-18T00:00:00+05:30",
  "recorder": "Practitioner/30001",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/condition-category",
      "code": "encounter-diagnosis",
      "text": "Encounter Diagnosis"
    }
  ]
}
```

> Returns `condition_id: 120002`

---

## STEP 14 — Orders (ServiceRequests)

**POST** `/service-requests`

> `status` and `intent` are both **required**.

### 14a — CBC Order

```json
{
  "status": "active",
  "intent": "order",
  "priority": "routine",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "authored_on": "2026-05-20T10:25:00+05:30",
  "requester": "Practitioner/30001",
  "requester_display": "Dr. Arjun Kumar",
  "code_system": "http://loinc.org",
  "code_code": "58410-2",
  "code_display": "Complete blood count (CBC) panel",
  "code_text": "Complete Blood Count (CBC)",
  "category": [
    {
      "system": "http://snomed.info/sct",
      "code": "108252007",
      "display": "Laboratory procedure",
      "text": "Laboratory"
    }
  ],
  "reason_code": [
    {
      "system": "http://hl7.org/fhir/sid/icd-10",
      "code": "R07.9",
      "display": "Chest pain",
      "text": "Chest pain — rule out infection, anaemia"
    }
  ],
  "note": [{ "text": "Fasting not required. Collect EDTA tube." }]
}
```

> Returns `service_request_id: 80001`

### 14b — ECG Order

```json
{
  "status": "active",
  "intent": "order",
  "priority": "urgent",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "authored_on": "2026-05-20T10:25:00+05:30",
  "requester": "Practitioner/30001",
  "requester_display": "Dr. Arjun Kumar",
  "code_system": "http://loinc.org",
  "code_code": "11524-6",
  "code_display": "EKG study",
  "code_text": "ECG / Electrocardiogram",
  "category": [
    {
      "system": "http://snomed.info/sct",
      "code": "103693007",
      "display": "Diagnostic procedure",
      "text": "Diagnostic"
    }
  ],
  "reason_code": [
    {
      "text": "Chest pain — rule out acute cardiac event"
    }
  ]
}
```

> Returns `service_request_id: 80002`

---

## STEP 15 — Lab Result Observations (CBC)

### 15a — Hemoglobin

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T11:30:00+05:30",
  "issued": "2026-05-20T11:45:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "718-7",
  "code_display": "Hemoglobin [Mass/volume] in Blood",
  "code_text": "Hemoglobin",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "laboratory",
      "text": "Laboratory"
    }
  ],
  "value_quantity_value": 13.2,
  "value_quantity_unit": "g/dL",
  "value_quantity_system": "http://unitsofmeasure.org",
  "value_quantity_code": "g/dL",
  "interpretation": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation",
      "code": "L",
      "display": "Low",
      "text": "Slightly Low"
    }
  ],
  "reference_range": [
    {
      "low_value": 13.5,
      "low_unit": "g/dL",
      "high_value": 17.5,
      "high_unit": "g/dL",
      "text": "Normal: 13.5–17.5 g/dL (adult male)"
    }
  ],
  "based_on": [{ "reference": "ServiceRequest/80001", "display": "CBC Order" }]
}
```

> Returns `observation_id: 160006`

### 15b — WBC Count

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T11:30:00+05:30",
  "issued": "2026-05-20T11:45:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "6690-2",
  "code_display": "Leukocytes [#/volume] in Blood by Automated count",
  "code_text": "WBC Count",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "laboratory",
      "text": "Laboratory"
    }
  ],
  "value_quantity_value": 9200,
  "value_quantity_unit": "cells/µL",
  "interpretation": [{ "text": "Normal" }],
  "reference_range": [
    {
      "low_value": 4000,
      "low_unit": "cells/µL",
      "high_value": 11000,
      "high_unit": "cells/µL",
      "text": "Normal: 4000–11000 cells/µL"
    }
  ],
  "based_on": [{ "reference": "ServiceRequest/80001" }]
}
```

> Returns `observation_id: 160007`

### 15c — Platelet Count

**POST** `/observations`

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "effective_date_time": "2026-05-20T11:30:00+05:30",
  "issued": "2026-05-20T11:45:00+05:30",
  "code_system": "http://loinc.org",
  "code_code": "777-3",
  "code_display": "Platelets [#/volume] in Blood by Automated count",
  "code_text": "Platelet Count",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/observation-category",
      "code": "laboratory",
      "text": "Laboratory"
    }
  ],
  "value_quantity_value": 245000,
  "value_quantity_unit": "cells/µL",
  "interpretation": [{ "text": "Normal" }],
  "reference_range": [
    {
      "low_value": 150000,
      "low_unit": "cells/µL",
      "high_value": 400000,
      "high_unit": "cells/µL",
      "text": "Normal: 150,000–400,000 cells/µL"
    }
  ],
  "based_on": [{ "reference": "ServiceRequest/80001" }]
}
```

> Returns `observation_id: 160008`

---

## STEP 16 — Diagnostic Report (CBC)

**POST** `/diagnostic-reports`

> `status` is **required**.

```json
{
  "status": "final",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "effective_datetime": "2026-05-20T11:30:00+05:30",
  "issued": "2026-05-20T11:50:00+05:30",
  "conclusion": "CBC shows mildly low haemoglobin (13.2 g/dL). WBC and platelets within normal limits. No acute infection or thrombocytopenia.",
  "code_system": "http://loinc.org",
  "code_code": "58410-2",
  "code_display": "Complete blood count (CBC) panel",
  "code_text": "Complete Blood Count (CBC)",
  "category": [
    {
      "system": "http://terminology.hl7.org/CodeSystem/v2-0074",
      "code": "LAB",
      "display": "Laboratory",
      "text": "Laboratory"
    }
  ],
  "based_on": [{ "reference": "ServiceRequest/80001", "display": "CBC Order" }],
  "performer": [
    { "reference": "Organization/190001", "display": "City Care Hospital Lab" }
  ],
  "result": [
    { "reference": "Observation/160006", "display": "Hemoglobin" },
    { "reference": "Observation/160007", "display": "WBC Count" },
    { "reference": "Observation/160008", "display": "Platelet Count" }
  ]
}
```

> Returns `diagnostic_report_id: 110001`

---

## STEP 17 — ECG Procedure

**POST** `/procedures`

> `status` is **required**.

```json
{
  "status": "completed",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "performed_datetime": "2026-05-20T10:40:00+05:30",
  "category_system": "http://snomed.info/sct",
  "category_code": "103693007",
  "category_display": "Diagnostic procedure",
  "category_text": "Diagnostic procedure",
  "code_system": "http://snomed.info/sct",
  "code_code": "164847006",
  "code_display": "Standard electrocardiogram",
  "code_text": "ECG — 12 Lead",
  "outcome_text": "Sinus rhythm. No ST elevation or depression. Left ventricular hypertrophy pattern consistent with hypertension.",
  "based_on": [{ "reference": "ServiceRequest/80002", "display": "ECG Order" }],
  "performer": [
    {
      "actor": "Practitioner/30001",
      "actor_display": "Dr. Arjun Kumar",
      "function_text": "Primary Performer"
    }
  ],
  "note": [
    {
      "text": "Patient resting supine. No artefact. ECG completed within 5 minutes of order."
    }
  ]
}
```

> Returns `procedure_id: 100001`

---

## STEP 18 — Medication Prescriptions

**POST** `/medication-requests`

> `status` and `intent` are both **required**.

### 18a — Amlodipine 5mg

```json
{
  "status": "active",
  "intent": "order",
  "priority": "routine",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "authored_on": "2026-05-20T11:55:00+05:30",
  "requester": "Practitioner/30001",
  "requester_display": "Dr. Arjun Kumar",
  "medication_code_system": "http://www.whocc.no/atc",
  "medication_code_code": "C08CA01",
  "medication_code_display": "Amlodipine",
  "medication_code_text": "Amlodipine 5mg tablet",
  "reason_reference": [
    { "reference": "Condition/120001", "display": "Hypertension" }
  ],
  "dosage_instruction": [
    {
      "text": "Take 1 tablet once daily after dinner",
      "timing_frequency": 1,
      "timing_period": 1,
      "timing_period_unit": "d",
      "dose_and_rate": [
        {
          "dose_quantity_value": 5,
          "dose_quantity_unit": "mg",
          "dose_quantity_system": "http://unitsofmeasure.org",
          "dose_quantity_code": "mg"
        }
      ]
    }
  ],
  "dispense_number_of_repeats_allowed": 2,
  "dispense_quantity_value": 30,
  "dispense_quantity_unit": "tablet",
  "dispense_expected_supply_duration_value": 30,
  "dispense_expected_supply_duration_unit": "days",
  "note": [
    {
      "text": "Review BP after 4 weeks. Titrate dose if target BP not reached."
    }
  ]
}
```

> Returns `medication_request_id: 90001`

### 18b — Aspirin 75mg

```json
{
  "status": "active",
  "intent": "order",
  "priority": "routine",
  "subject": "Patient/10001",
  "encounter_id": 20001,
  "authored_on": "2026-05-20T11:55:00+05:30",
  "requester": "Practitioner/30001",
  "medication_code_system": "http://www.whocc.no/atc",
  "medication_code_code": "B01AC06",
  "medication_code_display": "Acetylsalicylic acid",
  "medication_code_text": "Aspirin 75mg tablet (enteric coated)",
  "reason_code": [{ "text": "Chest pain — cardiac risk reduction" }],
  "dosage_instruction": [
    {
      "text": "Take 1 tablet once daily after breakfast",
      "timing_frequency": 1,
      "timing_period": 1,
      "timing_period_unit": "d",
      "dose_and_rate": [
        {
          "dose_quantity_value": 75,
          "dose_quantity_unit": "mg",
          "dose_quantity_system": "http://unitsofmeasure.org",
          "dose_quantity_code": "mg"
        }
      ]
    }
  ],
  "dispense_quantity_value": 30,
  "dispense_quantity_unit": "tablet"
}
```

> Returns `medication_request_id: 90002`

---

## STEP 19 — Device Request

**POST** `/device-requests`

> `intent` is **required**.

```json
{
  "intent": "order",
  "status": "active",
  "priority": "routine",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "encounter_id": 20001,
  "authored_on": "2026-05-20T12:00:00+05:30",
  "requester": "Practitioner/30001",
  "requester_display": "Dr. Arjun Kumar",
  "code_concept_system": "http://snomed.info/sct",
  "code_concept_code": "43396009",
  "code_concept_display": "Haemoglobin A1c measurement device",
  "code_concept_text": "Blood Glucose Monitor (glucometer) — home use",
  "reason_code": [
    {
      "text": "Monitor fasting and post-prandial glucose — hypertension patient at metabolic risk"
    }
  ],
  "note": [
    {
      "text": "Patient instructed to log morning fasting glucose daily and bring readings at follow-up."
    }
  ]
}
```

> Returns `device_request_id: 130001`

---

## STEP 20 — Invoice

**POST** `/invoices`

> `status` is **required**.
> Valid statuses: `draft | issued | balanced | cancelled | entered-in-error`
> Price component `type` valid values: `base | surcharge | deduction | discount | tax | informational`

```json
{
  "status": "issued",
  "subject": "Patient/10001",
  "subject_display": "Rahul Sharma",
  "issuer": "Organization/190001",
  "issuer_display": "City Care Hospital",
  "date": "2026-05-20T12:15:00+05:30",
  "type_text": "Outpatient Consultation Bill",
  "total_net_value": 2840,
  "total_net_currency": "INR",
  "total_gross_value": 2840,
  "total_gross_currency": "INR",
  "payment_terms": "Payment due within 30 days. Insurance reimbursement applied post-adjudication.",
  "participants": [
    {
      "role_text": "Issuer",
      "actor": "Organization/190001",
      "actor_display": "City Care Hospital"
    }
  ],
  "line_items": [
    {
      "sequence": 1,
      "charge_item_codeable_concept_text": "Cardiology Consultation — Dr. Arjun Kumar",
      "price_component": [
        { "type": "base", "amount_value": 800, "amount_currency": "INR" }
      ]
    },
    {
      "sequence": 2,
      "charge_item_codeable_concept_text": "CBC — Complete Blood Count",
      "price_component": [
        { "type": "base", "amount_value": 350, "amount_currency": "INR" }
      ]
    },
    {
      "sequence": 3,
      "charge_item_codeable_concept_text": "ECG — 12 Lead",
      "price_component": [
        { "type": "base", "amount_value": 250, "amount_currency": "INR" }
      ]
    },
    {
      "sequence": 4,
      "charge_item_codeable_concept_text": "Amlodipine 5mg × 30 tablets",
      "price_component": [
        { "type": "base", "amount_value": 180, "amount_currency": "INR" }
      ]
    },
    {
      "sequence": 5,
      "charge_item_codeable_concept_text": "Aspirin 75mg × 30 tablets",
      "price_component": [
        { "type": "base", "amount_value": 60, "amount_currency": "INR" }
      ]
    },
    {
      "sequence": 6,
      "charge_item_codeable_concept_text": "Blood Glucose Monitor (glucometer)",
      "price_component": [
        { "type": "base", "amount_value": 1200, "amount_currency": "INR" }
      ]
    }
  ],
  "total_price_components": [
    { "type": "base", "amount_value": 2840, "amount_currency": "INR" }
  ]
}
```

> Returns `invoice_id: 210001`

---

## STEP 21 — Insurance Claim

**POST** `/claims`

> `status`, `use`, `created`, `patient`, `provider` are all **required**.
> `insurance` list is **required** (at least 1 item with `sequence`, `focal`, `coverage`).

```json
{
  "status": "active",
  "use": "claim",
  "created": "2026-05-20T12:30:00+05:30",
  "patient": "Patient/10001",
  "patient_display": "Rahul Sharma",
  "provider": "Organization/190001",
  "provider_display": "City Care Hospital",
  "insurer": "Organization/190001",
  "insurer_display": "Star Health Insurance",
  "type_system": "http://terminology.hl7.org/CodeSystem/claim-type",
  "type_code": "professional",
  "type_display": "Professional",
  "priority_system": "http://terminology.hl7.org/CodeSystem/processpriority",
  "priority_code": "normal",
  "priority_display": "Normal",
  "total_value": 1400,
  "total_currency": "INR",
  "insurance": [
    {
      "sequence": 1,
      "focal": true,
      "coverage": "Coverage/240001"
    }
  ],
  "diagnoses": [
    {
      "sequence": 1,
      "diagnosis_codeable_concept_system": "http://hl7.org/fhir/sid/icd-10",
      "diagnosis_codeable_concept_code": "I10",
      "diagnosis_codeable_concept_display": "Essential (primary) hypertension",
      "diagnosis_codeable_concept_text": "Hypertension"
    }
  ],
  "procedures": [
    {
      "sequence": 1,
      "procedure_codeable_concept_text": "ECG 12 Lead",
      "date": "2026-05-20T10:40:00+05:30"
    }
  ],
  "items": [
    {
      "sequence": 1,
      "product_or_service_text": "Cardiology Consultation",
      "serviced_date": "2026-05-20",
      "unit_price_value": 800,
      "unit_price_currency": "INR",
      "net_value": 800,
      "net_currency": "INR"
    },
    {
      "sequence": 2,
      "product_or_service_text": "CBC Lab Test",
      "serviced_date": "2026-05-20",
      "unit_price_value": 350,
      "unit_price_currency": "INR",
      "net_value": 350,
      "net_currency": "INR"
    },
    {
      "sequence": 3,
      "product_or_service_text": "ECG Procedure",
      "serviced_date": "2026-05-20",
      "unit_price_value": 250,
      "unit_price_currency": "INR",
      "net_value": 250,
      "net_currency": "INR"
    }
  ]
}
```

> Returns `claim_id: 170001`

---

## STEP 22 — Claim Response

**POST** `/claim-responses`

> `status`, `use`, `outcome`, `created`, `patient`, `insurer` are all **required**.

```json
{
  "status": "active",
  "use": "claim",
  "outcome": "complete",
  "created": "2026-05-20T18:00:00+05:30",
  "patient": "Patient/10001",
  "patient_display": "Rahul Sharma",
  "insurer": "Organization/190001",
  "insurer_display": "Star Health Insurance",
  "request": "Claim/170001",
  "request_display": "Insurance Claim — Rahul Sharma 20-May-2026",
  "disposition": "Claim approved. Full payment of all eligible items.",
  "type_system": "http://terminology.hl7.org/CodeSystem/claim-type",
  "type_code": "professional",
  "type_display": "Professional",
  "payment_type_code": "complete",
  "payment_date": "2026-05-22",
  "payment_amount_value": 1400,
  "payment_amount_currency": "INR",
  "items": [
    {
      "item_sequence": 1,
      "adjudication": [
        {
          "category_text": "Approved",
          "amount_value": 800,
          "amount_currency": "INR"
        }
      ]
    },
    {
      "item_sequence": 2,
      "adjudication": [
        {
          "category_text": "Approved",
          "amount_value": 350,
          "amount_currency": "INR"
        }
      ]
    },
    {
      "item_sequence": 3,
      "adjudication": [
        {
          "category_text": "Approved",
          "amount_value": 250,
          "amount_currency": "INR"
        }
      ]
    }
  ],
  "totals": [
    {
      "category_text": "Submitted",
      "amount_value": 1400,
      "amount_currency": "INR"
    },
    {
      "category_text": "Benefit",
      "amount_value": 1400,
      "amount_currency": "INR"
    }
  ]
}
```

> Returns `claim_response_id: 180001`

---

## STEP 23 — Close Encounter

**PATCH** `/encounters/20001`

> Use `completed` (not `finished`) — valid statuses: `planned | in-progress | on-hold | discharged | completed | cancelled | discontinued | entered-in-error | unknown`

```json
{
  "status": "completed",
  "actual_period_end": "2026-05-20T12:30:00+05:30"
}
```

---

## Notes

### `encounter_id` in child resources

Fields like `encounter_id: int` in Observation, Condition, ServiceRequest, DiagnosticReport, Procedure, MedicationRequest, and DeviceRequest store the **internal DB primary key** of the Encounter — not the public `encounter_id` sequence. The internal key is returned in the Encounter POST response. In this scenario it is assumed to resolve to `20001`.

### Patient sub-resources

Name, telecom, and address are **not** part of the Patient `POST /patients` body. They are created separately via sub-resource endpoints after the patient is created.

### Practitioner sub-resources

Same pattern as Patient — name and qualification are created via sub-resource endpoints after the practitioner record is created.

### `insurance` in Claim

The `insurance[].coverage` field references a `Coverage` resource (`Coverage/240001` used here as placeholder). If Coverage is not yet implemented, use any placeholder reference string.

### Appointment `participant`

Each participant item in the list must have at minimum `actor_reference` and `status`.

### QuestionnaireResponse `questionnaire`

This field is required and must be a canonical URL. Use your system's Questionnaire registry URL or a placeholder like `https://your-domain/fhir/Questionnaire/op-intake-form`.
