# Gap Analysis — FHIR Server to Clinical-Grade EMR

> Every gap is scored by: **Priority** (P0=blocker/legal, P1=required before go-live, P2=important post-launch), **Effort** (S=days, M=1–4 weeks, L=1–3 months, XL=3+ months), **Risk** (H/M/L if unaddressed), and whether it lives in the **FHIR Server**, the new **Middle Layer**, or **Infrastructure**.

---

## Category 1 — Security & Compliance (Legal Blockers)

These gaps represent legal exposure or HIPAA violations. No patient data should be stored until all P0 items here are closed.

| # | Gap | Where | Priority | Effort | Risk |
|---|---|---|---|---|---|
| S-01 | **FHIR server must be network-isolated** — The FHIR server has no JWT auth middleware by design; it is a private data plane called only by Pulse. JWT validation belongs in Pulse. If the FHIR server is ever reachable from outside Pulse (misconfigured reverse proxy, accidental public exposure), any caller can supply arbitrary `user_id` and `org_id` claims. The required control is network-level isolation, not application-level auth in the FHIR server. | Infrastructure | **P0** | S | H |
| S-02 | **No SMART on FHIR scope enforcement** — SMART granular scopes (`patient/Observation.rs`, `user/*.cruds`, `system/*.rs`) are never extracted from the JWT or enforced at the resource level. Any authenticated user can perform any CRUD on any resource type. | Middle Layer | **P0** | L | H |
| S-03 | **No FHIR AuditEvent auto-emission** — The `AuditEvent` resource exists as a CRUD endpoint but is never written automatically on PHI access. HIPAA requires an audit trail for every read/write of protected health information. | FHIR Server / Middle Layer | **P0** | M | H |
| S-04 | **TLS 1.2+/1.3 not enforced at application level** — No HTTPS redirect, no HSTS header. Should be enforced at reverse proxy (nginx/Caddy) and declared in config. | Infrastructure | **P0** | S | H |
| S-05 | **No encryption at rest** — PostgreSQL data and Redis cache are not configured with AES-256 encryption. HIPAA technically-safeguard "addressable" becoming mandatory under 2026 NPRM. | Infrastructure | **P0** | M | H |
| S-06 | **Secrets in `.env` file** — `FHIR_DATABASE_URL` and `REDIS_URL` carry credentials. `.env` files are easily committed or leaked. | Infrastructure | **P0** | S | H |
| S-07 | **No RBAC / role-based access control** — All authenticated org members have identical permissions. A nurse, physician, billing clerk, and admin all see and mutate the same resources. | Middle Layer | **P0** | L | H |
| S-08 | **No ABAC / attribute-based access** — No care-team membership check, no VIP sensitivity labels, no patient consent enforcement. | Middle Layer | **P1** | XL | H |
| S-09 | **No break-glass access pattern** — Emergency access to restricted records requires a reason code, elevated audit, and supervisory notification. Currently no mechanism exists. | Middle Layer | **P1** | M | H |
| S-10 | **CORS not configured** — No `CORSMiddleware` in `main.py`. Browser-based clients will be blocked or uncontrolled. | FHIR Server | **P0** | S | M |
| S-11 | **Security response headers absent** — No `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Content-Security-Policy` headers. | FHIR Server | **P1** | S | M |
| S-12 | **No BAA tracking** — No list of PHI-touching vendors with signed BAAs. Cloud provider, DB host, Redis host, logging provider all need BAAs. | Process | **P0** | S | H |
| S-13 | **No mTLS for service-to-service** — FHIR Server ↔ Middle Layer ↔ IAM Service calls use plain TLS without client certificate mutual auth. | Infrastructure | **P1** | M | M |
| S-14 | **Input sanitization gaps** — Free-text fields (notes, descriptions) not sanitized against XSS or injection. Pydantic `extra="forbid"` protects schema fields but not string content. | FHIR Server | **P1** | S | M |

---

## Category 2 — FHIR Conformance (Interoperability)

These gaps mean external FHIR clients (Epic, Cerner, Inferno test kit) cannot successfully connect to or use this server.

