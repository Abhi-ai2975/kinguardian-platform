# KinGuardian backend architecture

## Bounded contexts

| Context | KinGuardian owns | Integrates through |
|---|---|---|
| Identity projection | local profile reference only | IAM JWT/JWKS; it never owns credentials or sessions |
| Family access | families, memberships, parent/caregiver roles, subject-scoped grants and consents | API only |
| Care coordination | tasks, wellbeing check-ins, communication metadata | versioned KinGuardian API/events |
| Clinical record | external patient reference only | FHIR service API; KinGuardian does not write FHIR tables |
| Documents | FileNest object identifier only | FileNest API/SDK |
| AI assistance | authorization context and future task requests | agent API; no broad database/tool credentials |
| Observability | audit/event envelopes | observability ingestion API |

## Authorization model

Authentication maps an IAM subject to a local profile. Authorization is evaluated server-side on every family/subject route:

1. active family membership is required;
2. coordinators may administer family and grants;
3. parents may access their linked subject;
4. other members require an active, unexpired subject grant containing the requested scope;
5. write actions require an eligible role and scope.

The API never trusts a family or subject identifier solely because a client supplied it.

## Reliability and auditability

State changes write both an audit record and a versioned outbox event in the same database transaction. A worker claims pending events and hands them to a replaceable publisher. This permits at-least-once delivery; consumers must deduplicate with the event ID/idempotency key.

Timestamps are stored as timezone-aware UTC values. Input for schedules and check-ins requires an offset, while IANA timezone names record how an experience should render local time.

## Production operations

- Run `alembic upgrade head` as a controlled deployment step before API/worker rollout.
- Use PostgreSQL in production; SQLite is only for local verification.
- Use a least-privilege API database role and a distinct migration role.
- Validate RS256 bearer tokens against configured issuer, audience, and JWKS; development headers are rejected outside development.
- Send outbox events to a durable broker through a dedicated publisher adapter; never publish inside the request transaction.
- Encrypt transport and storage, redact audit metadata, retain audit logs per policy, and emit operational telemetry through the observability service.
