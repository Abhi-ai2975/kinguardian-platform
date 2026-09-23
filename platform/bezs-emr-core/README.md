# FHIR Server

A production-ready **FHIR R4**-compliant REST API built with FastAPI and PostgreSQL. Every endpoint supports dual-format responses — full FHIR R4 JSON (`application/fhir+json`) and simplified snake_case JSON (`application/json`) — selected via the `Accept` header.

Designed to serve as the backend for healthcare applications and as a tool source for AI agents via FastMCP dynamic tool generation.

---

## Features

- **FHIR R4 compliant** — resources validated against the HL7 FHIR R4 specification
- **Dual-format responses** — FHIR R4 camelCase bundles or plain snake_case JSON, per `Accept` header
- **JWT authentication** — JWKS-validated tokens with per-resource permission scopes
- **Multi-tenancy** — every row scoped to `user_id` + `org_id` from JWT claims
- **Async throughout** — SQLAlchemy 2.0 async ORM with asyncpg, fully non-blocking
- **Rate limiting** — request-level middleware backed by Redis
- **Server-side sessions** — Redis 7 session store
- **Health & readiness probes** — `/health` (liveness) and `/health/ready` (DB + Redis checks)
- **OpenAPI / Swagger UI** — auto-generated, consumed by FastMCP as an AI tool contract

---

## Tech Stack

| Concern | Library / Version |
|---|---|
| Web framework | FastAPI + Uvicorn |
| Database | PostgreSQL 15 (async via asyncpg) |
| ORM | SQLAlchemy 2.0+ (async declarative) |
| Migrations | Alembic |
| Auth | PyJWT + PyJWKClient (JWKS) |
| Sessions / Rate limiting | Redis 7 |
| DI container | dependency-injector |
| Config | pydantic-settings |
| Package manager | uv |
| Python | 3.12+ |

---

## API Endpoints

All FHIR resource endpoints are mounted under `/api/fhir/v1` and require a valid JWT.

| Resource | Prefix | Description |
|---|---|---|
| Patient | `/patients` | Individuals receiving care |
| Practitioner | `/practitioners` | Healthcare providers |
| Encounter | `/encounters` | Clinical interactions (visits, admissions) |
| Appointment | `/appointments` | Scheduled healthcare events |
| QuestionnaireResponse | `/questionnaire-responses` | Structured answers to questionnaires |
| Vitals | `/api/v1/vitals` | Wearable device metrics (non-FHIR) |

Each resource supports: `POST /`, `GET /`, `GET /me`, `GET /{id}`, `PATCH /{id}`, `DELETE /{id}`.

Full interactive documentation is available at `/docs` when the server is running.

---

## Project Structure

```
app/
├── core/           # Config, database engine, Redis, logging, content negotiation
├── auth/           # JWT validation, permission guards, per-resource auth deps
├── di/             # Dependency injection — container, modules, dependencies
├── models/         # SQLAlchemy ORM models — one package per resource
├── schemas/        # Pydantic input/output schemas (create, patch, FHIR, plain)
├── fhir/mappers/   # to_fhir_*() and to_plain_*() mapper functions
├── repository/     # All database I/O — CRUD, filters, eager loading
├── services/       # Thin orchestration layer between routers and repositories
├── routers/        # FastAPI route definitions
├── middleware/     # Rate limiting, request context
└── errors/         # ApplicationError hierarchy, FHIR OperationOutcome handlers

migrations/         # Alembic migration versions
```

---

## Prerequisites

