# Implementation Plan — 44-Week Roadmap to Clinical-Grade AI-Native EMR

> Phased delivery plan from current state to production-ready clinical EMR with SMART on FHIR, full compliance, workflow engine, and AI-native ERP layer. Each phase has a measurable exit benchmark. Phases can be parallelized across teams.
>
> **Documents referenced:** `08-smart-on-fhir-implementation.md`, `09-ai-native-erp.md`

---

## Team Assumptions

- **Team A (2–3 engineers):** Backend — FHIR server enhancements, conformance, data model
- **Team B (1–2 engineers):** Middle layer (Pulse) — business logic, workflow orchestration, SMART auth
- **Team C (1–2 engineers):** AI layer — FastMCP, AI agents, ambient documentation, analytics
- **Infra (1 engineer):** Infrastructure, DevOps, security controls
- **QA/Compliance (1 person):** Testing strategy, HIPAA documentation, Inferno runs

---

## Phase 0 — Immediate Security Hardening (Week 1–2)

> **Goal:** Stop the bleeding. No PHI should be stored until these P0 gaps are closed.

### Team A

| Task | File(s) | Effort |
|---|---|---|
| Add `JWTAuthMiddleware` to validate JWT signature, iss, aud, exp | `app/middleware/auth.py` | 1 day |
| Mount `JWTAuthMiddleware` in `main.py` | `app/main.py` | 1 hour |
| Extend `Settings` with `IAM_ISSUER`, `IAM_JWKS_URL`, `IAM_AUDIENCE` | `app/core/config.py` | 1 hour |
| Add `CORSMiddleware` with explicit `allow_origins` | `app/main.py` | 1 hour |
| Add `SecurityHeadersMiddleware` (HSTS, XCTO, X-Frame) | `app/middleware/security_headers.py` | 2 hours |
| Remove PATCH/PUT/DELETE routes from `/audit-events` router | `app/routers/audit_event.py` | 1 hour |

### Team B — IAM SMART Foundation

| Task | File(s) / Reference | Effort |
|---|---|---|
| Configure SMART v2 granular scopes in IAM (patient/user/system contexts, all 34 resource types) | `doc 08 §1.3` | 1 day |
| Configure custom JWT claims: `activeOrganizationId`, `roles`, `fhirUser`, `launch_response.patient` | IAM admin / `doc 08 §1.2` | 4 hours |
| Configure IAM clients: web app (PKCE), `pulse-orchestrator` (client_credentials + private_key_jwt), patient app (PKCE) | IAM admin / `doc 08 §1.4` | 4 hours |

### Infra

| Task | Effort |
|---|---|
| Create `Dockerfile` (multi-stage, non-root user, distroless) | 1 day |
| Create `docker-compose.yml` (fhir-server, postgres, redis, iam-service) | 1 day |
| Move all secrets to `.env.example` with placeholders; add `.env` to `.gitignore` | 1 hour |
| Enable PostgreSQL TDE (or use RDS encrypted instance) | 1 day |
| Enable Redis encryption in transit and at rest | 4 hours |
| Reverse proxy (nginx/Caddy) with TLS 1.3 | 1 day |

### Exit Benchmark

- [ ] Any request without a valid JWT returns 401 OperationOutcome
- [ ] HTTPS enforced — HTTP returns 301
- [ ] `FHIR_DATABASE_URL` not committed to git
- [ ] AuditEvent endpoint has no mutation routes
- [ ] IAM issues tokens with `activeOrganizationId`, `roles`, and SMART scopes in `scope` claim; `launch_response.patient` claim populated after EHR launch

---

## Phase 1 — Auth & Compliance Layer (Week 2–8)

> **Goal:** HIPAA §164.312 technical safeguards implemented. PHI access is fully audited.

### Team A — FHIR Server

| Task | File(s) | Effort |
|---|---|---|
| `PHIAuditMiddleware` — auto-emit AuditEvent on every `/api/fhir/v1/*` request | `app/middleware/audit.py` | 3 days |
| Soft delete for all resources (add `is_deleted`, `deleted_at`, `deleted_by`, filter queries) | `app/models/*/` + `app/repository/*/` | 3 days |
| Resource versioning — `version_id` column + `<resource>_versions` table + `_history` endpoints | `app/models/*/` + Alembic migration | 1 week |
| Connection pool tuning (`pool_size`, `max_overflow`, `pool_pre_ping`, `pool_recycle`) | `app/core/database.py` | 2 hours |
| `GET /api/fhir/v1/metadata` CapabilityStatement | `app/routers/metadata.py` | 2 days |
| `GET /.well-known/smart-configuration` | `app/main.py` | 1 day |
| Add `SMART_SCOPE_MAP` to Settings; expose in config | `app/core/config.py` | 1 day |

