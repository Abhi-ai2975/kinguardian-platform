# Phase 2 — Core EMR Capabilities (Weeks 9–18)

**Goal:** Support real clinical workflows — scheduling, orders, results, real-time updates.  
**Prerequisite:** Phase 1 complete.

---

## Week 9-10 — FHIR Search Framework

| Task | Effort |
|---|---|
| `SearchParam` registry (all 36 resource types) | 3 days |
| String, token, date, reference, quantity param handlers | 2 days |
| `_sort`, `_count`, `_offset` (already exists but generalize) | 1 day |
| `_include` / `_revinclude` | 2 days |
| `_summary` / `_elements` | 1 day |
| Update all routers to use param registry | 2 days |
| CapabilityStatement searchParam advertising | 0.5 day |

---

## Week 11-12 — FHIR Subscriptions

| Task | Effort |
|---|---|
| Subscription database schema + repository | 1 day |
| Subscription CRUD router | 1 day |
| Subscription matcher (evaluate criteria on mutation) | 2 days |
| REST-hook delivery worker with retry | 2 days |
| WebSocket manager + server | 2 days |
| Redis pub/sub for multi-process WS scaling | 1 day |
| Handshake verification | 0.5 day |

---

## Week 13-14 — FHIR Operations Batch

| Task | Effort |
|---|---|
| `Patient/$everything` operation | 2 days |
| `ValueSet/$expand` operation | 2 days |
| `CodeSystem/$lookup` operation | 1 day |
| `ValueSet/$validate-code` operation | 1 day |
| Terminology seed data (FHIR core code systems) | 1 day |
| `ConceptMap/$translate` stub | 1 day |

---

## Week 15-16 — Automation Engine

| Task | Effort |
|---|---|
| `AutomationRegistry` decorator pattern | 1 day |
| `AutomationContext` dataclass | 0.5 day |
| Integration into all repository post-hooks | 2 days |
| Critical value alerter handler | 1 day |
| Appointment reminder handler | 1 day |
| Drug interaction check handler | 2 days |
| Auto claim generation handler | 1 day |
| `AutomationExecutor` with timeout + error isolation | 1 day |

---

## Week 17-18 — CDS Hooks + Bulk Export

| Task | Effort |
|---|---|
| `CDSServiceRegistry` + `GET /cds-services` | 1 day |
| `POST /cds-services/{id}` hook handler | 1 day |
| Diabetes care gap CDS service | 1 day |
| Drug interaction CDS service | 1 day |
| Async job infrastructure (`async_jobs` table + service) | 2 days |
| `GET /Patient/$export` kickoff + background worker | 2 days |
| `GET /bulk-status/{id}` + NDJSON download | 1 day |
| MinIO/S3 storage backend for export files | 1 day |

---

## Definition of Done — Phase 2

- [ ] `GET /Patient?family=Smith&gender=male&birthdate=ge1980-01-01` works
- [ ] `GET /Encounter?patient=Patient/10001&_include=Encounter:patient` returns Encounter + Patient
- [ ] Subscription fires REST-hook when matching resource created
- [ ] WebSocket client receives push notification
- [ ] `GET /Patient/10001/$everything` returns all linked resources
- [ ] `GET /ValueSet/$expand?url=...&filter=dia` returns matching codes
- [ ] Automation: create Observation with critical value → Task created automatically
- [ ] `GET /cds-services` returns service discovery doc
- [ ] `GET /Patient/$export` returns 202 + job URL; polling returns file URLs

---

## Performance Targets

| Operation | Target |
|---|---|
| `Patient?family=Smith` (100k patients) | < 200ms |
| `Patient/10001/$everything` (50 resources) | < 500ms |
| `ValueSet/$expand` with filter (10k concepts) | < 300ms |
| Subscription delivery (REST-hook) | < 2s end-to-end |
| Bulk export 10k patients | < 5 minutes |