| # | Gap | Where | Priority | Effort | Risk |
|---|---|---|---|---|---|
| F-01 | **No CapabilityStatement (`GET /metadata`)** — Required by FHIR spec. Inferno's first test fetches this and fails the entire suite without it. Must list supported resources, search params, operations, and SMART capabilities. | FHIR Server | **P0** | M | H |
| F-02 | **No `_include` / `_revinclude` search** — Cross-resource search (e.g., `GET /Observation?_include=Observation:subject`) is essential for clinical workflows. Without it, clients must make N separate calls per patient. | FHIR Server | **P0** | L | H |
| F-03 | **No chained search** — `GET /Observation?subject.identifier=MRN123` cannot be expressed. Required for MPI-style lookups. | FHIR Server | **P1** | M | H |
| F-04 | **No `_has` (reverse-chained) search** | FHIR Server | **P2** | M | M |
| F-05 | **No search parameter modifiers** — `:exact`, `:missing`, `:text`, `:above`, `:below`, `:in`, `:not` are not implemented. | FHIR Server | **P1** | L | M |
| F-06 | **No `_sort` parameter** — Results always return in DB insertion order. FHIR clients expect sortable results. | FHIR Server | **P1** | S | M |
| F-07 | **No `_elements` / `_summary`** — Field projection for bandwidth-constrained clients. | FHIR Server | **P2** | M | L |
| F-08 | **No `_history` / versioning** — No `GET /{resourceType}/{id}/_history`, no `vread`, no version metadata in resources. Medico-legally required for EMRs. | FHIR Server | **P1** | M | H |
| F-09 | **No soft delete** — `delete_patient()` performs hard delete. Clinical records must be retained with deletion reason for medico-legal traceability. | FHIR Server | **P1** | M | H |
| F-10 | **No `Patient/$everything`** — Required by US Core for the 21st Century Cures Act patient access API. Returns all resources in the Patient compartment. | FHIR Server | **P1** | M | H |
| F-11 | **No `$validate` operation** — FHIR resource validation endpoint. Required for client-side pre-submission validation. | FHIR Server | **P1** | M | M |
| F-12 | **No transaction / batch Bundle** — `POST /` with a Bundle body. Required for atomic multi-resource operations (e.g., admit a patient creates Patient + Encounter + Coverage atomically). | FHIR Server | **P1** | L | H |
| F-13 | **No SMART on FHIR discovery** — No `.well-known/smart-configuration` endpoint. Required for all SMART apps to discover authorization parameters. | FHIR Server | **P0** | S | H |
| F-14 | **Terminology operations not under FHIR namespace** — `/api/v1/terminology` uses custom schemas. FHIR clients expect `GET /CodeSystem/$lookup`, `GET /ValueSet/$expand`, `POST /ValueSet/$validate-code`. | FHIR Server | **P1** | M | M |
| F-15 | **No US Core profile conformance** — Resources don't enforce US Core mandatory fields (e.g., Patient must have `identifier`, `name`, `gender`, `birthDate` per US Core). | FHIR Server + Middle Layer | **P1** | XL | H |
| F-16 | **No Bulk Data `$export`** — `GET /Patient/$export`, `GET /Group/{id}/$export`, `GET /$export` async NDJSON export. Required for ONC (g)(10) certification. | FHIR Server | **P1** | L | H |
| F-17 | **No FHIR Subscriptions** — Webhooks/WebSocket notification when resources change. Required for event-driven clinical workflows. | FHIR Server | **P1** | L | M |
| F-18 | **Bundle `fullUrl` and `link` absent** — FHIR Bundle `fullUrl` per entry and `link` (self/next/prev pagination URLs) are missing. | FHIR Server | **P1** | S | M |
| F-19 | **No conditional operations** — `If-None-Exist`, `If-Match`, `If-Modified-Since` headers for conditional create/update/delete not implemented. | FHIR Server | **P2** | M | L |
| F-20 | **`Patient/$match` (MPI) absent** — Master Patient Index matching. Required when multiple source systems send overlapping patient demographics. | Middle Layer | **P1** | L | M |

---

## Category 3 — Business Logic & Workflow (Clinical Safety)

These gaps are not about the data layer but about the rules that govern when and how clinical data changes.

| # | Gap | Where | Priority | Effort | Risk |
|---|---|---|---|---|---|
| B-01 | **No appointment booking rules** — A slot can be double-booked. No check that the slot belongs to the correct practitioner/schedule/service. No check that the patient has no conflicting appointment. | Middle Layer | **P0** | M | H |
| B-02 | **No prescription authorization** — A MedicationRequest can be created by any user regardless of prescribing authority. No DEA schedule check, no prior authorization workflow. | Middle Layer | **P0** | L | H |
| B-03 | **No order cosignature workflow** — STAT/high-risk orders need supervising physician countersignature before fulfillment. No approval state machine exists. | Middle Layer | **P1** | L | H |
| B-04 | **No clinical decision support hooks** — No CDS Hooks endpoint (`/cds-services`). No alert on drug-drug interaction, allergy conflict, dose range, or duplicate orders. | Middle Layer | **P1** | L | H |
| B-05 | **No encounter lifecycle management** — Encounter status transitions (planned → arrived → in-progress → finished → cancelled) have no guard rails. Any user can set any status. | Middle Layer | **P1** | M | H |
| B-06 | **No discharge workflow orchestration** — Discharge should trigger: close encounter, generate clinical summary (DocumentReference), update episode-of-care, notify coverage/payer, schedule follow-up. None of this is automated. | Middle Layer | **P1** | L | H |
| B-07 | **No result routing** — Lab results (Observation, DiagnosticReport) need to route to the ordering practitioner, the patient, and the care team. No notification mechanism exists. | Middle Layer | **P1** | L | M |
| B-08 | **No prior authorization workflow** — ServiceRequest/DeviceRequest require payer auth before fulfillment in many jurisdictions. No PA state machine or X12 270/271 integration. | Middle Layer | **P2** | XL | H |
| B-09 | **No formulary check** — MedicationRequest does not check formulary coverage, therapeutic substitution suggestions, or step-therapy requirements. | Middle Layer | **P2** | L | M |
| B-10 | **No clinical inbox / task routing** — Results, referral responses, and patient messages need to land in practitioner inboxes with prioritization and acknowledgment. | Middle Layer | **P1** | L | M |