### Team B — Middle Layer (Pulse) + SMART

| Task | File(s) / Reference | Effort |
|---|---|---|
| Scaffold `pulse/` FastAPI service | `pulse/main.py` | 1 day |
| `AuthContext` dataclass + `get_auth_context` dependency | `pulse/auth/middleware.py` | 1 day |
| JWT validation middleware for Pulse (shares `JWTAuthMiddleware` impl) | `pulse/auth/middleware.py` | 1 day |
| SMART scope extraction + `require_scope()` dependency (all three contexts: patient/user/system) | `pulse/auth/smart.py` — `doc 08 §5` | 2 days |
| RBAC matrix (roles → resource → action) + `require_role_action()` | `pulse/auth/rbac.py` | 3 days |
| `FHIRClient` (httpx async) + `AuditingFHIRClient` | `pulse/fhir_client/client.py` | 2 days |
| Break-glass access pattern | `pulse/auth/break_glass.py` | 2 days |
| **EHR launch API** — `POST /smart/launch` creates Redis-backed launch token | `pulse/routers/smart_launch.py` — `doc 08 §3.1` | 1 day |
| **`SMARTBackendAuth`** — asymmetric JWT client assertion for Pulse → FHIR server calls | `pulse/auth/backend_services.py` — `doc 08 §3.3` | 1 day |
| **Token refresh service** — proactive refresh before expiry, handles expired refresh tokens | `pulse/auth/token_refresh.py` — `doc 08 §7` | 1 day |
| **SMART app registration endpoint** (`POST /smart/register`) — dynamic client registration | `pulse/routers/smart_register.py` — `doc 08 §8` | 2 days |
| **`PatientContextMiddleware`** — restricts patient-scoped token to their own resources | `pulse/middleware/patient_context.py` — `doc 08 §6` | 4 hours |

### Infra

| Task | Effort |
|---|---|
| Set up AWS Secrets Manager for all credentials | 1 day |
| Configure MFA in IAM for all non-patient roles | 4 hours |
| PostgreSQL point-in-time recovery (PITR) configured and tested | 1 day |
| Automated daily backup with restore test | 1 day |
| BAA signed with AWS (RDS, ElastiCache, S3, SES, CloudWatch) | 1 week (legal) |

### Exit Benchmark

- [ ] Every `GET /api/fhir/v1/patients/{id}` produces an AuditEvent in DB
- [ ] Soft delete: `DELETE /patients/{id}` sets `is_deleted=true`, not physical delete
- [ ] `GET /patients/{id}` returns 404 for deleted patient
- [ ] `GET /metadata` returns valid CapabilityStatement with SMART extensions
- [ ] `GET /.well-known/smart-configuration` returns valid JSON with `capabilities` array
- [ ] MFA required for physician login in IAM
- [ ] Database backup taken and successfully restored in test
- [ ] `POST /smart/launch` returns a `launch` token; IAM validates it and injects patient context into resulting token
- [ ] Pulse → FHIR server call uses `SMARTBackendAuth` (client_credentials + asymmetric JWT)
- [ ] Patient-scoped token (`patient/Patient.r`) blocked from accessing a different patient's record

---

## Phase 2 — FHIR Conformance (Week 6–16, overlaps Phase 1)

> **Goal:** Pass Inferno's Single-Patient US Core test group locally.

### Team A

| Task | File(s) | Effort |
|---|---|---|
| FHIR search parameter registry for all 34 resources | `app/fhir/search/parameters.py` | 1 week |
| `FHIRSearchQueryBuilder` (string, token, date, reference types) | `app/fhir/search/builder.py` | 1 week |
| `_include` and `_revinclude` support | `app/fhir/search/include.py` | 1 week |
| `_sort` support | `app/fhir/search/sort.py` | 3 days |
| Search-parameter indexes (PostgreSQL GIN / B-tree on searchable columns) | Alembic migration | 3 days |
| `Patient/$everything` operation | `app/routers/patient.py` | 2 days |
| `$validate` operation | `app/routers/validate.py` | 3 days |
| Transaction + batch Bundle processor (`POST /api/fhir/v1/`) | `app/routers/bundle.py` | 1 week |
| Chained search (`Observation?subject.name=`) | `app/fhir/search/chain.py` | 1 week |
| FHIR `_history` endpoints for all resources | `app/routers/*/` | 1 week |
| Bundle `fullUrl` and `link` (self/next/prev) in paginated responses | `app/core/content_negotiation.py` | 1 day |
| FHIR terminology operations under `/api/fhir/v1/` namespace | `app/routers/terminology_fhir.py` | 2 days |
| US Core Patient profile validation (identifier, name, gender required) | `app/core/validation.py` | 2 days |

