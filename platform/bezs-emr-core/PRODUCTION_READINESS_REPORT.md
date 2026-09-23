# Production Readiness Reassessment

Date: 2026-05-14
Project: FHIR Server (`FastAPI` + `PostgreSQL` + `Redis`)
Scope: Repository-only reassessment after recent project updates.

Note: JWT/token-depth review is intentionally excluded per request. Unused DB models are also intentionally ignored.

## Executive Summary

The project has improved materially since the last review, but it is still **not production ready for healthcare use**.

The biggest improvements are real:

- startup no longer creates tables directly
- Alembic migration scaffolding now exists
- a readiness endpoint was added
- Docker packaging is much better: multi-stage build, non-root runtime, healthcheck
- appointment reference parsing is now strict
- vitals validation is stronger, and `recorded_at` is no longer patchable

The biggest remaining blockers are:

1. **Object-level authorization is still unsafe, and in some places is now weaker than before.**
2. **Protected resources still trust caller-supplied `user_id` and `org_id`.**
3. **List/query paths still allow broad tenant/user filtering from request parameters.**
4. **There is still no executable automated test suite or CI gate.**
5. **Operational hardening is incomplete for a PHI system.**

## Current Verdict

- Overall: **Fail**
- Access control / PHI segregation: **Fail**
- Data integrity: **Partial**
- Operational readiness: **Partial**
- Release confidence: **Fail**

## What Improved

These earlier findings should be considered substantially improved or closed:

### 1. Database lifecycle is improved

Evidence:

- [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:36) no longer creates tables on startup.
- [app/core/database.py](/E:/work/code/fhir/fhir-server/app/core/database.py:14) no longer exposes the earlier `create_all`/`reset` pattern.
- [justfile](/E:/work/code/fhir/fhir-server/justfile:9) now contains real Alembic commands.
- `migrations/` now exists with an environment file and an initial migration.

Assessment:

- This is a meaningful production-readiness improvement.
- What is still missing is proof that migrations are tested and part of CI/CD, but the earlier “no migration path” finding should be downgraded.

### 2. Health/readiness handling improved

Evidence:

- [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:125) exposes `/health` as a liveness probe.
- [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:141) exposes `/health/ready` as a readiness probe.
- [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:158) checks the database.
- [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:168) checks Redis.

Assessment:

- This closes the earlier “liveness only” finding.
- The implementation is directionally correct.

### 3. Container hardening improved

Evidence:

- [Dockerfile](/E:/work/code/fhir/fhir-server/Dockerfile:2) uses a multi-stage build.
- [Dockerfile](/E:/work/code/fhir/fhir-server/Dockerfile:17) creates a non-root runtime user.
- [Dockerfile](/E:/work/code/fhir/fhir-server/Dockerfile:41) adds a container healthcheck.
- [docker-compose.yml](/E:/work/code/fhir/fhir-server/docker-compose.yml:13) now waits on healthy dependencies.

Assessment:

- This is a solid improvement over the prior image/runtime posture.
- It is still not enough for regulated production by itself, but the previous finding should be narrowed.

### 4. Appointment reference validation improved

Evidence:

- [app/repository/appointment_repository.py](/E:/work/code/fhir/fhir-server/app/repository/appointment_repository.py:20) now imports the shared strict parser.
- [app/repository/appointment_repository.py](/E:/work/code/fhir/fhir-server/app/repository/appointment_repository.py:131) uses `parse_reference(...)` for appointment subject.
- [app/repository/appointment_repository.py](/E:/work/code/fhir/fhir-server/app/repository/appointment_repository.py:194) uses `parse_reference(...)` for participant actors.
- [app/repository/appointment_repository.py](/E:/work/code/fhir/fhir-server/app/repository/appointment_repository.py:143) now rejects unknown encounter references with `422`.

Assessment:

- This closes two earlier integrity findings: silent malformed reference acceptance and silent `encounter_id` degradation.

### 5. Subject resolution is now tenant-aware

Evidence:

- [app/core/references.py](/E:/work/code/fhir/fhir-server/app/core/references.py:53) still accepts `user_id` and `org_id`.
- [app/core/references.py](/E:/work/code/fhir/fhir-server/app/core/references.py:72) now calls `patient_service.get_patient_in_org(...)`.

Assessment:

