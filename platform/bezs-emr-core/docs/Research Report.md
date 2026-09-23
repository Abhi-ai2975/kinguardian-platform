# From CRUD to Clinical-Grade: Making a Node.js FHIR Server Hospital-Ready

## TL;DR
- **Target FHIR R4 (4.0.1) and treat the gap between your CRUD app and a hospital-grade server as roughly 80% non-CRUD work** — authorization (SMART on FHIR/OAuth2), conformance (US Core, CapabilityStatement, search semantics), security/audit (HIPAA, AuditEvent), and operations (HA, backup/DR, observability) are where the real effort lives. A bare Express + Mongo/Postgres CRUD server is perhaps 10–15% of a production FHIR platform.
- **Seriously consider adopting Medplum (Apache-2.0, Node.js/TypeScript + PostgreSQL) instead of hardening your own server from scratch.** It already ships SMART on FHIR, US Core, profile validation, AuditEvent logging, subscriptions, `_include`/`_revinclude`/chained search, GraphQL and `Patient/$everything`, and per Medplum's June 1, 2026 announcement its "HITRUST e1 Certification joins Medplum's existing compliance portfolio, including SOC 2 Type 2, HIPAA, and ONC certification" — a multi-year head start. Build-from-scratch is justified only if you have a hard reason your data can't live in a standard FHIR datastore.
- **Sequence the work by P0/P1/P2:** first close the legal/security floor (TLS, encryption at rest, OAuth2 + scope enforcement, audit logging, backups, BAAs); then conformance (US Core profiles, CapabilityStatement, search/`$everything`, validation, terminology); then scale/interoperability (bulk export, subscriptions, HL7v2 ingestion, CDS Hooks, Epic/Cerner) and certification (Inferno/ONC, SOC 2, pen testing).

## Key Findings

1. **Version: R4 (4.0.1) is non-negotiable for US hospitals.** The ONC Cures Act Final Rule (§170.315(g)(10), Federal Register, May 1, 2020) requires "the use of the Health Level 7 (HL7®) Fast Healthcare Interoperability Resources (FHIR®) standard Release 4" — specifically FHIR 4.0.1 — and adopts the US Core IG. Both Epic and Oracle Health (Cerner) expose R4 as their production endpoints; neither offers production R5. R4 is also, per the HL7 US Core Roadmap, "the first version with Normative content" (Patient, Observation, Bundle are normative), so building on it is forward-safe. HL7's US Realm Steering Committee "decided that the next version of FHIR that US Core will be based on will be the upcoming FHIR Version R6" (January 2024) — skipping R5 entirely, "with no timeline for this update." Do **not** target R4B or R5 for a US hospital EMR. Use the R5 Subscription Backport IG if you need modern subscriptions on R4.

2. **A basic CRUD server is missing the entire "FHIR-ness" beyond resource storage:** search semantics (`_include`, `_revinclude`, chained, `_has`, modifiers, `_count`/paging with Bundle links), the mandatory `GET [base]/metadata` CapabilityStatement, profile/terminology validation, transaction/batch Bundles, `_history`/versioning, compartment operations (`Patient/$everything`), and conformance to US Core profiles. These are what distinguish a "FHIR server" from "JSON CRUD over clinical-looking documents."

3. **Security and compliance are the largest and highest-priority gap.** HIPAA technical safeguards require TLS 1.2+ in transit and (effectively mandatory "addressable") AES-256 encryption at rest, full audit logging, and access controls. You need a real OAuth2/SMART authorization server, JWT validation with scope enforcement (`patient/`, `user/`, `system/` scopes), RBAC/ABAC at the data layer, FHIR AuditEvent logging (ATNA/IHE-aligned), consent enforcement, break-glass patterns, and signed BAAs with every PHI-touching vendor.

4. **The Node.js ecosystem has a credible production-grade reference implementation — Medplum — that can either replace or benchmark your build.** It is genuinely Node.js/TypeScript (the stack your developer already knows), Apache-2.0, PostgreSQL-backed, and implements the bulk of the P0/P1 feature set out of the box.

## Details

### 1. FHIR Compliance & Standards (P0–P1)

**R4 vs R4B vs R5.** R4 (4.0.1, published Dec 27, 2018) is the regulatory and vendor standard. R4B (Dec 2022) backported SubscriptionTopic and some medication/evidence resources but is not what US regulation references. R5 (March 2023) introduced 20+ resources and a reworked topic-based subscription framework but has single-digit adoption and is not supported by Epic or Oracle Health in production. R6 is in ballot (started January 2026, publication expected 2027+). **Decision: target R4 4.0.1.**