### Team B — SMART End-to-End Testing

| Task | File(s) / Reference | Effort |
|---|---|---|
| Manual PKCE flow verification (bash script from `doc 08 §10`) | `doc 08 §10` | 4 hours |
| Standalone launch end-to-end test (patient app → Keycloak → FHIR server) | `doc 08 §3.2` | 1 day |
| EHR launch end-to-end test (portal → launch API → Keycloak → SMART app) | `doc 08 §3.1` | 1 day |
| Backend services flow test (Pulse → FHIR server with client_credentials JWT) | `doc 08 §3.3` | 4 hours |
| IAM launch token validation integration — implement the callback, shared Redis, or pre-auth pattern (see `doc 08 §3.1.1`) | `doc 08 §3.1.1` | 2–3 days |

### QA/Compliance

| Task | Effort |
|---|---|
| Run Inferno locally — baseline run (expect failures, document all) | 1 day |
| **Run Inferno SMART App Launch test group** — fix all failures | 1 week |
| Run Inferno Single-Patient US Core test group | Ongoing |
| Prioritize fixes by Inferno test group | Ongoing |
| Re-run Inferno after each batch of fixes | Continuous |

### Exit Benchmark

- [ ] `GET /metadata` passes Inferno capability test
- [ ] **Inferno SMART App Launch: all tests green** (discovery, PKCE auth, token exchange, patient context, scope filtering, token refresh, revocation)
- [ ] Single-Patient US Core: Patient, Condition, Observation, AllergyIntolerance, Immunization, MedicationRequest all pass
- [ ] `Patient/{id}/$everything` returns all compartment resources
- [ ] Search with `_include=Observation:subject` returns patient inline
- [ ] `_history` endpoints return version history
- [ ] EHR launch flow works: portal creates launch token → Keycloak validates → SMART app gets `patient` claim in token

---

## Phase 3 — Business Logic & Workflow (Week 8–20)

> **Goal:** Clinical workflows enforced. No double-booking, no unsigned prescriptions, no illegal state transitions.

### Team B

| Task | File(s) | Effort |
|---|---|---|
| Appointment booking workflow with slot validation | `pulse/workflows/appointment.py` | 1 week |
| Encounter state machine + transition guards | `pulse/workflows/encounter.py` | 1 week |
| Prescription workflow (allergy check, DEA authority, formulary) | `pulse/workflows/prescription.py` | 2 weeks |
| Lab result routing + critical value notification | `pulse/workflows/lab_results.py` | 1 week |
| Discharge workflow orchestration (bundle + notifications) | `pulse/workflows/discharge.py` | 1 week |
| CDS Hooks service (patient-view, order-sign hooks) | `pulse/cds/hooks.py` | 2 weeks |
| Drug-drug interaction check (integrate local drug DB or NLM RxNorm API) | `pulse/cds/drug_interactions.py` | 1 week |
| ABAC engine (care team check, VIP gate, sensitivity gate) | `pulse/auth/abac.py` | 2 weeks |
| Consent evaluator (FHIR Consent → permit/deny) | `pulse/auth/consent.py` | 1 week |
| `Patient/$match` (MPI — demographic matching) | `pulse/workflows/patient_match.py` | 1 week |
| Notification service (email, SMS, in-app) | `pulse/notifications/service.py` | 1 week |

### Team A (Supporting)

| Task | File(s) | Effort |
|---|---|---|
| Add `status_reason` and audit fields to Appointment/Encounter/MedicationRequest | `app/models/*/` + Alembic | 3 days |
| Webhook subscriber model + `SubscriptionDispatcher` | `app/models/subscription/` | 3 days |
| FHIR Subscriptions (rest-hook + websocket channels) | `app/routers/subscription.py` | 1 week |
| Add column-level encryption for SSN, government ID fields | `app/models/patient/patient.py` | 2 days |

### Exit Benchmark

- [ ] Double-booking attempt returns 409 with OperationOutcome
- [ ] MedicationRequest created without prescriber authority returns 403
- [ ] Encounter status transition `arrived → finished` (skipping in-progress) returns 422
- [ ] CDS Hooks patient-view returns allergy alerts for medications
- [ ] Discharge workflow creates Encounter-closed + DocumentReference + CarePlan atomically
- [ ] Patient with `Consent.deny(ETH)` — substance use records blocked for non-authorized users

