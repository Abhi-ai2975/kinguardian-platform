# Architecture

drgodly is a [Next.js](https://nextjs.org) 16 App Router application that
acts as the frontend and orchestration layer for a telemedicine platform.
It does not own clinical data itself — most of that lives in an external
FHIR server — but it owns the UI, workflow orchestration, and a small
amount of proprietary application data (e.g. intake sessions) in its own
Postgres database.

> This app is built on a customized fork of Next.js — check
> `node_modules/next/dist/docs/` before assuming a stock Next.js API or
> file convention applies. See [AGENTS.md](./AGENTS.md).

## System overview

```
                          ┌─────────────────────┐
                          │   drgodly (this repo) │
                          │   Next.js App Router   │
                          └──────────┬───────────┘
                                     │
        ┌───────────────┬───────────┼───────────────┬────────────────┐
        │                │           │               │                │
        ▼                ▼           ▼               ▼                ▼
┌───────────────┐ ┌─────────────┐ ┌────────┐ ┌───────────────┐ ┌────────────┐
│ Postgres       │ │ BetterAuth  │ │ FHIR   │ │ AI agents      │ │ LiveKit /  │
│ (this repo's   │ │ IAM server  │ │ server │ │ (intake,       │ │ Vapi       │
│ own data,      │ │ (external   │ │(REST or│ │ consult,       │ │ (voice/    │
│ e.g. intake)   │ │ repo)       │ │ GraphQL│ │ assessment —   │ │ video)     │
└───────────────┘ └─────────────┘ │ transp.│ │ Python, external)│└────────────┘
                                    └────────┘ └───────────────┘
                                     ▲
                          ┌──────────┴──────────┐
                          │  FileNest (document/  │
                          │  report storage)      │
                          └───────────────────────┘
```

Everything except Postgres and this Next.js app is an external service —
see [CONTRIBUTING.md](./CONTRIBUTING.md) for what you can run locally
versus what requires those services to be reachable.

## Module layout (`src/modules`)

The app follows a clean-architecture-inspired split between client and
server code, plus shared entities:

```
src/modules/
├── client/     feature-oriented UI: components, hooks, stores, queries
├── server/     clean-arch orchestrator per FHIR resource (see below)
├── entities/   shared Zod schemas/types used by both client and server
└── shared/     cross-cutting helpers
```

### Server modules (`src/modules/server`)

Each clinical resource (`patient`, `appointment`, `encounter`,
`practitioner`, `observation`, `condition`, `diagnostic-report`, ...) lives
under `src/modules/server/core/<resource>` with the same internal layering:

```
core/<resource>/
├── domain/               interfaces — no framework/IO dependencies
├── infrastructure/       services implementing domain interfaces
│   └── services/           (FHIR REST/GraphQL client calls, etc.)
├── application/
│   └── usecases/         orchestrates domain + infrastructure
└── interface-adapters/
    └── controllers/       thin entry points called from server actions
```

Dependencies are wired up through `src/modules/server/di` using
[`@evyweb/ioctopus`](https://github.com/evyweb/ioctopus), a lightweight
IoC container. This is what lets the same resource module switch between
REST and GraphQL FHIR transports (`FHIR_TRANSPORT` env var) without
touching usecase or controller code — only the DI bindings change.

Server actions in `src/modules/server/presentation/actions` are the
boundary the client calls into (via [`zsa`](https://zsa.vercel.app/)),
which delegate to controllers.

`src/modules/server/auth` and `auth-provider` wrap the external BetterAuth
IAM service; `src/modules/server/shared` holds cross-resource error types
and auth helpers.

### Client modules (`src/modules/client`)

Feature UI grouped by domain (e.g. `ai-hub`, plus per-resource folders).
Each typically has its own components, hooks, Zustand store, and
TanStack Query wiring. Data tables reuse the shared table system in
`src/modules/shared/components/tables` (TanStack Table v8).

### AI Hub / workflow system

`src/app/api/workflow/_registry.ts` registers a set of JSON-defined
workflows (`src/modules/client/ai-hub/workflows/**/*.json`). Each workflow
step references:

- a **UI schema** (`src/modules/client/ai-hub/schemas/ui`) — drives a
  dynamic form renderer
- a **validation schema** (`src/modules/client/ai-hub/schemas/validation`)
  — a Zod schema keyed by the same name

This lets new admin/clinical workflows (e.g. "select a patient, then
upload a report") be added by dropping in a workflow JSON + matching UI
and validation schema, without new page routes.

## Data & external services

- **Postgres** (via Prisma, `prisma/schema/schema.prisma`) — this repo's
  own data only: things that are proprietary to the app rather than FHIR
  clinical data (e.g. intake session transcripts). Accessed through a
  singleton client in `prisma/db.ts` using the `pg` driver adapter.
- **FHIR server** — source of truth for patients, appointments,
  encounters, practitioners, observations, conditions, diagnostic
  reports, etc. Reached over REST or GraphQL depending on
  `FHIR_TRANSPORT`.
- **BetterAuth** — external IAM/auth server; this app verifies sessions
  against it rather than owning auth itself.
- **AI agents** — external Python services (see `agents/` for local dev
  compose files, gitignored since they contain developer credentials) for
  intake, consultation, assessment-plan, clinical extraction, and a
  text-to-SQL agent. Reached over HTTP via the `*_AGENT_URL` env vars.
  A separate A2UI workflow agent (`AGENT_API_URL`) powers the workflow
  system above.
- **LiveKit** — real-time audio/video for consultations.
- **Vapi** — voice AI agent integration.
- **FileNest** (`vendor/filenest`) — vendored SDK for document/report
  upload and storage, used by features like the medical records upload
  flow.
- **i18n** — [`next-intl`](https://next-intl.dev/), messages under
  `src/messages`.

## Deployment

`Dockerfile` is a multi-stage build: install deps → `prisma generate` +
`next build` (standalone output) → minimal runtime image. On container
start, `docker-entrypoint.sh` runs `prisma db push` against
`DATABASE_URL` before starting the server — schema changes are applied
automatically on deploy rather than via a separate migration step.

- `compose.yml` — pulls the published image, used for a bare production
  deploy.
- `compose.vps.yml` — production deploy alongside the external FHIR/IAM/
  agent services on a shared Docker network (VPS setup).
- `docker-compose.yml` / `docker-compose.dev.yml` — local development
  infra only (Postgres, optionally Redis); see CONTRIBUTING.md.

`docker-build.sh` builds the image, baking `NEXT_PUBLIC_*` values from an
env file into the client bundle at build time (required since Next.js
inlines these at build, not runtime).