**Mandatory vs optional operations.** At minimum a hospital-grade R4 server must support: instance read/vread/update/delete/create, type-level search and history, the `metadata` (CapabilityStatement) interaction, and ideally transaction/batch Bundles. The CapabilityStatement at `GET [base]/metadata` is *required by the spec* — Inferno's first test fetches it, and a server without one fails immediately. Optional-but-expected: `_history` at all levels, `Patient/$everything`, conditional create/update/delete, `$validate`, terminology operations (`$expand`, `$validate-code`, `$lookup`), and bulk `$export`.

**Profiles and Implementation Guides.** US Core is the floor for US interoperability. The current published version is **US Core v9.0.0 (STU9), which "Meets USCDI v6 Requirements" and is "Based on FHIR version: 4.0.1"** (package `hl7.fhir.us.core#9.0.0`, reviewed via the January 2025 HL7 ballot); v7.0.0/v8.0.1 are also in the regulatory landscape, and the original ONC baseline was v3.1.1. You must declare and conform to US Core profiles for Patient, Condition, Observation (vitals, labs, smoking status, pregnancy intent), MedicationRequest, AllergyIntolerance, Immunization, Procedure, DiagnosticReport, DocumentReference, CarePlan, Encounter, etc. International deployments may target IPS (International Patient Summary) and IPA (International Patient Access). Note granular-scope dependency: US Core v7+ requires SMART App Launch v2.0.0+.