---

## Phase 3.5 — AI Foundation (Week 18–24, overlaps Phase 3 end)

> **Goal:** FastMCP server live, AI agents can read/write FHIR resources with full SMART auth and provenance. Ambient documentation draft pipeline working end-to-end.

### Team C — AI Layer

| Task | File(s) / Reference | Effort |
|---|---|---|
| **Sign Anthropic BAA** — required before any PHI in prompts | Legal / Anthropic | 1 week (legal) |
| Scaffold `ai_gateway/` FastAPI + FastMCP service | `ai_gateway/mcp_server.py` — `doc 09 §1.1` | 1 day |
| Dynamic tool loading from FHIR server OpenAPI spec | `ai_gateway/tools/loader.py` — `doc 09 §1.1` | 2 days |
| Implement core MCP tools: `search_patients`, `get_patient_chart`, `create_encounter` | `ai_gateway/tools/clinical.py` — `doc 09 §1.1` | 2 days |
| **AI agent Keycloak clients** — one per agent type, each with minimal scopes | Keycloak Admin / `doc 09 §1.2` | 1 day |
| `create_with_provenance()` helper — wraps every AI FHIR write in a transaction + Provenance resource | `ai_gateway/fhir/provenance.py` — `doc 09 §1.2` | 1 day |
| **`AIAuditService`** — AuditEvent for every AI inference that touches a FHIR resource | `ai_gateway/audit.py` — `doc 09 §9.2` | 1 day |
| **`AIQualityMonitor`** — records acceptance/rejection rate per agent per suggestion type | `ai_gateway/monitoring/quality.py` — `doc 09 §9.3` | 2 days |
| **Ambient documentation pipeline** — encounter context → LLM → SOAP note draft → `SOAPNoteDraft` schema | `ai_gateway/agents/documentation.py` — `doc 09 §2` | 1 week |
| Extract diagnoses + orders from SOAP note → Condition/ServiceRequest drafts (pending clinician review) | `ai_gateway/agents/documentation.py` — `doc 09 §2.2` | 3 days |
| **Intelligent scheduling agent** — `find_optimal_slots()` with preference scoring | `ai_gateway/agents/scheduling.py` — `doc 09 §3.1` | 1 week |
| No-show prediction service (`NoShowPredictionService`) | `ai_gateway/agents/scheduling.py` — `doc 09 §3.2` | 3 days |

### Team B (Supporting)

| Task | File(s) | Effort |
|---|---|---|
| Expose `GET /smart/launch` (EHR) + `GET /smart/app-gallery` routes for SMART app listing | `pulse/routers/smart_launch.py` | 1 day |
| CDS Hooks discovery endpoint (`GET /cds-services`) returns registered hook services | `pulse/routers/cds_hooks.py` | 2 days |

### Infra

| Task | Effort |
|---|---|
| Deploy `ai_gateway` as containerized service alongside FHIR server + Pulse | 1 day |
| Add `ANTHROPIC_API_KEY` to Secrets Manager | 1 hour |
| Set Claude API rate limits and token budget alerts (cost control) | 4 hours |
| Cache layer for repeated AI queries (terminology lookups, care gap rules) | 1 day |
| Fallback circuit breaker: if Claude API unavailable, degrade gracefully (no AI features, care not blocked) | 2 days |

### Exit Benchmark

- [ ] FastMCP server running; AI agent can call `search_patients` and `get_patient_chart` via MCP
- [ ] Every AI FHIR write produces a `Provenance` resource linking to the AI agent
- [ ] Anthropic BAA signed — confirmed HIPAA-eligible
- [ ] SOAP note draft generated from a sample encounter context in < 10 seconds
- [ ] Clinician can accept/reject each SOAP section in UI; accepted sections produce `DocumentReference`
- [ ] Scheduling agent returns ranked slot list for a given patient + service type
- [ ] AI agent blocked from resources outside its declared Keycloak scopes

---

## Phase 4 — Observability & Scale (Week 22–30)

> **Goal:** Production operations visibility across all three services (FHIR server, Pulse, AI gateway). On-call can diagnose issues in minutes.

### Team A

| Task | File(s) | Effort |
|---|---|---|
| OpenTelemetry instrumentation (auto + manual spans) | `app/core/telemetry.py` | 3 days |
| Prometheus `/metrics` endpoint (request rate, error rate, latency) | `app/core/metrics.py` | 2 days |
| Redis caching for CapabilityStatement, terminology expansions | `app/core/cache.py` | 2 days |
| Bulk Data `$export` (async NDJSON to S3) | `app/routers/export.py` | 1 week |
| Add `_elements` and `_summary` projection to all search responses | `app/fhir/search/projection.py` | 1 week |

