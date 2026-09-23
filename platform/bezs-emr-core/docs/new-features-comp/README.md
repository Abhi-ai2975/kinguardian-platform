# FHIR Server — Feature Parity & Industry Standard Documentation

> **Goal:** Evolve this FHIR R4 server from a solid CRUD foundation into a Medplum-level,  
> AI-enabled Electronic Medical Record (EMR) platform that meets FHIR R4 specification,  
> ONC/CMS regulatory requirements, and real-world clinical integration standards.

---

## What We Have Today

| Layer | Status |
|---|---|
| 36 FHIR R4 resources (full CRUD) | ✅ Done |
| Dual response format (FHIR+JSON / plain JSON) | ✅ Done |
| Pagination + basic filters | ✅ Done |
| Terminology service (semantic search) | ✅ Done |
| JWT authentication (JWKS-validated) | ✅ Done |
| Multi-tenant (user_id / org_id scoping) | ✅ Done |
| OpenAPI / MCP contract | ✅ Done |
| AuditEvent resource | ✅ Done |
| Docker deployment | ✅ Done |

## What Medplum Has That We Don't

This is a production-grade FHIR platform used by healthcare startups and enterprises.  
The full gap is documented across 12 feature areas below.

---

## Documentation Map

| # | Area | Files | Priority |
|---|---|---|---|
| 01 | [FHIR Operations](./01-fhir-operations/README.md) | 6 | CRITICAL |
| 02 | [Authentication & Authorization](./02-authentication-authorization/README.md) | 4 | CRITICAL |
| 03 | [Search & Querying](./03-search-and-querying/README.md) | 4 | CRITICAL |
| 04 | [Subscriptions & Real-time](./04-subscriptions-and-realtime/README.md) | 4 | HIGH |
| 05 | [Resource Versioning](./05-resource-versioning/README.md) | 2 | HIGH |
| 06 | [Bots & Automation](./06-bots-and-automation/README.md) | 3 | HIGH |
| 07 | [Clinical Decision Support](./07-clinical-decision-support/README.md) | 3 | HIGH |
| 08 | [Data Interchange](./08-data-interchange/README.md) | 4 | MEDIUM |
| 09 | [AI-Enabled EMR](./09-ai-enabled-emr/README.md) | 4 | HIGH |
| 10 | [Security & Compliance](./10-security-and-compliance/README.md) | 3 | CRITICAL |
| 11 | [Infrastructure](./11-infrastructure/README.md) | 3 | MEDIUM |
| 12 | [Implementation Roadmap](./12-roadmap/README.md) | 4 | — |

---

## How to Use These Docs

Each feature area has:
- A `README.md` overview with the gap summary
- Individual files per sub-feature with:
  - What Medplum does
  - The FHIR R4 specification reference
  - Our current state
  - Exact implementation plan for our FastAPI/Python stack
  - Database schema changes needed
  - API surface (endpoints, operations)
  - Testing strategy

---

## Guiding Principles

1. **FHIR R4 First** — every feature must be spec-compliant before adding extensions
2. **AI-Native** — design every feature with LLM/ML integration hooks in mind
3. **MCP Contract** — every new endpoint must appear in `/openapi.json` for MCP consumers
4. **Security by Default** — HIPAA-grade audit logging on every write operation
5. **Interoperability** — standard protocols (HL7, DICOM, C-CDA) before proprietary formats
