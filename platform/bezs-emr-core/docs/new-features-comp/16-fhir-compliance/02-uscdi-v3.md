# USCDI v3 — Mandatory Data Classes & Elements

**Standard:** United States Core Data for Interoperability v3  
**Effective:** January 1, 2026 (CMS adoption deadline)  
**Published by:** ONC (Office of the National Coordinator for Health IT)  
**Spec:** https://www.healthit.gov/isp/united-states-core-data-interoperability-uscdi

---

## What Is USCDI?

USCDI (United States Core Data for Interoperability) defines the minimum set of health data that must be exchangeable between healthcare systems. It is the **mandatory data standard** under the 21st Century Cures Act — every certified EHR must be able to send and receive all USCDI data elements.

USCDI v3 adds 20+ new data elements over v1 (2019), particularly around:
- Patient demographics (gender identity, pronouns, sex at birth)
- Clinical notes
- Allergies (reaction severity)
- Medications (adherence)
- Health concerns
- Diagnostic imaging studies

---

## USCDI v3 Data Classes (Complete List)

### Currently Implemented in Our Server

| Data Class | USCDI Elements | FHIR Resource | Status |
|---|---|---|---|
| Patient Demographics | Name, DOB, Sex, Address, Phone | `Patient` | Partial (missing gender identity, race, ethnicity) |
| Vital Signs | 8 required vitals | `Observation` | Implemented |
| Medications | Active meds, dosage, route | `MedicationRequest` | Implemented |
| Allergies & Intolerances | Drug/food/environmental | `AllergyIntolerance` | Implemented |
| Conditions (Problems) | Active problem list | `Condition` | Implemented |
| Procedures | Performed procedures | `Procedure` | Implemented |
| Immunizations | Vaccine, date, series | `Immunization` | Implemented |
| Laboratory | Lab tests + results | `Observation` | Implemented |
| Care Team Members | Provider, role, organization | `CareTeam`, `Practitioner` | Partial |
| Goals | Care plan goals | `Goal` | **Missing** |
| Health Concerns | Patient-reported concerns | `Condition` (category=health-concern) | **Missing** |

### New in USCDI v3 — Gaps

| Data Class | New Elements | FHIR Resource | Status |
|---|---|---|---|
| Patient Demographics | Gender Identity, Pronouns, Tribal Affiliation | `Patient` extensions | **Missing** |
| Patient Demographics | Sex at Birth (vs. gender) | `Patient` extension | **Missing** |
| Clinical Notes | 8 required note types (see below) | `DocumentReference` | **Missing** |
| Diagnostic Imaging | Study + order + result | `ImagingStudy`, `DiagnosticReport` | Partial |
| Discharge Instructions | Post-hospitalization instructions | `DocumentReference` | **Missing** |
| Functional Status | ADL assessments | `Observation` | **Missing** |
| Mental/Cognitive Status | Cognitive assessments | `Observation` | **Missing** |
| Pregnancy Status | EDD, outcome | `Observation`, `Condition` | **Missing** |
| Smoking Status | Tobacco use | `Observation` (LOINC 72166-2) | **Missing** |
| Sexual Orientation | SOGI data | `Observation` | **Missing** |
| Average Blood Pressure | Calculated avg (not single reading) | `Observation` | Partial |
| Medications - Adherence | Patient-reported adherence | `MedicationStatement` | **Missing** |
| Care Plan Activity | Tasks within care plan | `CarePlan.activity` | Partial |
| Related Person | Guardian, caregiver | `RelatedPerson` | Implemented |

---

## Required Clinical Note Types (USCDI v3)

8 note types are now mandatory:

| Note Type | LOINC Code | FHIR Implementation |
|---|---|---|
| Consultation Note | 11488-4 | `DocumentReference` with Composition |
| Discharge Summary | 18842-5 | `DocumentReference` |
| History & Physical | 34117-2 | `DocumentReference` |
| Operative Note | 11504-8 | `DocumentReference` |
| Procedure Note | 28570-0 | `DocumentReference` |
| Progress Note | 11506-3 | `DocumentReference` |
| Imaging Narrative | 18748-4 | `DiagnosticReport.presentedForm` |
| Pathology Report | 11526-1 | `DiagnosticReport.presentedForm` |

**Current state:** `DocumentReference` is implemented for photo storage. Clinical notes storage must be added.

### Clinical Notes API