### Team C — AI Observability

| Task | File(s) / Reference | Effort |
|---|---|---|
| OTel spans for every AI inference (model, prompt tokens, latency, suggestion type) | `ai_gateway/core/telemetry.py` | 1 day |
| Grafana panel: AI suggestion acceptance rate by agent + suggestion type | Grafana dashboard | 1 day |
| Alert if Claude API p95 latency > 8s or error rate > 5% | Grafana alerts | 4 hours |
| Monthly AI quality report — auto-generated from `AIQualityMonitor` | `ai_gateway/reports/quality.py` — `doc 09 §9.3` | 2 days |
| Token budget dashboard (daily/monthly Anthropic API spend) | Grafana + cost API | 1 day |

### Infra

| Task | Effort |
|---|---|
| Deploy OpenTelemetry Collector (OTLP → Jaeger/Tempo) — covers all 3 services | 2 days |
| Set up Grafana dashboard (RED metrics for FHIR server + Pulse + AI gateway) | 2 days |
| Set up SIEM alert rules (PHI anomaly detection) | 3 days |
| Configure pgBouncer for connection pooling | 1 day |
| Set up read replica for reporting/bulk export queries | 2 days |
| Load test with k6 (100 concurrent users, 1000 req/sec) | 1 week |
| Set up async job queue (Celery + Redis or AWS SQS) for bulk operations and AI jobs | 3 days |

### Exit Benchmark

- [ ] Grafana shows request rate, error rate, p95 latency for all endpoints across all three services
- [ ] OTel traces span: browser → Pulse → FHIR server → DB with no trace gaps
- [ ] AI inference traces visible: latency, token count, model version, outcome
- [ ] `GET /$export` returns 202 and completes with valid NDJSON in S3
- [ ] Load test: 95th-percentile `GET /patients/{id}` < 100ms at 100 rps
- [ ] PHI anomaly alert fires when >50 records accessed in 1 minute
- [ ] Monthly AI quality report auto-delivered to compliance officer

---

## Phase 5 — Integrations & AI ERP Features (Week 28–38)

> **Goal:** Real-world connectivity (HL7v2, Epic/Cerner), full AI ERP feature set live with governance.

### Team B — Integrations

| Task | File(s) / Reference | Effort |
|---|---|---|
| HL7v2 ADT feed consumer (SQS queue → FHIR resources) | `pulse/integrations/hl7v2/` | 2 weeks |
| HL7v2 ORU (lab result) consumer → DiagnosticReport + Observations | `pulse/integrations/hl7v2/oru.py` | 1 week |
| Epic SMART App Launch integration (App Orchard registration + test) | `pulse/integrations/epic/` — `doc 08 §3.1` | 1 week |
| CDS Hooks `patient-view` + `order-sign` hooks — full response with cards | `pulse/routers/cds_hooks.py` | 1 week |
| FHIR Subscription webhook delivery with HMAC signature | `pulse/subscriptions/dispatcher.py` | 3 days |

### Team C — AI ERP Features

| Task | File(s) / Reference | Effort |
|---|---|---|
| **Revenue cycle automation** — ICD-10/CPT auto-coding from clinical docs | `ai_gateway/agents/revenue_cycle.py` — `doc 09 §4.1` | 2 weeks |
| Prior authorization need assessment (LLM + payer rules) | `ai_gateway/agents/revenue_cycle.py` — `doc 09 §4.1` | 1 week |
| Denial analysis + appeal letter generation | `ai_gateway/agents/revenue_cycle.py` — `doc 09 §4.1` | 1 week |
| **Population health** — care gap detection (diabetic, hypertension, preventive screenings) | `ai_gateway/analytics/population_health.py` — `doc 09 §5.1` | 1 week |
| 30-day readmission risk prediction (LACE+ features from FHIR) | `ai_gateway/analytics/population_health.py` — `doc 09 §5.2` | 1 week |
| **Patient-facing AI** — portal Q&A (patient-scoped, own data only, plain language) | `ai_gateway/agents/patient_portal.py` — `doc 09 §8.1` | 1 week |
| Appointment preparation instructions (language-adaptive, visit-type-aware) | `ai_gateway/agents/patient_portal.py` — `doc 09 §8.1` | 3 days |
| **Staff scheduling optimization** — weekly schedule proposal from historical volumes | `ai_gateway/agents/staff_scheduling.py` — `doc 09 §7.1` | 1 week |
| **Supply chain forecasting** — procurement recommendations from procedure schedule | `ai_gateway/tools/supply_chain.py` — `doc 09 §7.2` | 3 days |
| Human-in-the-loop gating table enforced for all AI suggestion types | `ai_gateway/governance/hitl.py` — `doc 09 §9.1` | 2 days |
| AI model version pinning + audit trail includes exact `model_id` used | `ai_gateway/audit.py` | 1 day |

