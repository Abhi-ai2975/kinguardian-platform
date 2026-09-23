# Clinical-Grade FHIR Server — Executive Summary

> **Audience:** Engineering leads, product owners, compliance officers  
> **Date:** June 2026  
> **Status:** Pre-production — strong foundation, significant gaps before hospital deployment

---

## What This Server Is Today

The current FHIR server is a **well-architected, async Python FHIR data layer**. It stores and retrieves 34+ FHIR R4 resources in PostgreSQL with dual-format responses (FHIR R4 JSON and simplified plain JSON). It has:

- A clean layered architecture (Router → Service → Repository → ORM)
- Async FastAPI + SQLAlchemy 2.0 + asyncpg with full DI wiring
- JWT-based multi-tenancy scoped by `user_id` + `org_id` (IAM-issued JWTs; auth enforced by the Pulse middle layer)
- Redis-backed sliding-window rate limiting
- A built-in terminology service (SNOMED CT US Edition, ICD-10-CM, LOINC, RxNorm)
- Structured JSON logging with request IDs
- Integration tests for most resources
- FHIR-compliant OperationOutcome error responses
- Content negotiation (`application/fhir+json` vs `application/json`)
- Liveness and readiness probes

## What This Server Is Not Yet

It is explicitly described in `main.py` as **"Pure CRUD data layer — no auth, no business rules"**. That description is accurate and honest. Before this server can handle real patient data in a hospital environment it needs:

| Category | Gap Severity |
|---|---|
| SMART on FHIR / OAuth2 scope enforcement | P0 — legal/security blocker |
| FHIR AuditEvent auto-emission on every PHI access | P0 — HIPAA requirement |
| CapabilityStatement (`GET /metadata`) | P0 — FHIR spec requirement |
| HIPAA-grade encryption (at rest + in transit) | P0 — legal |
| Business logic + workflow authorization middle layer | P0 — clinical safety |
| FHIR Search semantics (`_include`, `_revinclude`, chained) | P0/P1 — interoperability |
| US Core profile conformance and validation | P1 — ONC compliance |
| Resource versioning (`_history`, soft delete) | P1 — medico-legal |
| `Patient/$everything`, bulk `$export` | P1 — clinical workflows |
| Observability (OpenTelemetry, Prometheus) | P1 — operations |
| Secrets management (beyond bare env vars) | P1 — security hygiene |
| CORS, HTTPS termination, mTLS | P0 — security |

## The Middle Layer

The biggest architectural gap is the absence of a **business logic and workflow authorization layer**. Today, every authenticated user with the right JWT claim can create/read/update/delete any resource in their org. In a real EMR:

- A nurse cannot prescribe medications (role-based resource-action guard)
- An appointment cannot be booked outside a slot's availability window (workflow rule)
- A STAT lab order requires a supervising physician's cosignature (approval workflow)
- A patient record flagged VIP requires break-glass access (consent + special audit)
- Discharge triggers a cascade: close encounter, generate summary, notify payer (orchestrated workflow)

None of these can live in the FHIR data layer. They require a **middle layer** between the UI/API consumers and the FHIR server. This document set details how to design and build it.

## Document Map

| File | Contents |
|---|---|
| `01-current-state-analysis.md` | Detailed inventory of what is and is not implemented |
| `02-gap-analysis.md` | Scored gap table with effort and risk |
| `03-middleware-layer-architecture.md` | Design of the business logic / workflow middle layer |
| `04-authorization-workflow-design.md` | RBAC, ABAC, SMART scopes, workflow authorization, break-glass |
| `05-hipaa-compliance-roadmap.md` | HIPAA technical safeguards implementation plan |
| `06-fhir-conformance-roadmap.md` | CapabilityStatement, search, US Core, $everything, versioning |
| `07-implementation-plan.md` | Phased 32-week delivery plan with milestones |

---

## One-Line Summary

> This server has excellent bones — FHIR data model, async stack, terminology, multi-tenancy — but needs a compliance layer (HIPAA/audit), a conformance layer (SMART/search/CapabilityStatement), a clinical workflow middle layer (business rules, authorization, orchestration), and production infrastructure (secrets, TLS, observability, backups) before any real patient data should be stored in it.
