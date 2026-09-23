# Phase 4 — External Integrations (Weeks 27–34)

**Goal:** Full healthcare ecosystem interoperability — connect to any lab, EHR, imaging system, or insurer.  
**Prerequisite:** Phases 1-3 complete.

---

## Week 27-28 — HL7 v2

| Task | Effort |
|---|---|
| HL7 v2 parser integration (hl7apy) | 1 day |
| MLLP TCP server | 2 days |
| `POST /hl7/v2` REST endpoint | 0.5 day |
| `ADT^A01` → Patient + Encounter handler | 2 days |
| `ORU^R01` → Observation + DiagnosticReport handler | 2 days |
| `ORM^O01` → ServiceRequest handler | 1 day |
| `SIU^S12` → Appointment handler | 1 day |
| Raw message storage for audit/replay | 0.5 day |
| ACK generation | 0.5 day |

---

## Week 29-30 — C-CDA Export + SCIM

| Task | Effort |
|---|---|
| `CCDAService` — FHIR → C-CDA XML | 4 days |
| `GET /Patient/{id}/$summary?format=ccda` | 1 day |
| C-CDA validation against schematron | 1 day |
| SCIM `users` + `groups` tables | 1 day |
| `GET/POST/PUT/DELETE /scim/v2/Users` | 2 days |
| `GET/POST/PUT/DELETE /scim/v2/Groups` | 1 day |
| Okta SCIM integration test | 1 day |

---

## Week 31-32 — DICOM + DICOMweb

| Task | Effort |
|---|---|
| Orthanc PACS deployment (Docker) | 1 day |
| DICOMweb proxy (QIDO, WADO, STOW endpoints) | 2 days |
| `ImagingStudy` sync from DICOM metadata | 2 days |
| `ServiceRequest` → DICOM worklist push | 1 day |
| OHIF Viewer endpoint registration | 0.5 day |
| AI imaging analysis stub (`$ai-analyze`) | 1 day |

---

## Week 33-34 — SQL-on-FHIR, FHIRCast, SMART Health Cards

| Task | Effort |
|---|---|
| `ViewDefinitionEngine` (FHIRPath-based) | 2 days |
| Pre-built views for all 36 resources | 2 days |
| `POST /ViewDefinition/$apply` → NDJSON | 1 day |
| FHIRCast Hub (topic creation, subscribe, publish) | 3 days |
| `/fhircast/hub` endpoints | 1 day |
| SMART Health Cards (`$smart-health-cards`) | 2 days |
| W3C Verifiable Credentials encoding | 1 day |

---

## Definition of Done — Phase 4

- [ ] HL7 `ORU^R01` message creates Observation + DiagnosticReport
- [ ] C-CDA XML validates against CCDA IG schematron
- [ ] SCIM user provision creates Practitioner FHIR resource
- [ ] DICOM study uploaded → `ImagingStudy` created in FHIR
- [ ] `ViewDefinition/$apply` returns flat NDJSON for Patient resource
- [ ] FHIRCast `Patient-open` event syncs across 2 subscribed apps
- [ ] `$smart-health-cards` returns signed JWS for COVID vaccination

---

## Phase 4 — Optional / Enterprise

These items are enterprise-only and can be deferred:

| Feature | When to Build |
|---|---|
| `ConceptMap/$translate` (full SNOMED→ICD mapping) | When population health needed |
| CDA Import (inbound from other EHRs) | When care transitions needed |
| X12 EDI parsing (claims) | When billing integration needed |
| FHIR Messaging (async messaging) | When messaging workflows needed |
| Data warehouse connector (BigQuery/Snowflake) | When analytics team requests |
| Custom domain per org | First enterprise customer |
| Database-per-tenant isolation | First HIPAA-strict enterprise customer |

---

## Total Feature Completeness vs. Medplum

| Category | After Phase 1 | After Phase 2 | After Phase 3 | After Phase 4 |
|---|---|---|---|---|
| FHIR Operations | 15% | 50% | 70% | 85% |
| Auth & Authorization | 60% | 80% | 80% | 90% |
| Search & Querying | 20% | 70% | 80% | 90% |
| Subscriptions | 0% | 80% | 80% | 80% |
| Versioning | 0% | 100% | 100% | 100% |
| Automation/Bots | 0% | 60% | 80% | 80% |
| CDS | 0% | 40% | 80% | 80% |
| AI Capabilities | 0% | 0% | 90% | 90% |
| Data Interchange | 5% | 5% | 5% | 70% |
| Security/Compliance | 40% | 60% | 70% | 85% |
| Infrastructure | 50% | 65% | 70% | 80% |
| **Overall** | **20%** | **55%** | **75%** | **85%** |