### Exit Benchmark

- [ ] ADT A01 (admission) HL7v2 message creates Patient + Encounter in FHIR server
- [ ] ORU R01 (lab result) creates DiagnosticReport + Observations and routes to ordering provider
- [ ] CDS Hooks `order-sign` returns drug interaction cards (from Epic and standalone)
- [ ] Revenue cycle agent suggests ICD-10/CPT codes; coder accepts/rejects before claim submission
- [ ] Care gap report identifies diabetic patients missing HbA1c (last 90 days)
- [ ] Patient portal AI answers "What medications am I on?" using only patient's own record
- [ ] All AI-generated clinical resources have a `Provenance` resource; AI writes blocked without it
- [ ] Human-in-the-loop: prescription draft requires physician sign; never auto-created

---

## Phase 6 — Certification & Hardening (Week 36–44)

> **Goal:** ONC (g)(10) certification path begun. SOC 2 evidence collection started. Pen test completed.

### QA/Compliance

| Task | Effort |
|---|---|
| Full Inferno (g)(10) run — produce clean report | 1 week |
| Engage ONC-ACB for certification pre-review | 2 weeks |
| Start SOC 2 Type II evidence collection (Vanta/Secureframe) | Ongoing (6 months) |
| Engage pen-testing firm for external assessment | 2 weeks |
| Remediate all pen-test critical/high findings | 1–2 weeks |
| HIPAA Security Rule Risk Analysis (written) | 1 week |
| HIPAA workforce training materials and tracking | 1 week |

### Exit Benchmark

- [ ] Inferno (g)(10) test run: 0 failures in Single-Patient US Core group
- [ ] Inferno (g)(10) test run: Bulk Data export passes all checks
- [ ] No critical/high pen-test findings unresolved
- [ ] SOC 2 Type II audit period started
- [ ] HIPAA Security Rule Risk Analysis signed by CISO/CO

---

## Milestone Summary

| Milestone | Target Week | Key Deliverable |
|---|---|---|
| M0 — Security floor | Week 2 | Pulse JWT auth layer live, TLS enforced, FHIR server network-isolated, secrets secured, audit log append-only, IAM SMART scopes + claims configured |
| M1 — HIPAA baseline + SMART auth | Week 8 | PHI audit every read/write, soft delete, versioning, backups, EHR launch API live, `PatientContextMiddleware` |
| M2 — FHIR conformance + SMART certified | Week 16 | Inferno SMART App Launch group: all green; Single-Patient US Core: all green |
| M3 — Workflow engine | Week 20 | Appointment/encounter/prescription state machines in Pulse; CDS Hooks discovery endpoint |
| M3.5 — AI foundation | Week 24 | FastMCP live, ambient SOAP draft pipeline, scheduling agent, Anthropic BAA signed |
| M4 — Observability | Week 28 | Grafana RED across all 3 services, OTel traces, bulk export, AI quality reporting |
| M5 — Integrations + AI ERP | Week 38 | HL7v2 ADT/ORU live, Epic SMART, revenue cycle AI, population health, patient portal AI |
| M6 — Certification | Week 44 | Inferno (g)(10) clean run, pen test remediated, SOC 2 audit period started, FDA SaMD review done |

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| JWT middleware breaks existing integrations | Medium | High | Feature flag for gradual rollout; test against all consumers first |
| Soft delete migration breaks existing queries | High | High | Add `is_deleted` column with default `false`; index it; test all repo filters |
| Terminology FHIR namespace conflicts with existing `/terminology` | Low | Medium | Mount at `/api/fhir/v1/` separately from `/api/v1/terminology` |
| Inferno fails due to IAM PKCE misconfiguration | Medium | High | Test PKCE flow manually (`doc 08 §10`) before Inferno run; verify `code_challenge_method=S256` accepted and `code_verifier` validated |
| Bulk export runs OOM on large datasets | Medium | High | Use server-side cursor + streaming write, never load all into memory |
| Middle layer adds latency | Low | Medium | Async HTTP to FHIR server; mTLS handshake cached; connection pool |
| HL7v2 parsing produces invalid FHIR | High | Medium | Use Microsoft FHIR-Converter as baseline; add custom mapping layer |
| SOC 2 audit scope creep | Medium | Medium | Define scope early; use Vanta/Secureframe to track controls |
| **IAM does not support a launch token validation hook** | Medium | Medium | Use one of the three patterns in `doc 08 §3.1.1` (callback, shared Redis, pre-auth resolution); most IAMs support at least one |
| **EHR launch token not consumed before expiry (race)** | Low | Medium | 60-second TTL is intentional; if expired, user re-initiates launch — common pattern |
| **AI hallucinates clinical content** | Medium | High | Every AI clinical output requires human review before becoming an active FHIR resource; never auto-activate |
| **Anthropic API unavailable blocks clinical workflow** | Low | High | Circuit breaker in AI gateway; all features degrade gracefully — clinicians fall back to manual documentation |
| **AI suggestions bypass human review in hurried workflows** | Medium | High | Enforce HITL gating in code (`doc 09 §9.1`); audit acceptance rate; alert compliance if sign-without-review rate rises |
| **PHI leaks into Claude prompts without BAA** | High | Critical | Anthropic BAA must be signed before Phase 3.5 starts; hard gate in deployment pipeline |
| **FDA SaMD classification applies to diagnostic AI features** | Medium | High | Early legal review; differential diagnosis tool is advisory only; revenue cycle coding is billed separately not diagnostic |
| **SMART app registration misused to register malicious apps** | Low | High | Admin-approval gate before activation; scope restriction per registered app; audit all registrations |

