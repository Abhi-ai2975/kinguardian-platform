# Executive Summary — Gap Analysis vs. Medplum

## What Is Medplum?

Medplum is an open-source, FHIR-native healthcare developer platform used by EMR startups,  
digital health companies, and health systems. It provides a production-hardened FHIR R4 server,  
a React component library, a bot/automation engine, and first-class AI integration.

Our server is built on the same FHIR R4 standard and shares the same resource set —  
the gap is in *capabilities on top of those resources*.

---

## Gap Summary by Priority

### CRITICAL — Required for Clinical Production

| Gap | Impact Without It |
|---|---|
| FHIR Operations (`$validate`, `$everything`, `$expand`) | Cannot validate data quality; cannot export patient summaries |
| OAuth2 / SMART on FHIR | Cannot integrate with any EHR, patient portal, or third-party app |
| Fine-grained Access Control (AccessPolicy) | Cannot safely expose data to multiple roles |
| Resource Version History | Cannot audit changes; cannot support `_history` queries |
| Full Audit Logging | HIPAA breach — no trail of who accessed what |

### HIGH — Required for EMR Feature Set

| Gap | Impact Without It |
|---|---|
| FHIR Subscriptions / Webhooks | No real-time updates; no event-driven automation |
| Advanced FHIR Search (SearchParameter, `_include`, `_sort`, `_filter`) | Cannot support clinical workflows that need multi-resource queries |
| Bot / Automation Engine | No programmable business logic; no workflow automation |
| Clinical Decision Support (CDS Hooks) | No alerts, reminders, or order-entry guidance |
| AI Integration Layer | No intelligent charting, summarization, or diagnosis support |
| Bulk Data Export (FHIR Bulk Data) | Cannot do population health, reporting, or analytics |

### MEDIUM — Required for Interoperability

| Gap | Impact Without It |
|---|---|
| HL7 v2 Message Parsing | Cannot integrate with lab systems, ADT feeds, or legacy HIS |
| C-CDA Export | Cannot share care summaries with other providers |
| DICOM Integration | Cannot handle imaging orders or radiology results |
| GraphQL API | Cannot support complex UI queries efficiently |
| Patient Matching (`$match`) | Cannot deduplicate patients across sources |

### LOWER — Platform Maturity

| Gap | Impact Without It |
|---|---|
| Multi-tenancy with project isolation | Cannot serve multiple healthcare organizations safely |
| Rate Limiting & DDoS Protection | Vulnerable to abuse in multi-tenant SaaS |
| OpenTelemetry Observability | Cannot diagnose production issues |
| SMART Health Cards / Links | Cannot support vaccine credentials or portable health records |
| FHIRCast | Cannot support shared clinical context across apps |

---

## Medplum Architecture vs. Ours

```
Medplum Architecture
─────────────────────────────────────────────────────────────────────
 Browser / Mobile     → React App + React Component Library
 Third-party Apps     → SMART on FHIR Launch Framework
 Agents (on-premise)  → Agent WebSocket Bridge
 Bots                 → TypeScript Lambda Functions
                              ↓
 ┌───────────────────────────────────────────────────────────────┐
 │  Medplum Server (TypeScript / Node.js / Express)              │
 │  ├── OAuth2 / OIDC / SMART auth                               │
 │  ├── FHIR R4 CRUD + 50+ Operations                           │
 │  ├── FHIRPath search engine (PostgreSQL)                      │
 │  ├── Subscription engine (WebSocket, REST-hook, email)        │
 │  ├── Bot execution engine (AWS Lambda)                        │
 │  ├── CDS Hooks endpoint                                       │
 │  ├── Bulk data export ($export)                               │
 │  ├── HL7 v2 / DICOM / C-CDA handlers                        │
 │  └── AI operations ($ai streaming)                            │
 └───────────────────────────────────────────────────────────────┘
                              ↓
 PostgreSQL (FHIR data)  +  Redis (sessions/cache)  +  S3 (binaries)

Our Architecture Today
─────────────────────────────────────────────────────────────────────
 FastAPI + PostgreSQL + Redis
  ├── JWT auth (JWKS-validated, no OAuth2 server)
  ├── 36 FHIR R4 resources (CRUD only)
  ├── Basic list filters
  ├── Terminology semantic search
  └── Dual JSON format (FHIR + plain)
```

---

## Implementation Investment Estimate

| Phase | Duration | Outcome |
|---|---|---|
| Phase 1 — Foundation | 8 weeks | Production-safe: versioning, auth, audit, $validate |
| Phase 2 — Core EMR | 10 weeks | Clinical workflows: subscriptions, search, CDS, bulk export |
| Phase 3 — AI EMR | 8 weeks | AI charting, NLP, decision support, smart search |
| Phase 4 — Integrations | 8 weeks | HL7, DICOM, C-CDA, SMART Health Cards |
| **Total** | **~34 weeks** | **Medplum-level feature parity** |

---

## Quick Wins (1-2 weeks each)

These can be done immediately without large refactors:

1. `GET /{resource}/{id}/_history` — version history table + endpoint
2. `POST /{resource}/$validate` — JSON Schema / Pydantic validation operation
3. `If-Match` / `ETag` headers — optimistic concurrency
4. `_sort` search parameter — ORDER BY injection
5. `_include` / `_revinclude` — JOIN-based eager loading
6. AuditEvent auto-write on every mutation — use middleware