**Validation.** Implement multi-layer validation: structure, cardinality, datatype/value domains, terminology bindings, invariants (FHIRPath), and profile conformance. [HL7 International](https://www.hl7.org/fhir/validation.html) The authoritative validator is the HL7 Java `validator_cli.jar`. In a Node.js stack you can wrap it: **`fhir-validator-wrapper`** (the official FHIR/Grahame-Grieve Node wrapper that auto-downloads the JAR and runs it as an HTTP service) or **`fhir-validator-js`** (Outburn-IL, Apache-2.0, wraps the Java validator with a JS API). Pure-JS validators (e.g., JSON-schema-based) can check structure/cardinality but cannot do full terminology or profile slicing. [Fhir](https://chat-archive.fhir.org/stream/179169-javascript/topic/Profile(structure.20definition).20validation.20in.20javascript.html) **Caution:** full validation (especially terminology) is computationally expensive; do not blindly validate every write in production — validate selectively and asynchronously where possible. [HL7 International](https://www.hl7.org/fhir/validation.html)

**Search.** Implement search-parameter extraction *at write time* into indexed columns/collections — this is the core of FHIR search performance. Support `_include`, `_revinclude` (with `:iterate`), chained (`Observation?subject.name=`), reverse-chained (`_has`), token/date/quantity/reference modifiers, `_sort`, `_count`, paging via Bundle `next`/`self`/`previous` links, and `_elements`/`_summary`. Order of operations: filter → sort → page → include. Watch out for wildcard/iterate `_include` that can traverse the whole graph — cap iteration depth and allow `too-costly` rejections.

**SMART on FHIR.** Implement SMART App Launch v2.x: the `.well-known/smart-configuration` discovery document, EHR launch and standalone launch (OAuth2 authorization code + PKCE), launch context (`launch/patient`), and SMART v2 granular scopes (`patient/Observation.rs`, `user/*.cruds`, `system/*.rs`). Implement SMART Backend Services (OAuth2 client-credentials with asymmetric JWT client auth) for bulk/automated access, and token introspection.

**Effort/priority:** CapabilityStatement + core search + US Core conformance is P0 and large (multi-month). `$everything`, `_history`, advanced search modifiers P1.

### 2. Security & Compliance (P0)

**HIPAA.** Encryption: TLS 1.2+ (1.3 preferred) with Perfect Forward Secrecy in transit (NIST SP 800-52); AES-256 at rest (NIST SP 800-111). Encryption is technically "addressable" under 45 CFR §164.312(a)(2)(iv) and (e)(2)(ii) but is effectively mandatory and provides breach-notification safe harbor when keys are secure. The **HHS OCR HIPAA Security Rule NPRM published December 27, 2024 would "Require encryption of ePHI at rest and in transit, with limited exceptions" and "Remove the distinction between 'required' and 'addressable' implementation specifications and make all implementation specifications required."** HHS estimates a ~$9.3 billion first-year cost; the final rule is targeted for May 2026 with a 240-day compliance window — so design for mandatory encryption now.

**AuthZ/AuthN.** Stand up an OAuth2 + OpenID Connect authorization server (or integrate one — Keycloak, Auth0/Okta with a healthcare config, or AWS Cognito). Validate JWTs (signature, `iss`, `aud`, `exp`), enforce SMART scopes at the API gateway *and* enforce row-level authorization at the data layer (scopes convey "full access relative to underlying permissions" — SMART itself does not model the underlying permission system, so you must). Layer RBAC (roles: physician, nurse, billing) and ABAC (attributes: care-team membership, location, consent, sensitivity labels).

**Audit logging.** Emit FHIR `AuditEvent` resources (based on IHE-ATNA, DICOM, ISO standards) for every PHI create/read/update/delete/search, ideally to a dedicated Audit Record Repository. Capture who/what/when/where/outcome. Known pitfalls (from Aidbox's documented experience): bulk `$import` and GraphQL queries can bypass per-resource audit unless explicitly handled; delete AuditEvents that store versioned entity references can break entity-based search.

**Other P0/P1 controls:** mTLS for server-to-server/B2B; secrets in a manager (HashiCorp Vault, AWS Secrets Manager) — never in env files committed to source; break-glass access with mandatory reason capture and heightened alerting (see IHE PCF "break-glass" Consent profiles); FHIR `Consent` resource enforcement; Master Patient Index / patient matching via `Patient/$match` (MPI-based logic) and IHE PIX/PDQ (or PIXm/PDQm REST equivalents); and hard multi-tenant isolation (separate schemas/databases or rigorously enforced tenant filters on every query).

### 3. Data Quality & Validation (P1)

**Terminology services.** You need ValueSet `$expand`, CodeSystem `$lookup`, and `$validate-code` against SNOMED CT, LOINC, RxNorm, ICD-10-CM, CPT, UCUM. Building these from scratch is impractical — stand up a dedicated terminology server: **HAPI FHIR's terminology module**, **Snowstorm** (SNOMED CT, Elasticsearch-backed, supports LOINC/ICD-10), **Ontoserver** (CSIRO, commercial), or hosted **tx.fhir.org**. Cache expansions aggressively (Redis).

**Licensing (important legal gap):** SNOMED CT, RxNorm and LOINC require a (free) UMLS Metathesaurus License from NLM; [National Library of Medicine](https://www.nlm.nih.gov/databases/umls.html) [National Library of Medicine](https://www.nlm.nih.gov/research/umls/index.html) SNOMED CT is free in the US and other SNOMED International member territories under the Affiliate license but may incur fees in non-member countries. [National Library of Medicine](https://www.nlm.nih.gov/healthit/snomedct/snomed_licensing.html) LOINC is free (Regenstrief license). Inferno's terminology validation itself requires loading UMLS files with a UMLS API key.

**Reference integrity & injection.** Validate that references resolve to allowed target types/resources; sanitize all inputs; use parameterized queries / the database driver's safe query builders to prevent NoSQL/SQL injection (a real risk when translating FHIR search params into Mongo/Postgres queries).

### 4. Performance & Scalability (P1)

- **Search-parameter indexing at write time** is the single most important performance pattern: extract searchable values into indexed tables/columns (the model HAPI's JPA server and Aidbox use). PostgreSQL with JSONB + GIN indexes (or dedicated search-param tables) is the mainstream choice; Elasticsearch is used by some (Kodjin, Snowstorm) for full-text/`_text`.
- **Caching** (Redis) for terminology expansions, CapabilityStatement, and hot search results.
- **Connection pooling**, **read replicas / CQRS** for read-heavy clinical workloads, and **horizontal scaling** behind a load balancer (note: Node.js is single-threaded per core — scale via process-per-core + multiple instances).
- **Pagination** via `_count` + opaque cursor/offset and Bundle links; avoid deep offset scans.
- **Bulk Data `$export`** (at System/`Group/[id]`/`Patient` levels) using the FHIR Asynchronous Request Pattern: kick-off returns `202` + `Content-Location`; client polls; completion returns an NDJSON manifest of file URLs (often pre-signed S3 URLs). This is required for population-level/analytics use and is part of (g)(10).

### 5. Infrastructure & DevOps (P0–P1)

- **Containerize** (Docker, minimal/distroless base images, non-root user, pinned dependencies, vulnerability scanning).
- **Kubernetes** with liveness/readiness/startup probes, resource requests/limits, horizontal pod autoscaling, and network policies; or managed equivalents (ECS/Fargate).
- **CI/CD** with automated tests, SAST/dependency scanning, image signing, and gated promotion. Healthcare adds change-control/validation documentation expectations (and CFR Part 11 if used in regulated trials).
- **Backup & DR for PHI:** encrypted automated backups, tested restores, defined RPO/RTO, point-in-time recovery, and geographically separated copies. This is both an availability and a HIPAA contingency-plan requirement.
- **HA/failover:** multi-AZ databases, no single points of failure, health-check-driven failover.
- **Secrets management** (Vault / AWS Secrets Manager / cloud KMS for encryption keys) and environment/config management.
- **Blue/green or canary deployments** to avoid downtime; database migrations must be backward-compatible.

### 6. Interoperability (P1–P2)

- **HL7 v2 → FHIR:** most hospital data still arrives as HL7v2 (ADT, ORM, ORU). Use the **HL7 v2-to-FHIR IG** as the mapping spec and tools like the **Microsoft FHIR-Converter** (Liquid templates; supports HL7v2, C-CDA, JSON→FHIR R4; 57 HL7v2 templates incl. ADT_A01/A08/A40, ORU_R01, ORM_O01, VXU_V04) or **LinuxForHealth hl7v2-fhir-converter** (HAPI-based). Caveat: automated conversion always needs substantial custom mapping/cleanup — it is "a starting point, not a polished utility."
- **C-CDA → FHIR** via the same converters (note HTI-5 proposed rule, Dec 2025, signals a move away from C-CDA toward FHIR-native exchange).
- **IHE profiles:** PIX/PDQ (and PIXm/PDQm) for patient identity cross-referencing against an EMPI; XDS/MHD for documents.
- **DICOM/imaging:** integrate via DICOMweb and FHIR ImagingStudy.
- **CDS Hooks:** implement the discovery endpoint (`{base}/cds-services`) and hooks (`patient-view`, `order-select`, `order-sign`) returning cards (info/suggestion/app-link) for real-time decision support; major EHRs support it.
- **Subscriptions/notifications:** R4 Subscription (search-criteria based) or the R5 Subscription Backport IG (SubscriptionTopic + SubscriptionStatus) with rest-hook (default), websocket, email, or messaging channels; implement handshake + heartbeat + event-notification and be aware delivery is best-effort (at-least/at-most-once concerns).
- **Epic/Cerner integration:** both expose FHIR R4; register apps via Epic App Orchard/Cerner code console, use SMART launch, request minimal scopes, handle refresh-token expiry and CORS (often via a backend proxy).

### 7. Observability & Monitoring (P1)

- **Structured application logging** (JSON) separate from FHIR AuditEvent (clinical access) logging; ship to a SIEM/log store (Elasticsearch/Loki/Datadog/CloudWatch).
- **Distributed tracing** with OpenTelemetry (vendor-neutral; export to Jaeger/Tempo/commercial backends) — Node.js auto-instrumentation is available.
- **Metrics** via Prometheus/Grafana: request rate, error rate, latency (RED metrics), DB CPU/connections, queue depth.
- **PHI-access anomaly alerting:** monitor AuditEvent streams for unusual access (e.g., a user reading many unrelated patients, VIP-record access, off-hours bulk reads); anomaly detection can be layered on the audit/metric stream.
- **SLAs:** clinical systems typically target high availability (commonly 99.9%+); define uptime monitoring, on-call, and incident response.

### 8. Clinical Data Management (P1)

- **Core EMR resources:** Patient, Encounter, Observation, Condition, Procedure, MedicationRequest/MedicationStatement/MedicationAdministration, DiagnosticReport, AllergyIntolerance, Immunization, CarePlan, CareTeam, DocumentReference, ServiceRequest, Coverage, Practitioner/PractitionerRole, Organization, Location. (US Core's MedicationRequest-centric "active medication list" model is the expected pattern.)
- **Versioning/history:** maintain full version history and expose `_history` (vread by version).
- **Soft vs hard delete:** prefer soft delete / logical deletion with retained history for clinical and medico-legal traceability; true hard delete is rare and must be auditable.
- **Provenance:** create `Provenance` resources to track the origin/authorship of clinical data (US Core has Basic Provenance guidance).

### 9. Testing & QA (P1–P2)

- **FHIR conformance testing:** **Inferno** (the ONC (g)(10) Standardized API Test Kit, Ruby/Docker, the official ONC test method) and **Touchstone** (Drummond's ATM). Inferno tests discovery/authorization, single-patient US Core, and bulk data flows; you can run it locally against your server.
- **Integration testing** with realistic/synthetic FHIR data (e.g., Synthea).
- **Performance/load testing** (k6, JMeter, Gatling) against search and write paths.
- **Penetration testing:** required by hospital security review and useful for SOC 2/HITRUST; the original ONC Secure API Challenge model (stand up the server, let pen testers attack it) is a good template.
- **ONC certification:** for US "Certified Health IT" you must pass (g)(10) via Inferno through an ONC-ACB; this is a formal, documented process.

### 10. Regulatory & Legal (P0 for the floor, P1–P2 for certifications)

- **ONC 21st Century Cures Act / HTI-1 / HTI-2:** drives R4 + US Core + USCDI + SMART + Bulk Data; information-blocking rules apply.
- **GDPR (EU):** if handling EU data — lawful basis, data-subject rights (access/erasure/portability), DPAs, data residency; health data is a special category requiring heightened protection.
- **HL7 licensing:** the FHIR spec itself is free (HL7 made it freely licensed); terminology content (SNOMED/LOINC/RxNorm) has its own licensing as noted.
- **BAAs:** legally required under HIPAA (45 CFR §164.504(e)) with every vendor that creates/receives/maintains/transmits PHI (cloud host, DB host, logging, analytics). A signed BAA is mandatory *regardless* of a vendor's certifications; sharing PHI without one is itself a violation. Verify that the specific services you use are HIPAA-eligible under the provider's BAA (e.g., AWS/Azure/GCP cover only listed services).
- **SOC 2 Type II:** not legally required but commonly demanded by hospital procurement; pairs with (not replaces) HIPAA/BAA. HITRUST is the healthcare-specific framework many hospitals prefer. Plan 6–12 months of evidence collection; automation platforms (Vanta, Secureframe, Drata) accelerate it.

### Build vs. Buy: the Medplum option

Rather than re-implement all of the above, strongly evaluate **Medplum** as either your platform or your reference benchmark. Per its documentation and the company's published materials:
- **License & stack:** Apache 2.0 ("Medplum's core technology is open source (Apache 2.0 license)…so there's never a risk of vendor lock-in"); full-stack TypeScript on Node.js, PostgreSQL datastore, Redis for caching/jobs, React frontend. The AWS self-host path uses ECS/Fargate, Aurora PostgreSQL, ElastiCache, S3, SES — "the same one we use for our own hosted service."
- **Features out of the box:** OAuth2/SMART App Launch authorization server; [Medplum](https://www.medplum.com/docs/api) US Core profiles; server-side profile validation with rejection of non-conformant resources plus a `$validate` operation; FHIR AuditEvent logging (DB or log-stream); Bulk Data `$export` (Patient and System levels confirmed working; an independent test found `Group/[id]/$export` returned 404 at test time); FHIR Subscriptions (webhooks + WebSockets, FHIRPath criteria, HMAC signatures); `_include`/`_revinclude` with `:iterate`; FHIR GraphQL incl. a Connection API; and `Patient/$everything` (also used as its EHI export) plus `Patient/$summary` (IPS).
- **Compliance posture (hosted environment):** Per Medplum's June 1, 2026 blog "Medplum Achieves HITRUST e1 Certification," "The HITRUST e1 Certification joins Medplum's existing compliance portfolio, including SOC 2 Type 2, HIPAA, and ONC certification." For ONC specifically, "Medplum has opted to leverage ONC's SVAP process for the certification criteria at 170.315(g)(10) to adopt the HL7 FHIR US Core Implementation Guide STU 5.0.1 in its Patient and Population API Services." ISO 27001 is listed as coming soon, and a BAA template is offered. **Important nuance:** these certifications attach to Medplum's *hosted* service; if you self-host, you inherit the software's capabilities but must achieve and maintain your own certification — "compliance is never out-of-the-box."
- **Deployment:** self-host (AWS CDK, Ubuntu APT repo, GCP/Azure Terraform, bare metal) or buy managed hosting (Growth/Scale/Enterprise tiers via AWS Marketplace). [Medplum](https://www.medplum.com/pricing) Medplum warns self-hosters they take on "24/7 on-call responsibility for outages."

**Alternatives if you're open beyond Node.js:** **HAPI FHIR** (Java/Spring, Apache 2.0) is the most conformance-complete OSS server (an independent test had it passing all checks incl. full bulk export) but means adopting Java. **Aidbox** (Health Samurai) is commercially licensed, PostgreSQL-backed, supports all FHIR versions through R6, and publishes strong performance numbers (e.g., thousands of resources/sec), but is proprietary and not Node-native. For a team whose skills are Express/TypeScript, **Medplum is the only fully-OSS, natively Node.js option** — making it the natural build-on or benchmark-against choice.

## Recommendations

**Stage 0 — Decision (do first, ~1–2 weeks):** Decide build-vs-buy. Unless you have a hard constraint forcing a bespoke datastore, adopt or fork **Medplum** (self-hosted to start) and redirect effort to your differentiating clinical workflows. If you must keep your own server, use Medplum/HAPI as a conformance reference and proceed below.

**Stage 1 — Legal & security floor (P0, weeks 1–8):** TLS 1.2+/AES-256; OAuth2 + SMART scopes with data-layer enforcement; FHIR AuditEvent logging; secrets manager; encrypted, restore-tested backups + DR plan; sign BAAs with every PHI vendor; confirm HIPAA-eligible cloud services. *Benchmark to advance:* you can authenticate a SMART app, every PHI access is audited, and PHI is encrypted end-to-end.

**Stage 2 — FHIR conformance (P0–P1, weeks 6–20, overlapping):** `GET /metadata` CapabilityStatement; US Core profiles for core resources; full search (`_include`/`_revinclude`/chained/`_has`/modifiers/paging); `_history`/versioning; `Patient/$everything`; profile + terminology validation (wrap `validator_cli.jar`; stand up Snowstorm/HAPI tx server; obtain UMLS license). *Benchmark:* pass Inferno's Single-Patient US Core and authorization test groups locally.

**Stage 3 — Scale & interoperability (P1, weeks 16–32):** write-time search indexing + Redis caching + read replicas/connection pooling; Bulk Data `$export`; FHIR Subscriptions (R5 backport); HL7v2 ingestion (Microsoft FHIR-Converter); CDS Hooks; Epic/Cerner SMART integration; OpenTelemetry + Prometheus/Grafana + PHI-access anomaly alerting. *Benchmark:* sustained target RPS under load test; bulk export of a population completes; HL7v2 ADT feed populates Patients/Encounters.

**Stage 4 — Certification & assurance (P1–P2, months 6–12+):** full Inferno (g)(10) run → ONC certification via an ONC-ACB; SOC 2 Type II (or HITRUST) with a compliance-automation platform; third-party penetration test; GDPR controls if serving the EU. *Benchmark:* clean Inferno (g)(10) report; SOC 2 Type II report issued; pen-test findings remediated.

**Thresholds that change the plan:** if you will never serve US certified-health-IT use cases, you can defer Stage 4 ONC work (but not HIPAA/BAA/SOC 2). If you serve only one tenant/hospital internally, multi-tenancy isolation drops in priority. If population analytics is core, pull Bulk Data `$export` forward into Stage 2. Given the Dec 2024 HIPAA Security Rule NPRM (final rule targeted May 2026) removing the "addressable" loophole, treat encryption-at-rest-and-in-transit as a hard P0 requirement, not optional.

## Roadmap & Priority Table

| # | Capability | Domain | Priority | Effort | Key tools (Node.js-friendly) |
|---|------------|--------|----------|--------|------------------------------|
| 1 | TLS 1.2+/1.3, AES-256 at rest | Security | **P0** | M | Cloud KMS, TDE, reverse proxy |
| 2 | OAuth2 + SMART App Launch v2 + Backend Services | Security/FHIR | **P0** | XL | Keycloak/Auth0/Cognito; Medplum auth |
| 3 | JWT validation + scope + RBAC/ABAC enforcement | Security | **P0** | L | jose, casbin |
| 4 | FHIR AuditEvent logging (ATNA) | Security/Obs. | **P0** | M | AuditEvent resource + SIEM |
| 5 | Encrypted backups + DR / HA | Infra | **P0** | M | Managed Postgres PITR, multi-AZ |
| 6 | BAAs + HIPAA-eligible services | Legal | **P0** | S | Vanta/Secureframe tracking |
| 7 | CapabilityStatement `/metadata` | FHIR | **P0** | S | server framework |
| 8 | US Core profiles (R4 4.0.1) | FHIR | **P0** | XL | US Core IG packages |
| 9 | Full search (_include/_revinclude/chained/_has/paging) | FHIR/Perf | **P0** | XL | write-time indexing |
| 10 | Resource & profile validation | Data Quality | **P1** | L | fhir-validator-wrapper / fhir-validator-js |
| 11 | Terminology services ($expand/$validate-code) | Data Quality | **P1** | L | Snowstorm, HAPI tx, Ontoserver + UMLS license |
| 12 | `_history` / versioning / Provenance / soft delete | Clinical | **P1** | M | DB versioning |
| 13 | `Patient/$everything` + compartments | FHIR/Clinical | **P1** | M | compartment defs |
| 14 | Search indexing + Redis cache + read replicas + pooling | Perf | **P1** | L | PostgreSQL JSONB/GIN, Redis |
| 15 | Bulk Data `$export` (async/NDJSON) | Perf/Interop | **P1** | L | async job + S3 + SMART Backend |
| 16 | Observability (OTel + Prometheus/Grafana) | Observability | **P1** | M | OpenTelemetry, Prom/Grafana |
| 17 | PHI-access anomaly alerting | Observability | **P1** | M | SIEM rules on AuditEvent |
| 18 | Containerization + K8s probes/limits + CI/CD | Infra/DevOps | **P1** | M | Docker, K8s/ECS, GitHub Actions |
| 19 | Secrets management | Infra | **P1** | S | Vault, AWS Secrets Manager |
| 20 | FHIR Subscriptions (R5 backport) | Interop | **P1** | L | rest-hook/websocket channels |
| 21 | HL7v2 → FHIR ingestion | Interop | **P1** | L | Microsoft FHIR-Converter, LinuxForHealth |
| 22 | Inferno (g)(10) conformance testing | Testing | **P1** | M | Inferno test kit (Docker) |
| 23 | Consent enforcement + break-glass | Security | **P1** | L | FHIR Consent, IHE PCF |
| 24 | MPI / `Patient/$match` / PIX-PDQ | Interop/Security | **P1** | L | EMPI, PIXm/PDQm |
| 25 | Multi-tenancy isolation | Security | **P1** | M | schema/DB separation |
| 26 | CDS Hooks | Interop | **P2** | M | cds-services endpoint |
| 27 | C-CDA conversion / DICOMweb / XDS-MHD | Interop | **P2** | L | converters, DICOMweb |
| 28 | Epic/Cerner SMART app integration | Interop | **P2** | M | App Orchard/code console |
| 29 | SOC 2 Type II / HITRUST | Legal | **P2** | XL | Vanta/Secureframe/Drata |
| 30 | ONC certification (via ONC-ACB) | Legal/Testing | **P2** | L | Inferno + ACB |
| 31 | Penetration testing | Testing | **P2** | M | third-party firm |
| 32 | GDPR controls (if EU) | Legal | **P2** | M | DPA, erasure workflows |

*Effort key: S = days, M = ~1–4 weeks, L = ~1–3 months, XL = 3+ months (often parallelizable across a team).*

## Caveats
- **Effort estimates are order-of-magnitude** and assume a small team; they vary widely with scope, existing infrastructure, and whether you adopt Medplum/HAPI (which collapses many P0/P1 items into configuration) versus build from scratch.
- **Medplum's certifications apply to its hosted environment**, not automatically to a self-hosted fork; self-hosting means you own your own compliance posture. The `Group/[id]/$export` 404 and the Express-framework detail are from a single independent test / unconfirmed source respectively — verify against the current codebase.
- **Regulatory specifics change.** US Core/USCDI release annually (current published: v9.0.0 / USCDI v6); HTI rules, the Dec 2024 HIPAA Security NPRM (final rule targeted May 2026), and the eventual R6 migration will shift requirements. Re-check current versions before locking scope.
- **This report is technical guidance, not legal advice.** HIPAA, GDPR, BAA, and certification decisions should be reviewed with qualified counsel and a security/compliance professional.
- Where this report cites adoption percentages, vendor support, or future plans (e.g., US Core moving to R6, R6 publication in 2027+), those reflect published statements and ballots as of mid-2026 and include forward-looking elements that may not materialize on the stated timeline.