---

## Technology Additions Required

| Category | Tool | Justification |
|---|---|---|
| Distributed tracing | OpenTelemetry (otlp) + Jaeger/Tempo | OTEL is vendor-neutral, native Python support |
| Metrics | `prometheus-fastapi-instrumentator` | Drop-in Prometheus for FastAPI |
| Async job queue | Celery + Redis broker | Bulk export, HL7v2 processing, AI jobs |
| Secrets | AWS Secrets Manager or HashiCorp Vault | Replace `.env` credential exposure |
| Object storage | AWS S3 (HIPAA-eligible) | Bulk export NDJSON, audit archive |
| Email (BAA) | AWS SES (signed BAA) | Patient notifications |
| HL7v2 parsing | `python-hl7` or `hl7apy` | Parse incoming ADT/ORU messages |
| SMART conformance test | Inferno (Docker) | Run locally before each milestone |
| Load testing | k6 | Performance benchmarks |
| Compliance automation | Vanta or Secureframe | SOC 2 evidence collection |
| **AI / LLM** | Anthropic Claude API (`anthropic` Python SDK) | Ambient docs, CDS, scheduling, revenue cycle |
| **MCP server** | FastMCP | Expose FHIR endpoints as AI tools (already planned per CLAUDE.md) |
| **AI tracing** | LangSmith or custom OTel spans | Track AI inference cost, latency, acceptance rate |
| **IAM admin client** | Provider-specific SDK / REST client | SMART app registration, client management via `IamAdminClient` interface |
| **PKCE helper** | `authlib` or `python-jose` | PKCE verifier/challenge generation for backend tests |
| **Speech-to-text** (optional) | AWS Transcribe Medical (BAA-eligible) | Ambient audio → transcript for documentation pipeline |

---

## Architecture Decision Records (ADRs)

### ADR-001: Middle Layer as Separate Service

**Decision:** Build the middle layer (`pulse`) as a separate FastAPI service, not as middleware within the FHIR server.

**Rationale:** The FHIR server must remain a pure data layer (replaceable with Medplum/HAPI if needed). Business logic in the FHIR server would couple domain rules to FHIR semantics, making them hard to test and change. A separate service can be scaled, versioned, and replaced independently.

**Consequence:** Two services to deploy, maintain, and observe. Add to container orchestration from day 1 to manage this complexity.

---

### ADR-002: Soft Delete for All PHI Resources

**Decision:** All 34 FHIR resources use soft delete (`is_deleted` flag) instead of physical DELETE.

**Rationale:** Clinical records have medico-legal retention requirements (typically 7–10 years post last encounter). Hard delete would violate these requirements and destroy audit history. FHIR `_history` depends on retention.

**Consequence:** Every repository query must include `WHERE is_deleted = FALSE`. Add this to `_apply_list_filters()` in all repositories. Alembic migration adds the column with `DEFAULT FALSE`.

---