---

## Category 4 — Performance & Scalability

| # | Gap | Where | Priority | Effort | Risk |
|---|---|---|---|---|---|
| P-01 | **No connection pool tuning** — `create_async_engine` uses defaults (pool_size=5, max_overflow=10). Under real clinical load this will exhaust connections. | FHIR Server | **P1** | S | H |
| P-02 | **No read-time search index** — Queries filter against ORM columns but there are no denormalized search parameter indexes for FHIR search semantics (`_include`, chained, etc.). | FHIR Server | **P1** | L | H |
| P-03 | **No response caching** — CapabilityStatement, terminology expansions, and hot reference data are recomputed on every request. | FHIR Server | **P1** | M | M |
| P-04 | **No read replicas / CQRS** — All reads and writes go to the same PostgreSQL instance. Read-heavy clinical workloads will degrade write performance. | Infrastructure | **P2** | L | M |
| P-05 | **No async job queue** — Long-running operations (bulk export, terminology load, HL7v2 ingestion) block the request thread. | Infrastructure | **P1** | L | M |
| P-06 | **Single PostgreSQL engine** — No mention of pgBouncer or equivalent. | Infrastructure | **P1** | S | M |

---

## Category 5 — Observability

| # | Gap | Where | Priority | Effort | Risk |
|---|---|---|---|---|---|
| O-01 | **No OpenTelemetry tracing** — No distributed trace across FHIR Server + Middle Layer + IAM Service. Debugging production issues is guesswork. | FHIR Server + Middle Layer | **P1** | M | M |
| O-02 | **No Prometheus `/metrics` endpoint** — No RED metrics (request rate, error rate, duration). No alerting surface. | FHIR Server | **P1** | S | M |
| O-03 | **No PHI-access anomaly detection** — AuditEvent stream not analyzed for unusual access patterns (off-hours bulk reads, VIP access, cross-org access). | Infrastructure | **P1** | L | H |
| O-04 | **No SLA monitoring** — No uptime tracking, no p95/p99 latency tracking, no on-call runbook. | Infrastructure | **P1** | M | M |

---

## Category 6 — Infrastructure & DevOps

| # | Gap | Where | Priority | Effort | Risk |
|---|---|---|---|---|---|
| I-01 | **No Dockerfile** — Cannot build a container image. Deployment is manual. | Infrastructure | **P0** | S | H |
| I-02 | **No docker-compose** — No local development stack definition. | Infrastructure | **P1** | S | M |
| I-03 | **No CI/CD pipeline** — No automated test/build/deploy. | Infrastructure | **P1** | M | H |
| I-04 | **No database backup / DR plan** — PHI without backups is a HIPAA contingency plan violation. | Infrastructure | **P0** | M | H |
| I-05 | **No secrets management** — Credentials in `.env`. Need Vault or cloud KMS. | Infrastructure | **P0** | S | H |
| I-06 | **No config profiles** — Single `Settings` class with 2 env vars. Prod/staging/dev divergence unmanaged. | FHIR Server | **P1** | S | M |
| I-07 | **No HL7v2 ingestion** — Hospital feeds are HL7v2 ADT/ORU/ORM messages. No adapter or queue consumer. | Integration | **P1** | L | M |

---

## Summary Scorecard

| Category | P0 Gaps | P1 Gaps | P2 Gaps |
|---|---|---|---|
| Security & Compliance | 8 | 6 | 0 |
| FHIR Conformance | 4 | 13 | 3 |
| Business Logic / Workflow | 2 | 7 | 1 |
| Performance | 0 | 4 | 2 |
| Observability | 0 | 4 | 0 |
| Infrastructure | 4 | 3 | 0 |
| **Total** | **18** | **37** | **6** |

**18 P0 gaps must be closed before any PHI is stored in this system.**
