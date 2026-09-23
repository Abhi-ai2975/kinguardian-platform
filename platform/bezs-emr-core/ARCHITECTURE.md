# Architecture

This document is a narrative overview of how FHIR Server is put together. For the exhaustive, rule-by-rule reference used when adding or changing resources, see [`CLAUDE.md`](CLAUDE.md) / [`AGENTS.md`](AGENTS.md).

---

## Overview

FHIR Server is a FHIR R4-compliant REST API built with FastAPI and PostgreSQL. Every resource endpoint can respond in two shapes, selected by the `Accept` header:

- `application/fhir+json` — full FHIR R4 JSON (camelCase, spec-compliant)
- `application/json` (or no header) — a simplified snake_case shape, easier to consume from typical application code

The same underlying data serves both. The generated OpenAPI spec is also consumed by a FastMCP server that exposes each endpoint as an AI-agent tool, so the API surface doubles as a machine-readable tool contract.

---

## Request Flow

```
Router → Service → Repository → ORM Model
```

- **Router** (`app/routers/<resource>.py`) — validates the request body against a Pydantic schema, pulls `user_id`/`org_id` off the validated JWT, calls the service, and formats the response.
- **Service** (`app/services/<resource>_service.py`) — thin orchestration layer; hosts the `_to_fhir()` / `_to_plain()` wrappers and any cross-entity logic that doesn't belong in a single repository.
- **Repository** (`app/repository/<resource>_repository.py`) — owns all database I/O. Opens a session per operation, eager-loads every relationship, and applies shared list-filtering logic.
- **Model** (`app/models/<resource>/`) — SQLAlchemy 2.0 async declarative models.

Layers are never skipped — routers don't touch the ORM directly, and repositories never contain HTTP or FHIR-shaping concerns.

---

## Directory Layout

```
app/
├── core/           # config, database engine, logging, redis, content negotiation
├── auth/           # get_current_user, require_permission, resolve_<resource>
├── di/             # dependency-injector container, modules, dependencies
├── models/         # SQLAlchemy ORM — one package per resource + shared enums
├── fhir/mappers/   # per-resource fhir.py (camelCase) + plain.py (snake_case)
├── repository/     # all DB I/O
├── services/       # thin orchestration
├── routers/        # FastAPI route definitions
├── schemas/        # Pydantic input schemas + FHIR/plain response schemas
└── errors/         # ApplicationError hierarchy → FHIR OperationOutcome

migrations/         # Alembic migration versions
```

---

## Dual-Format Responses

`format_response()` / `format_paginated_response()` (`app/core/content_negotiation.py`) dispatch on the `Accept` header at the very edge of the router, after the service has already produced both a FHIR dict and a plain dict from the same ORM model. This keeps the mapping logic in one place per resource (`app/fhir/mappers/<resource>/`) instead of duplicating shaping logic across routers.

A single resource, `Vitals`, is the exception — it's not a FHIR resource and always returns plain JSON.

---

## Multi-Tenancy

Every table carries `user_id` and `org_id`, populated from JWT claims (`sub` and `activeOrganizationId`) at write time. Reads are scoped the same way: `resolve_<resource>()` auth dependencies 404 on any row outside the caller's tenant rather than leaking a 403. List endpoints support a `/me` variant that always filters to the caller's own `user_id`/`org_id`.

## Authentication

JWTs are validated against a JWKS endpoint (`PyJWT` + `PyJWKClient`). Each resource route depends on `require_permission("<resource>", "create|read|update|delete")`, which both authenticates the caller and checks the requested action is allowed.

## Public vs. Internal IDs

Every resource has two identifiers:

| Column | Exposed via API? |
|---|---|
| `id` | Never — internal DB primary key |
| `<resource>_id` | Yes — used in URLs, FHIR `Reference` strings (e.g. `"Patient/10001"`), and all API responses |

`<resource>_id` values come from a dedicated PostgreSQL sequence per resource type, each starting at its own reserved 10,000 block (see `CLAUDE.md` for the current allocation table). This keeps IDs human-scannable (you can tell a resource type from its ID range) while never leaking internal primary keys.

---

## FHIR Mapping

Each resource has a mapper package at `app/fhir/mappers/<resource>/`:

- `fhir.py` — builds the FHIR R4 camelCase representation
- `plain.py` — builds the simplified snake_case representation
- `__init__.py` — re-exports both

Shared datatype helpers (`fhir_human_name`, `fhir_identifier`, `fhir_telecom`, `fhir_address`, etc.) live in `app/fhir/datatypes.py` and are reused across every resource mapper, so a `HumanName` or `Identifier` is only encoded once.

---

## Dependency Injection

Each resource wires a `dependency-injector` `Factory` for its repository + service in `app/di/modules/<resource>.py`, exposed to routes via an `@inject`-decorated function in `app/di/dependencies/<resource>.py`, and registered in `app/di/container.py`. Routes never construct services or repositories directly.

---

## Error Handling

All errors — validation, application-level, or unhandled — are converted to a FHIR `OperationOutcome` response by handlers in `app/errors/handlers.py`, so API consumers get a consistent, spec-compliant error shape regardless of what failed.

---

## Data Stores

- **PostgreSQL 15** — primary datastore, accessed asynchronously via SQLAlchemy 2.0 + asyncpg. Schema managed with Alembic migrations.
- **Redis 7** — server-side sessions and rate-limiting state.

---

## Adding a New Resource

The full 17-step checklist (model → migration → schemas → mapper → repository → service → DI → router) lives in `CLAUDE.md` and the `/new-fhir-resource` reference. At a high level, every resource needs: an ORM model + migration, create/patch schemas, a FHIR mapper package, a repository, a thin service, DI wiring, and a router with both `application/json` and `application/fhir+json` response schemas registered.