### ADR-003: AuditEvent Written by Middleware, Not Service Layer

**Decision:** `PHIAuditMiddleware` in the FHIR server writes AuditEvents directly to the database for every FHIR API request, independent of the service layer.

**Rationale:** Service-layer audit calls can be bypassed (e.g., direct repository calls in tests, background jobs). Middleware-level audit is exhaustive — it fires for every HTTP request regardless of which code path handles it.

**Consequence:** Audit writes are fire-and-forget tasks. If the audit write fails, it must be logged to stderr/SIEM but must not fail the original request. Monitor audit write failure rate as an alert.

---

### ADR-004: IAM as a Separate Service, FHIR Server as Auth-Free Data Plane

**Decision:** Authentication and token issuance live in a dedicated IAM application. The FHIR server has no JWT auth middleware — it is a private data plane. JWT validation, SMART scope enforcement, RBAC, and ABAC all live in Pulse.

**Rationale:** The FHIR server must remain a replaceable, pure data layer. Coupling auth to it would require every auth change to go through a FHIR server deployment. Pulse is the natural enforcement layer — it already sits between consumers and the FHIR server. The IAM contract (`doc 08 §1`) is stable regardless of which provider is used; swapping IAMs requires only config changes.

**Consequence:** The FHIR server must be network-isolated — not publicly reachable except through Pulse. Any OAuth2 + OIDC compliant IAM that issues tokens conforming to the claim contract satisfies the integration. Three-service architecture (IAM + Pulse + FHIR server).

---

### ADR-005: SMART EHR Launch Token Stored in Redis

**Decision:** The EHR launch token (`POST /smart/launch`) is stored in Redis with a 60-second TTL. The IAM validates this token during the auth code flow and injects the patient context into the resulting access token claims.

**Rationale:** SMART v2 EHR launch requires encoding patient/encounter context into a short-lived token that the auth server validates before issuing the authorization code. Redis is a natural choice for the handoff: Pulse writes the context; the IAM reads or queries it. The Pulse-side implementation is identical regardless of which IAM is used.

**Consequence:** The IAM must implement one of the three validation patterns described in `doc 08 §3.1.1` (callback to Pulse, shared Redis read, or pre-auth resolution). Choose based on what extension points the IAM exposes. No specific programming language or framework is required on the IAM side.

---

### ADR-006: AI Gateway as Third Service (not embedded in Pulse)

**Decision:** The AI layer (`ai_gateway/`) is a separate FastAPI service rather than a module inside Pulse.

**Rationale:** AI inference is compute-intensive, latency-variable, and depends on an external API (Anthropic). Separating it means: (1) Pulse never blocks on AI latency; (2) the AI service can scale independently; (3) AI features can be disabled or replaced (e.g., swap Claude for an open-source model) without touching the clinical workflow layer; (4) audit and cost controls are isolated.

**Consequence:** Three services to deploy and observe. FastMCP runs as part of `ai_gateway` and communicates with Pulse via HTTP + SMART backend services auth. Add `ai_gateway` to the docker-compose and Kubernetes manifests from Phase 3.5.

---

### ADR-007: AI Clinical Outputs Always Require Human Review Before Activation

**Decision:** No AI-generated FHIR resource becomes `status=active` (or equivalent confirmed state) automatically. AI outputs land as `status=draft` or `status=proposed` and require explicit clinician sign-off.

**Rationale:** Clinical safety and regulatory compliance (FDA SaMD). An AI that auto-creates active MedicationRequests or Conditions without review is a prescribing/diagnosing system — subject to FDA 510(k) clearance. Advisory drafts that clinicians confirm are a documentation tool, not a medical device (generally). This also preserves clinician accountability.

**Consequence:** Every AI agent orchestrator must set the draft status on any clinical resource it creates. The UI must present a review queue. Acceptance rate must be tracked (`AIQualityMonitor`) and falling acceptance rates must trigger compliance review.

---

### ADR-008: Anthropic BAA Required Before Phase 3.5

**Decision:** Phase 3.5 (AI Foundation) cannot begin until the Anthropic Business Associate Agreement is signed and confirmed.

**Rationale:** Sending PHI to any AI API without a BAA is a HIPAA violation. Claude API calls include patient data in prompts. The BAA must be in place before any production or staging data flows to Anthropic's servers.

**Consequence:** Block Phase 3.5 tasks in the project tracker until BAA is confirmed. During development, use fully synthetic/de-identified data only. Add a hard check in the CI/CD deployment pipeline: Phase 3.5 services may not deploy to staging or production without a BAA confirmation flag in the secrets manager.