- This is a real fix for the earlier cross-tenant subject-resolution concern.

### 6. Vitals domain validation improved

Evidence:

- [app/schemas/vitals.py](/E:/work/code/fhir/fhir-server/app/schemas/vitals.py:68) onward now applies ranges to many numeric fields.
- [app/schemas/vitals.py](/E:/work/code/fhir/fhir-server/app/schemas/vitals.py:162) makes `recorded_at` non-patchable.

Assessment:

- The vitals schema is materially safer than before.
- This finding should be downgraded from a major blocker to a narrower validation/completeness concern.

## Remaining Critical Findings

### 1. “Authorized” dependencies no longer authorize anything

This is the most serious remaining problem, and it is worse than the previous implementation.

Evidence:

- [app/auth/patient_deps.py](/E:/work/code/fhir/fhir-server/app/auth/patient_deps.py:7) now only loads the patient by ID and returns it.
- [app/auth/appointment_deps.py](/E:/work/code/fhir/fhir-server/app/auth/appointment_deps.py:8) does the same for appointments.
- [app/auth/encounter_deps.py](/E:/work/code/fhir/fhir-server/app/auth/encounter_deps.py:8) does the same for encounters.
- [app/auth/practitioner_deps.py](/E:/work/code/fhir/fhir-server/app/auth/practitioner_deps.py:7) does the same for practitioners.
- [app/auth/questionnaire_response_deps.py](/E:/work/code/fhir/fhir-server/app/auth/questionnaire_response_deps.py:12) does the same for questionnaire responses.
- [app/auth/vitals_deps.py](/E:/work/code/fhir/fhir-server/app/auth/vitals_deps.py:8) does the same for vitals.

Why this matters:

- Any caller with route-level permission can fetch, patch, or delete any record by public ID unless a deeper layer blocks it.
- The route descriptions still claim organization-scoped access, but the dependency now enforces only existence.

Required fix:

- Reintroduce object-level authorization.
- At minimum, enforce `sub` and `activeOrganizationId` checks in the dependency or in a shared authorization service.
- If some routes are intentionally admin/global, those paths should be explicit and separate.

### 2. Protected resources still accept caller-controlled `user_id` and `org_id`

This issue is still open across create and list paths.

Evidence:

- [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:67) still instructs callers to supply `user_id` and `org_id`.
- [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:81) still passes `payload.user_id` and `payload.org_id`.
- [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:216) and [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:217) still expose `user_id` and `org_id` query filters.
- [app/routers/vitals.py](/E:/work/code/fhir/fhir-server/app/routers/vitals.py:106) still documents caller-supplied binding.
- [app/routers/vitals.py](/E:/work/code/fhir/fhir-server/app/routers/vitals.py:119) still passes `payload.user_id` and `payload.org_id`.
- The same pattern still exists in appointments, encounters, practitioners, and questionnaire responses.

Why this matters:

- Ownership is still partly defined by untrusted client input.
- In a healthcare API, identity and tenancy must come from the auth context, not the request body.

Required fix:

- Remove `user_id` and `org_id` from create payloads for protected resources.
- Derive ownership from JWT context in the router/service layer.
- If admin impersonation is required, implement an explicit privileged pathway with separate policy and audit logging.

### 3. Broad list filtering still creates a tenant exposure surface

Evidence:

- [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:203) documents filtering by `user_id` and `org_id`.
- [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:216) and [app/routers/patient.py](/E:/work/code/fhir/fhir-server/app/routers/patient.py:217) still accept them.
- [app/routers/vitals.py](/E:/work/code/fhir/fhir-server/app/routers/vitals.py:223) documents filtering by `user_id`, `patient_id`, and `org_id`.
- [app/routers/vitals.py](/E:/work/code/fhir/fhir-server/app/routers/vitals.py:232) and [app/routers/vitals.py](/E:/work/code/fhir/fhir-server/app/routers/vitals.py:234) still accept them directly.

Why this matters:

- Even if coarse RBAC is intentional, this is still too open for healthcare unless the role model is very tightly controlled and audited.
- It is safer to default list endpoints to the caller’s tenant and expose broader search only to explicit admin/support roles.

Required fix:

- Split “self/tenant-scoped” and “administrative/global” query surfaces.
- Make the tenant-safe path the default.

## High-Priority Remaining Findings

