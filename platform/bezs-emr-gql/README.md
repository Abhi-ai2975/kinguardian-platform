# fhir-gql

A FastAPI middleware/orchestration service that sits between client applications and [`fhir-server`](../fhir-server). It owns authentication, RBAC, rate limiting, and use-case orchestration — it never talks to a database directly, and proxies all persistence through the `fhir-server` REST API.

> Despite the project name, this is currently a **REST** API (JSON over HTTP), not GraphQL. See [`ARCHITECTURE.md`](ARCHITECTURE.md) for why and what's planned.

---

## Role in the Stack

```
Client Applications (Web / Mobile / AI Agent)
              │  HTTPS — REST, JWT Bearer
              ▼
         fhir-gql   (this service — auth, RBAC, rate limiting, orchestration)
              │  HTTP — plain JSON, no auth
              ▼
        fhir-server  (pure FHIR R4 data layer)
              │
       PostgreSQL + Redis
```

This service never writes to a database directly — all persistence flows through `fhir-server`'s REST API via a typed `httpx`-based `FhirClient`.

---

## Features

- **JWT authentication** — JWKS-validated bearer tokens, applied globally to `/api/v1`
- **Rate limiting** — Redis-backed sliding window (per-user via JWT `sub`, per-IP for unauthenticated requests), with an in-process fallback if Redis is unreachable
- **Per-resource DI container** — `dependency-injector` wires a service + typed FHIR client per resource
- **Proxies 17 FHIR resource types** — organizations, locations, healthcare services, schedules, slots, practitioners, practitioner roles, patients, appointments, encounters, service requests, medication requests, observations, conditions, diagnostic reports, document references — plus terminology lookups
- **OpenAPI with Bearer auth** — Swagger UI "Authorize" button wired via a custom `app.openapi()` override
- **Health probe** — `GET /health` (liveness, no auth)

---

## Tech Stack

| Concern | Library |
|---|---|
| Web framework | FastAPI + Uvicorn |
| DI container | dependency-injector |
| Auth | PyJWT + PyJWKClient (JWKS) |
| Rate limiting | Redis 7 (sliding window) |
| HTTP client to fhir-server | httpx (via `FhirClient`) |
| Config | pydantic-settings (.env) |
| Package manager | uv |
| Python | 3.14+ |

---

## API Endpoints

All routes are mounted under `/api/v1` and require a valid JWT (except `/health`).

| Resource group | Prefix |
|---|---|
| Organization | `/organizations` |
| Location | `/locations` |
| HealthcareService | `/healthcare-services` |
| Schedule | `/schedules` |
| Slot | `/slots` |
| Practitioner | `/practitioners` |
| PractitionerRole | `/practitioner-roles` |
| Patient | `/patients` |
| Appointment | `/appointments` |
| Encounter | `/encounters` |
| ServiceRequest | `/service-requests` |
| MedicationRequest | `/medication-requests` |
| Observation | `/observations` |
| Condition | `/conditions` |
| DiagnosticReport | `/diagnostic-reports` |
| DocumentReference | `/document-references` |
| Terminology | `/terminology` |

Full interactive documentation is available at `/docs` when the server is running.

---

## Architecture

See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the auth flow, rate-limiting algorithm, and DI container layout.

---

## Prerequisites

- Python 3.14+
- [uv](https://github.com/astral-sh/uv) package manager
- Redis 7
- A running [`fhir-server`](../fhir-server) instance (this service proxies all reads/writes to it)
- An OIDC/JWT identity provider exposing a JWKS endpoint (e.g. Keycloak, Auth0, BetterAuth)

---

## Local Setup

### 1. Install dependencies

```bash
pip install uv
uv sync
```

### 2. Start dependencies

Start `fhir-server` first (see its own [README](../fhir-server/README.md)/[CONTRIBUTING](../fhir-server/CONTRIBUTING.md)) — this service has nothing to talk to without it. Redis can be shared with `fhir-server`'s dev stack:

```bash
docker compose -f ../fhir-server/docker-compose.dev.yml up -d
```

### 3. Configure environment

```bash
cp .env.example .env
```

Edit `.env` — point `FHIR_SERVER_URL` / `TERMINOLOGY_SERVER_URL` at your local `fhir-server` instance, `REDIS_URL` at your Redis instance, and `IAM_ISSUER` / `IAM_JWKS_URL` at your identity provider (see [Environment Variables](#environment-variables)).

### 4. Start the dev server

```bash
just dev
# or
uv run uvicorn app.main:app --port 8005 --reload
```

The API is available at `http://localhost:8005`, with interactive docs at `http://localhost:8005/docs`.

---

## Docker Setup

```bash
docker compose up
```

This pulls the pre-built image and joins the external network created by `fhir-server`'s compose stack (`fhir-server_fhir-net`), so `fhir-server` must already be running via `docker compose up` in that directory first.

**Redis:** by default this stack has no Redis service of its own — it reuses `fhir-server`'s Redis container over the shared network, since both services already sit side by side in most deployments. If you're running `fhir-gql` somewhere `fhir-server`'s network isn't reachable (a separate host, a different orchestrator, etc.), start a standalone Redis instead:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Then point `REDIS_URL` in `.env` at it (`redis://localhost:6379/0`) and drop the `networks:` block in `docker-compose.yml` — the rate limiter only needs a reachable Redis, not specifically `fhir-server`'s.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FHIR_SERVER_URL` | Yes | Base URL of the downstream `fhir-server` FHIR API, e.g. `http://localhost:8000/api/fhir/v1` |
| `TERMINOLOGY_SERVER_URL` | Yes | Base URL of the terminology endpoints, e.g. `http://localhost:8000/api/v1/terminology` |
| `IAM_JWKS_URL` | Yes | JWKS endpoint for JWT signature verification |
| `IAM_ISSUER` | Yes | Expected JWT `iss` (and `aud`) claim |
| `REDIS_URL` | Yes | Redis connection URL used by the rate limiter |
| `RATE_LIMIT_READ` | No | Max GET/HEAD requests per client per window (default `100`) |
| `RATE_LIMIT_WRITE` | No | Max POST/PATCH/DELETE requests per client per window (default `20`) |
| `RATE_LIMIT_WINDOW` | No | Rate limit window in seconds (default `60`) |
| `ENVIRONMENT` | No | `development` (default) or `production` |

---

## Health Probe

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | None | Liveness — returns `200` if the process is running |

---

## Contributing

Contributions are welcome! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for local setup and PR guidelines. This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

To report a security vulnerability, see [`SECURITY.md`](SECURITY.md) — please don't open a public issue for security reports.
