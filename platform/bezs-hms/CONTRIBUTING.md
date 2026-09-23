# Contributing to drgodly

Thanks for your interest in contributing. This doc covers how to get the
project running locally and the conventions we follow.

## Before you start: what this repo does and doesn't include

drgodly is the Next.js frontend/orchestrator app. Several features depend
on external services that live in **separate repos**, not this one:

- **IAM / BetterAuth server** — authentication (`BETTER_AUTH_URL`)
- **FHIR server** — clinical data store for patients, appointments,
  encounters, etc. (`FHIR_SERVER_URL` / `FHIR_GQL_URL`)
- **AI agents** (intake, consultation, assessment) — Python microservices
  under `agents/` locally, not committed to this repo
- **LiveKit, Vapi, FileNest, Thesys, Groq** — third-party hosted services

You can run the core app (Next.js + Postgres) fully locally. Features that
call out to the services above will error or no-op until you point their
URLs at running instances. See [ARCHITECTURE.md](./ARCHITECTURE.md) for how
everything fits together.

## Getting started

### Prerequisites

- Node.js 22+
- [pnpm](https://pnpm.io/) 9 (`corepack enable && corepack prepare pnpm@9 --activate`)
- Docker + Docker Compose (for Postgres)

### 1. Fork and clone

```bash
git clone https://github.com/<your-username>/drgodly.git
cd drgodly
```

If you're a maintainer working directly on this repo, just clone it
normally instead of forking.

### 2. Install dependencies

```bash
pnpm install
```

### 3. Start Postgres

```bash
docker compose -f docker-compose.dev.yml up -d
```

This starts a Postgres container matching the credentials in
`.env.example`. Use `docker-compose.yml` instead if you also want a Redis
container available locally (not yet used by the app, but provisioned for
upcoming caching/session work).

### 4. Configure environment variables

```bash
cp .env.example .env
```

Fill in `DATABASE_URL` (defaults already match the Docker Postgres
container) and any external service URLs/keys you need for the feature
you're working on. Unused sections can be left as placeholders.

### 5. Push the database schema

```bash
pnpm db:generate
pnpm db:push
```

### 6. Run the dev server

```bash
pnpm dev
```

The app runs at [http://localhost:4000](http://localhost:4000).

## Code conventions

This project's coding standards are documented in [`CLAUDE.md`](./CLAUDE.md)
and [`AGENTS.md`](./AGENTS.md) at the repo root — please read them before
opening a PR. The highlights:

- **Comments are required.** Every file needs a file-level comment
  describing its role, JSDoc on public functions/classes, and inline
  comments for non-obvious logic or business rules.
- **File naming:** React components (components, modals, forms, cards,
  layouts) use `PascalCase.tsx`. Hooks, utilities, actions, schemas, and
  services use `camelCase` or `kebab-case`. Next.js reserved files
  (`page.tsx`, `layout.tsx`, etc.) keep their lowercase names.
- **Architecture:** Server-side resources follow a clean-architecture
  layout (`domain → infrastructure → application/usecases →
  interface-adapters/controllers → di`) under
  `src/modules/server/core/<resource>`. Client-side features live under
  `src/modules/client/<feature>`. See ARCHITECTURE.md for details.
- This repo is built specifically for Next.js's newer conventions — check
  `node_modules/next/dist/docs/` before assuming an older Next.js API or
  file structure applies.

## Making a change

1. Create a branch off `main`: `git checkout -b feat/short-description`
2. Make your changes, following the conventions above.
3. Run lint and typecheck before opening a PR:
   ```bash
   pnpm lint
   ```
4. Write a clear commit message describing *why* the change was made, not
   just what changed.
5. Open a pull request against `main`. Describe what you changed, why, and
   how you tested it (screenshots/recordings welcome for UI changes).

## Reporting bugs / requesting features

Open a GitHub issue. Include repro steps, expected vs. actual behavior,
and relevant logs. For security issues, see [SECURITY.md](./SECURITY.md)
instead — please don't open a public issue.