### 4. There is still no executable automated test suite

Evidence:

- `tests/` still appears to contain sample payloads and [tests/api.http](/E:/work/code/fhir/fhir-server/tests/api.http:1), not runnable test modules.
- [pyproject.toml](/E:/work/code/fhir/fhir-server/pyproject.toml:8) still contains runtime dependencies only; there is no visible `pytest` or equivalent test stack.

Impact:

- No evidence-backed protection against auth regressions, migration breakage, serialization bugs, or PHI boundary failures.

Required fix:

- Add automated API, repository, migration, and authorization tests.
- Add CI to block merges on failures.

### 5. Rate limiting still fails open when Redis is unavailable

This issue still matters even though readiness is better.

Evidence:

- `app.main` now marks Redis unavailable in app state when connection fails.
- `RateLimitMiddleware` is still present in [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:110).
- The earlier logic pattern of skipping protection when Redis is absent still appears to be the intended operational model.

Impact:

- Protective controls degrade during a dependency incident.

Required fix:

- Decide whether sensitive routes should fail closed, use a fallback limiter, or explicitly degrade with alerting.

### 6. Compose/runtime posture is still not healthcare-grade

The deployment posture is better, but still not production-grade for PHI.

Evidence:

- [docker-compose.yml](/E:/work/code/fhir/fhir-server/docker-compose.yml:31) now externalizes Postgres credentials, which is good.
- [docker-compose.yml](/E:/work/code/fhir/fhir-server/docker-compose.yml:51) still runs Redis without visible auth or TLS.
- [Dockerfile](/E:/work/code/fhir/fhir-server/Dockerfile:5) copies `uv` from `ghcr.io/astral-sh/uv:latest`, which is still an unpinned moving dependency.

Impact:

- Better than before, but still not a high-assurance production posture.

Required fix:

- Pin base/runtime dependency sources.
- Add a production deployment story for secret management, network isolation, TLS, and authenticated Redis/Postgres connections.

### 7. Observability and auditability are still incomplete

Evidence:

- Basic structured logging exists.
- [app/main.py](/E:/work/code/fhir/fhir-server/app/main.py:195) still contains placeholder commentary about metrics/traces rather than implementation.

Impact:

- Hard to support healthcare audit, incident response, and anomaly detection requirements.

Required fix:

- Add metrics, tracing, explicit audit events, and operational alerting.

## Medium-Priority Remaining Findings

### 8. Vitals validation is better, but still not clinically complete

What improved:

- Numeric range checks are now present for many fields.

What remains:

- No visible cross-field validation for impossible combinations.
- No visible strict format validation for `bed_time` / `wake_up_time`.
- No visible consistency rules such as stage totals or date/time alignment.

Required fix:

- Add cross-field validators and domain consistency checks.

### 9. Contract drift still exists

Evidence:

- AGENTS says vitals IDs start at `60000`, but [app/models/vitals/vitals.py](/E:/work/code/fhir/fhir-server/app/models/vitals/vitals.py:6) still starts at `70000`.
- Several route descriptions still claim organization-scoped authorization, but current auth dependencies do not enforce it.

Impact:

- Internal docs and actual runtime behavior are still out of sync.

Required fix:

- Reconcile AGENTS, route descriptions, and real enforcement logic.

## Recommended Next Actions

### Immediate

1. Restore real object-level authorization in every `get_authorized_*` dependency or centralize it in a shared authorization layer.
2. Remove caller control over `user_id` and `org_id` for protected resources.
3. Lock list endpoints to tenant-safe defaults.
4. Add auth regression tests before any more security-adjacent refactors.

### Near-term

1. Add `pytest`-based automated tests and CI.
2. Add migration tests for fresh database and upgrade path.
3. Harden Redis/Postgres connection security and runtime secret handling.
4. Add metrics, traces, and audit logging.

## Final Assessment

The project is in a better place than it was in the previous review. The migration story, readiness checks, Docker packaging, appointment reference validation, subject scoping, and vitals validation all improved in meaningful ways.

The remaining blocker is still the trust boundary around data access. Right now the code still allows caller influence over ownership fields, and the resource “authorized” dependencies currently do not authorize ownership or tenancy at all. Until that is corrected and covered by automated tests, this should not be treated as production-ready for healthcare data.
