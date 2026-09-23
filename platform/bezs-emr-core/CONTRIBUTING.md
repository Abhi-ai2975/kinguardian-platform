# Contributing to FHIR Server

Thanks for your interest in contributing! This document covers how to get a local environment running and how to submit changes.

By participating in this project you agree to abide by the [Code of Conduct](CODE_OF_CONDUCT.md).

---

## Getting Started

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/fhir-server.git
cd fhir-server
```

If you're working from within this monorepo directly, just `cd fhir-server`.

### 2. Install prerequisites

- Python 3.12+
- [uv](https://github.com/astral-sh/uv) package manager
- Docker (recommended, for Postgres + Redis) — or native local installs of PostgreSQL 15 and Redis 7

```bash
pip install uv
uv sync
```

### 3. Start Postgres + Redis

The easiest path is the dev compose file, which runs **only** the datastores — you run the API yourself on the host so you get hot reload and a debugger:

```bash
docker compose -f docker-compose.dev.yml up -d
```

This exposes Postgres on `localhost:5432` and Redis on `localhost:6379` (override with `POSTGRES_PORT` / `REDIS_PORT` env vars if those are taken).

Alternatively, `docker compose up` runs the full stack (API included) built from the local `Dockerfile` — useful for verifying the container build, less convenient for iterating on code.

### 4. Configure environment

```bash
cp .env.example .env
```

Edit `.env`:

- `FHIR_DATABASE_URL` — point at `localhost:5432` (or your chosen port) if using `docker-compose.dev.yml`
- `REDIS_URL` — point at `localhost:6379` similarly
- `IAM_ISSUER` / `IAM_JWKS_URL` — every route is JWT-protected, so you need an OIDC provider that exposes a JWKS endpoint (e.g. [Keycloak](https://www.keycloak.org/), Auth0, or any standards-compliant IdP). Point these at your provider's issuer URL and JWKS endpoint.

### 5. Run migrations

```bash
uv run alembic upgrade head
```

### 6. Start the dev server

```bash
uv run fastapi dev app/main.py
```

The API is now available at `http://localhost:8000`, with interactive docs at `http://localhost:8000/docs`.

---

## Terminology Data (Optional)

The terminology service (ValueSet/CodeSystem lookups, field bindings) is seeded from external medical terminology sources — ICD-10-CM, LOINC, RxNorm, SNOMED CT, and the FHIR R4 built-in code systems. **You only need this if you're working on the terminology service itself** — the rest of the API works fine without it.

These files are large (hundreds of MB) and are **not committed to git** — `terminology_data/` is gitignored except for its own `README.md`. Full download links and per-source instructions live in [`terminology_data/README.md`](terminology_data/README.md).

A few things worth knowing before you go source data:

- **Licensing varies by source.** ICD-10-CM and the FHIR R4 code systems are public domain / freely redistributable. LOINC requires a free account and is bound by the Regenstrief LOINC license. RxNorm and SNOMED CT both require a free NLM UMLS account and are bound by the UMLS Metathesaurus License Agreement — read the terms for whichever sources you download, since some restrict redistribution of the raw data even though the license itself is free to obtain.
- Once you have the files, seed them with `just terminology-<source>` (e.g. `just terminology-icd10cm`) or `just terminology-all` to load everything in order. All loaders are idempotent — safe to re-run.
- Don't commit downloaded terminology files, even accidentally — the `.gitignore` rule covers `terminology_data/**`, but double-check `git status` if you add new file types there.

---

## Running Tests

```bash
uv run pytest tests/ -v
```

Or via `just`:

```bash
just test
just test-k <keyword>   # run tests matching a keyword
```

Please add or update tests for any behavior change before opening a PR.

---

## Project Conventions

This codebase follows a strict layered architecture (`Router → Service → Repository → ORM Model`) and repeatable patterns for adding/changing FHIR resources, mappers, and schemas. Before making non-trivial changes, read:

- [`CLAUDE.md`](CLAUDE.md) — architecture reference and full-flow checklist for field changes
- [`ARCHITECTURE.md`](ARCHITECTURE.md) — narrative overview of the same system

Key rules worth internalizing up front:

- Never use `response_model=` on routes — always inline `responses=` with `inline_schema()`
- Every DB field must be reachable through both `application/json` and `application/fhir+json` response shapes
- `/me` routes must be declared before `/{id}` routes
- Repositories are session-per-operation and always eager-load relationships
- After any schema change, check `/openapi.json` to confirm the field actually shows up — this project's OpenAPI spec doubles as an MCP tool contract, so drift silently breaks downstream AI tool callers

---

## Submitting a Pull Request

1. Create a branch off `main`: `git checkout -b feat/short-description`
2. Make your changes, following the conventions above
3. Run tests and make sure they pass
4. Open a PR against `main` with a clear description of *why* the change is needed, not just what it does
5. Link any related issue

Small, focused PRs are easier to review than large ones — if your change spans multiple concerns, consider splitting it up.

---

## Reporting Bugs / Requesting Features

Open a GitHub issue. For bugs, include steps to reproduce, expected vs. actual behavior, and relevant logs. For features, describe the use case, not just the desired implementation.

## Reporting Security Issues

Do **not** open a public issue for security vulnerabilities — see [SECURITY.md](SECURITY.md) for the responsible disclosure process.
