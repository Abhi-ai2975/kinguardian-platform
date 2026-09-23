# Data Interchange & Integration

Healthcare data lives in many formats across many systems. To be a real EMR platform,  
the FHIR server must speak HL7 v2 (legacy lab/ADT), DICOM (imaging), and C-CDA (care summaries).

---

## Files in This Section

| File | Topic |
|---|---|
| [01-hl7v2.md](./01-hl7v2.md) | HL7 v2 message parsing — ADT, ORU, ORM, SIU messages |
| [02-dicom.md](./02-dicom.md) | DICOM integration — imaging orders and results |
| [03-ccda.md](./03-ccda.md) | C-CDA export — care summary documents |
| [04-bulk-import.md](./04-bulk-import.md) | Bulk data import from CSV, JSON, and NDJSON |

---

## Current State

We have no integration capabilities outside of our FHIR REST API.  
All data must be entered via our API in FHIR format.

---

## Integration Architecture

```
External Systems                  Our FHIR Server
─────────────────                 ─────────────────
Lab system (HL7 v2 ORU) ──────→ HL7 Listener → Observation
ADT feed (HL7 v2 ADT)   ──────→ HL7 Listener → Patient, Encounter
Radiology (DICOM)        ──────→ DICOMweb proxy → ImagingStudy
EHR (C-CDA)              ──────→ C-CDA importer → Patient, Condition, Medication
Legacy CSV export         ──────→ CSV importer → bulk FHIR resources
```
