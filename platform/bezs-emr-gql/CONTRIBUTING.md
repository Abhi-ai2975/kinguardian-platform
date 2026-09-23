# Contributing to fhir-gql

Thanks for your interest in contributing! This document covers how to get a local environment running and how to submit changes.

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/fhir.git
cd fhir-gql
```

If you're working from within this monorepo directly, just `cd fhir-gql`.

### 2. Install prerequisites

- Python 3.14+
- [uv](https://github.com/astral-sh/uv) package manager
- Redis 7
- A running [`fhir-server`](../fhir-server) instance — this service has nothing to talk to without it. See [`../fhir-server/CONTRIBUTING.md`](../fhir-server/CONTRIBUTING.md) to get it running locally.
- An OIDC/JWT identity provider exposing a JWKS endpoint (e.g. Keycloak, Auth0, BetterAuth) — every route here is JWT-protected

```bash
pip install uv
uv sync
```

### 3. Start Redis

If `fhir-server` is already running via its dev compose file, the simplest path is to reuse that same Redis instance instead of standing up a second one:

```bash
docker compose -f ../fhir-server/docker-compose.dev.yml up -d
```

You don't have to share it, though — the rate limiter just needs any reachable Redis 7 instance. If you'd rather run a standalone one scoped to this repo:

```bash
docker compose -f docker-compose.dev.yml up -d
```

Either way, just point `REDIS_URL` at whichever instance you started in the next step.

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

- `FHIR_SERVER_URL` / `TERMINOLOGY_SERVER_URL` — point at your local `fhir-server` instance (e.g. `http://localhost:8000/api/fhir/v1` and `http://localhost:8000/api/v1/terminology`)
- `REDIS_URL` — point at your Redis instance (e.g. `redis://localhost:6379/0`)
- `IAM_ISSUER` / `IAM_JWKS_URL` — your identity provider's issuer URL and JWKS endpoint

### 5. Start the dev server

```bash
just dev
# or
uv run uvicorn app.main:app --port 8005 --reload
```

The API is now available at `http://localhost:8005`, with interactive docs at `http://localhost:8005/docs`.

---

## Running Tests

There is no automated test suite in this repo yet. Contributions that add `pytest` coverage (mirroring `fhir-server`'s setup) are very welcome. Until then, verify changes manually via `/docs` (Swagger UI's "Authorize" button accepts a JWT for testing protected routes).

---

## Project Conventions

- **Never write directly to a database** — all persistence must flow through `fhir-server`'s REST API via a `FhirClient`. If you find yourself wanting a local model/table, that logic likely belongs in `fhir-server` instead.
- **Comment non-obvious code** — this codebase favors explaining *why* a piece of logic exists, not just what it does, especially in `middleware/`, `auth/`, and `di/` where the reasoning isn't always visible from the code alone.
- **DI wiring** — every service + client pair gets its own container in `app/di/modules/`, registered in `app/di/container.py`, following the pattern of an existing resource (e.g. `organization` or `location`).
- See [`ARCHITECTURE.md`](ARCHITECTURE.md) for the auth flow, rate-limiting algorithm, and DI container layout before making non-trivial changes.

> Note: `dev-docs/` is gitignored and won't appear in a fresh clone — it holds internal, in-progress design notes and isn't required to work in this repo.

---

## Submitting a Pull Request

1. Create a branch off `main`: `git checkout -b feat/short-description`
2. Make your changes, following the conventions above
3. Verify manually against a running `fhir-server` + IAM provider
4. Open a PR against `main` with a clear description of *why* the change is needed, not just what it does
5. Link any related issue

Small, focused PRs are easier to review than large ones.

---

## Reporting Bugs / Requesting Features

Open a GitHub issue. For bugs, include steps to reproduce, expected vs. actual behavior, and relevant logs. For features, describe the use case, not just the desired implementation.

## Reporting Security Issues

Do **not** open a public issue for security vulnerabilities — see [SECURITY.md](SECURITY.md) for the responsible disclosure process.