```
POST /DocumentReference
{
  "status": "current",
  "type": { "coding": [{ "system": "http://loinc.org", "code": "11506-3", "display": "Progress note" }] },
  "subject": { "reference": "Patient/10001" },
  "context": { "encounter": [{ "reference": "Encounter/20001" }] },
  "date": "2024-01-15T14:30:00Z",
  "author": [{ "reference": "Practitioner/30001" }],
  "content": [{
    "attachment": {
      "contentType": "text/plain",
      "data": "BASE64_ENCODED_NOTE_TEXT",
      "title": "Progress Note — 2024-01-15"
    }
  }]
}
```

---

## Smoking Status (High Priority)

Smoking status is one of the most commonly exchanged clinical data elements. Add as an `Observation`:

```json
POST /Observation
{
  "status": "final",
  "category": [{ "coding": [{ "code": "social-history" }] }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "72166-2", "display": "Tobacco smoking status" }] },
  "subject": { "reference": "Patient/10001" },
  "effectiveDateTime": "2024-01-15",
  "valueCodeableConcept": {
    "coding": [{ "system": "http://snomed.info/sct", "code": "8517006", "display": "Former smoker" }]
  }
}
```

SNOMED values for smoking status:
- `449868002` — Current every day smoker
- `428041000124106` — Current some day smoker
- `8517006` — Former smoker
- `266919005` — Never smoked

---

## Functional Status (New in USCDI v3)

ADL (Activities of Daily Living) assessments using standardized tools:

```json
POST /Observation
{
  "status": "final",
  "category": [{ "coding": [{ "code": "functional-status" }] }],
  "code": { "coding": [{ "system": "http://loinc.org", "code": "58788-5", "display": "Barthel Index" }] },
  "subject": { "reference": "Patient/10001" },
  "effectiveDateTime": "2024-01-15",
  "valueQuantity": { "value": 85, "unit": "score", "system": "http://unitsofmeasure.org" },
  "interpretation": [{ "coding": [{ "system": "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", "code": "N" }] }]
}
```

Common functional assessment LOINC codes:
- `58788-5` — Barthel Index (ADL disability)
- `72133-2` — Montreal Cognitive Assessment (MoCA)
- `55757-9` — PHQ-9 (depression)
- `69737-5` — GAD-7 (anxiety)

---

## Pregnancy Status

```json
POST /Condition
{
  "clinicalStatus": { "coding": [{ "code": "active" }] },
  "verificationStatus": { "coding": [{ "code": "confirmed" }] },
  "code": { "coding": [{ "system": "http://snomed.info/sct", "code": "77386006", "display": "Pregnancy" }] },
  "subject": { "reference": "Patient/10001" },
  "onsetDateTime": "2024-01-01"
}

# Plus estimated due date as Observation:
POST /Observation
{
  "code": { "coding": [{ "system": "http://loinc.org", "code": "11779-6", "display": "Delivery date Estimated from last menstrual period" }] },
  "subject": { "reference": "Patient/10001" },
  "valueDateTime": "2024-10-01"
}
```

---

## USCDI v3 Gap Closure Plan

| Gap | Effort | FHIR Change |
|---|---|---|
| Gender identity, pronouns, sex at birth on Patient | 2 days | Extensions on Patient model + mapper |
| Tribal affiliation | 0.5 days | Extension on Patient model |
| Clinical notes (DocumentReference for notes) | 3 days | DocumentReference content types |
| Smoking status Observation | 0.5 days | Observation already implemented; add category/LOINC |
| Functional status Observations | 1 day | Category filter + LOINC standardization |
| Pregnancy status | 1 day | Condition code + EDD Observation |
| Sexual orientation | 1 day | Observation with SOGI LOINC |
| MedicationStatement (adherence) | 3 days | New resource (not yet implemented) |
| `Goal` resource | 3 days | New resource (not yet implemented) |
| Average blood pressure Observation | 1 day | Calculated observation endpoint |
| **Total** | **16 days** | |

---

## USCDI Certification Testing

ONC uses the **SITE (Standards Implementation & Testing Environment)** to validate compliance:

```
https://site.healthit.gov/

Tests to run:
1. C-CDA R2.1 Validator — validate C-CDA export
2. FHIR Validator — validate all resource profiles against US Core StructureDefinitions
3. Inferno Test Suite — automated API conformance testing
```

### Inferno Test Suite Integration

```bash
# Run Inferno against our server (Docker):
docker run --rm \
  -e BASE_URL=http://fhir-server:8000 \
  -e FHIR_VERSION=r4 \
  projectinferno/inferno \
  --test-suite us-core-v4
```

Expected test categories:
- Patient reads (single + search)
- Observation reads (lab, vital signs, social history)
- MedicationRequest search
- AllergyIntolerance search
- Condition search
- DocumentReference (clinical notes)
- CapabilityStatement conformance