- Python 3.12+
- PostgreSQL 15
- Redis 7
- [uv](https://github.com/astral-sh/uv) package manager

---

## Local Setup (Without Docker)

### 1. Install uv

```bash
pip install uv
```

### 2. Install dependencies

```bash
uv sync
```

### 3. Start Postgres + Redis

If you don't already have PostgreSQL and Redis running locally, bring up just the datastores in Docker:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This exposes Postgres on `localhost:5432` and Redis on `localhost:6379`.

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env` with your values (see [Environment Variables](#environment-variables)).

### 5. Run database migrations

```bash
uv run alembic upgrade head
```

### 6. Start the development server

```bash
uv run fastapi dev app/main.py
```

The API is available at `http://localhost:8000`.
Interactive docs: `http://localhost:8000/docs`.

---

## Docker Setup

The Docker Compose stack includes the API server, PostgreSQL 15, and Redis 7. The API image is pulled from the container registry — no local build required.

### Start all services

```bash
docker compose up
```

### Start in background

```bash
docker compose up -d
```

### Stop and remove containers

```bash
docker compose down
```

> The `.env` file is **not** baked into the image. Docker injects variables at runtime via `env_file`, keeping secrets out of the image layer.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `FHIR_DATABASE_URL` | Yes | Async PostgreSQL URL — `postgresql+asyncpg://user:pass@host/db` |
| `REDIS_URL` | Yes | Redis connection URL — `redis://localhost:6379` |
| `IAM_ISSUER` | Yes | JWT issuer URL for token validation |
| `IAM_JWKS_URL` | Yes | JWKS endpoint for public key discovery |
| `ENVIRONMENT` | No | `development` (default) or `production` |
| `POSTGRES_USER` | Docker only | PostgreSQL username for the `db` service |
| `POSTGRES_PASSWORD` | Docker only | PostgreSQL password for the `db` service |
| `POSTGRES_DB` | Docker only | Database name for the `db` service |

---

## Database Migrations

Migrations are managed with Alembic.

```bash
# Apply all pending migrations
uv run alembic upgrade head

# Roll back one migration
uv run alembic downgrade -1

# Generate a new migration from model changes
uv run alembic revision --autogenerate -m "description"

# Show current migration state
uv run alembic current
```

> **Note:** Alembic autogenerate does not correctly handle PostgreSQL enum types. Always review and manually fix generated migration files before applying — see `CLAUDE.md` for the correction checklist.

---

## Response Formats

Send the `Accept` header to choose the response format.

**FHIR R4 Bundle** (`Accept: application/fhir+json`):
```json
{
  "resourceType": "Bundle",
  "type": "searchset",
  "total": 42,
  "entry": [{ "resource": { "resourceType": "Patient", "id": "10001", ... } }]
}
```

**Plain JSON** (`Accept: application/json` or omitted):
```json
{
  "total": 42,
  "limit": 50,
  "offset": 0,
  "data": [{ "id": 10001, "family_name": "Smith", ... }]
}
```

Pagination query parameters: `limit` (1–200, default 50), `offset` (default 0).

---

## Health Probes

| Endpoint | Auth | Description |
|---|---|---|
| `GET /health` | None | Liveness — returns `200` if the process is running |
| `GET /health/ready` | None | Readiness — returns `200` if PostgreSQL and Redis are reachable, `503` otherwise |

---

## Production Deployment (VPS)

### 1. Install Docker

```bash
sudo apt update && sudo apt install docker.io docker-compose-plugin -y
```

### 2. Clone the repository

```bash
git clone <your-repo-url>
cd fhir-server
```

### 3. Configure environment

```bash
cp .env.example .env
# edit .env with production values
```

### 4. Start in background

```bash
docker compose up -d
```

The API will be available at `http://your-vps-ip:8000`.

---

## Dependency Management

```bash
# Add a package
uv add <package>

# Remove a package
uv remove <package>

# Sync dependencies from lockfile
uv sync
```

---

## Contributing

Contributions are welcome! See [`CONTRIBUTING.md`](CONTRIBUTING.md) for how to set up a local environment, run tests, and submit a pull request. This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).

For a deeper look at how the system is structured, see [`ARCHITECTURE.md`](ARCHITECTURE.md).

To report a security vulnerability, see [`SECURITY.md`](SECURITY.md) — please don't open a public issue for security reports.
