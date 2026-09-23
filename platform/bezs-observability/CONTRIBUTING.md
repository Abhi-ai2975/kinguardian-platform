# Contributing to Watcher24

Thanks for your interest in contributing! Watcher24 is a multi-tenant observability and
audit logging platform made up of several Go/Python/Next.js services, a set of client
SDKs, and example apps. This guide covers everything you need to get a local copy
running and to submit changes that fit the project's conventions.

---

## Get Started

### 1. Fork and clone the repository

If you don't have write access to the main repository, fork it first, then clone your fork:

```bash
git clone https://github.com/<your-username>/watcher24.git
cd watcher24
git remote add upstream https://github.com/naveenraj-g/watcher24.git
```

If you do have write access, you can clone directly and work on a branch:

```bash
git clone https://github.com/naveenraj-g/watcher24.git
cd watcher24
```

### 2. Install prerequisites

| Tool | Version | Install |
|------|---------|---------|
| Docker | latest | https://docs.docker.com/get-docker/ |
| Node.js | 20+ | https://nodejs.org |
| pnpm | 9+ | `npm install -g pnpm` |
| Go | 1.22+ | https://go.dev/dl |
| Python | 3.11+ | https://www.python.org/downloads |
| uv | latest | https://github.com/astral-sh/uv |
| just | latest | https://github.com/casey/just |

Verify everything is on your PATH:

```bash
docker --version && node --version && pnpm --version && go version && python --version && uv --version && just --version
```

### 3. Install dependencies and start infrastructure

```bash
pnpm install     # installs console, IAM, JS SDKs, and JS example apps
just up          # starts PostgreSQL, ClickHouse, Redis, MinIO via docker-compose
```

### 4. Configure environment files

Every app has a `.env.example`. Copy each one to `.env` and adjust values if needed
— the defaults already match the docker-compose services, so local dev works
out of the box for the core flow:

```bash
cp .env.example                       .env
cp apps/gateway-go/.env.example       apps/gateway-go/.env
cp apps/analytics-python/.env.example apps/analytics-python/.env
cp apps/realtime-go/.env.example      apps/realtime-go/.env
cp apps/console/.env.example          apps/console/.env
cp apps/iam/.env.example              apps/iam/.env
```

`apps/notifier-go` has no `.env` of its own — it reads `NOTIFIER_*`, `SMTP_*`, and
`WATCHER24_DATABASE_URL` from the repo-root `.env` you copied in step 1.

A few secrets **must match** across files:
- `BETTER_AUTH_SECRET` — same value in `apps/iam/.env` and `apps/console/.env`
- `INTERNAL_API_SECRET` — same value in `apps/iam/.env` and `apps/console/.env`
- `NOTIFIER_INTERNAL_SECRET` — same value in the root `.env` and `apps/console/.env`

### 5. Run each service

Open a terminal per service (or use a process manager like [overmind](https://github.com/DarthSim/overmind)):

```bash
just iam-dev        # IAM (auth authority)     → http://localhost:5000  — start this first
just gateway-dev     # Telemetry ingestion      → http://localhost:8080
just realtime-dev    # WebSocket fan-out        → ws://localhost:8081
just worker-dev      # Analytics worker          (no HTTP port)
just notifier-dev    # Notification delivery    → http://localhost:4004
just console-dev     # Dashboard UI             → http://localhost:3001
```

IAM must be running before the others, since gateway/realtime/console all depend
on it for API key or session validation.

On first run, sign up at `http://localhost:5000/auth/sign-up`, then promote your
user to `superadmin` directly in Postgres so you can access the admin panel and
create an organization + API key:

```sql
UPDATE "user" SET role = 'superadmin' WHERE email = 'you@example.com';
```

### 6. Verify it's working

```bash
curl http://localhost:8080/health
# → {"status":"ok"}
```

Send a test event with the API key you created in the console (Settings → API Keys):

```bash
curl -X POST http://localhost:8080/v1/events \
  -H "Authorization: Bearer wtch_your_key_here" \
  -H "Content-Type: application/json" \
  -d '{"event_type":"log","severity":"info","message":"hello","payload":{}}'
```

The event should show up in the console's live feed within a couple of seconds.

**For the full walkthrough** — including troubleshooting, resetting local state,
and running everything with a single command — see
[`docs/local-dev/setup.md`](docs/local-dev/setup.md).

---

## How to Contribute

### Finding something to work on

- Check open [issues](https://github.com/naveenraj-g/watcher24/issues) for bugs and
  feature requests, especially ones tagged `good first issue` if available.
- For anything non-trivial (new services, schema changes, new SDK languages), open
  an issue first to discuss the approach before writing code — it saves everyone
  rework.
- Found a security issue? Do **not** open a public issue — see
  [`SECURITY.md`](SECURITY.md) instead.

### Branching and commits

- Branch off `mvp` (the active development branch) for your changes.
- Use descriptive branch names, e.g. `fix/gateway-retry-backoff`, `feat/slack-notification-channel`.
- Commit messages follow a `type: summary` format:

  ```
  feat: add Slack notification channel
  fix: check in_app channel before sender lookup
  refactor: extract retry logic into shared helper
  test: cover expired API key rejection in gateway
  docs: document RETENTION_INTERVAL_SECONDS
  ```

  Valid types: `feat`, `fix`, `refactor`, `test`, `docs`.

### Code style and architecture

Every app in this monorepo follows the same architectural and quality rules,
defined in full in the root [`CLAUDE.md`](CLAUDE.md). The essentials:

- **Clean architecture, one-way dependencies.** Domain → Ports → Use Cases →
  Adapters → Transport → composition root (`main.go` / `main.py` / entrypoint).
  Use cases depend only on port interfaces, never on concrete adapters. Business
  logic never lives in HTTP handlers.
- **Comments explain WHY, not WHAT.** Every file, struct/class, interface, and
  non-obvious function needs a comment on its purpose or the reasoning behind a
  non-obvious choice — not a restatement of the code.
- **Errors are never swallowed.** Wrap errors with context
  (`fmt.Errorf("ingest event: %w", err)`), use typed domain errors, and return the
  standard HTTP error shape `{ "error": "...", "code": "..." }`.
- **Two separate Postgres databases.** The IAM database is owned exclusively by
  `apps/iam` and migrated with Prisma. Every other service uses the `watcher24`
  database, migrated via raw SQL in `infrastructure/postgres/migrations/`. Never
  write a migration that touches IAM-owned tables, and never query the IAM
  database directly from another service — call an authenticated IAM API endpoint
  instead. Full rules and examples are in `CLAUDE.md` rule 9.
- **Package managers are fixed per stack** — `pnpm` for every npm project (never
  `npm`/`yarn`/`npx`), `uv` for every Python project (never bare `pip`), `just`
  for Go/Python/Rust task running.

### Tests

Every app is expected to have tests — unit tests for use cases and domain logic
with mocked ports, integration tests against the real docker-compose services for
adapters, and handler tests for HTTP endpoints. See `CLAUDE.md` rule 4 for test
naming conventions and file locations per language.

Run everything backend/SDK-side from the repo root:

```bash
just test-all
```

Or scope to what you touched:

```bash
just gateway-test     # apps/gateway-go
just worker-test      # apps/analytics-python
just realtime-test    # apps/realtime-go
just notifier-test    # apps/notifier-go
just sdk-python-test  # sdk/python
just sdk-js-test      # sdk/js
just sdk-go-test      # sdk/go
just sdk-rust-test    # sdk/rust
```

`apps/console` and `apps/iam` don't yet have automated test suites — run
`pnpm lint` (both) and `pnpm type-check` (console) before submitting changes to
either app, and cover new logic with tests where the surrounding code already has
a pattern to follow.

### Keep docs, SDKs, and examples in sync

If your change touches an API, an environment variable, an SDK method, or
user-facing behavior, update the relevant docs **in the same commit** — not a
follow-up one. This includes:

- The app's own `docs/overview.md`, `architecture.md`, `api.md`, `configuration.md`
- Console-facing docs under `apps/console/src/content/docs/` if the change is user-visible
- SDK code and docs under `sdk/*` if the platform's request/response shape changed
- Example apps under `examples/*` if they demonstrate the changed feature

`CLAUDE.md` rule 10 has the full table of what to update for each kind of change.
Docs must describe the actual current implementation, never an aspirational one.

### Environment variables

- Every app's `.env.example` must stay in sync with what its code actually reads —
  no undocumented required variables, no documented variables the code no longer uses.
- Document every new variable inline in `.env.example` (what it's for, where to get
  a value, whether it's optional) and in the app's `docs/configuration.md`.
- Never commit a real `.env` file or real secrets. `.env` is gitignored — keep it that way.

---

## Submitting a Pull Request

1. Make sure `just test-all` passes (plus `pnpm lint`/`type-check` for any Next.js
   app you touched) and that you've updated the docs described above.
2. Push your branch and open a PR against `mvp`.
3. Describe **what** changed and **why** — link the issue it addresses if there is one.
4. Keep PRs focused. A bug fix doesn't need an unrelated refactor riding along with it.
5. Be responsive to review feedback — small, iterative fixes are easier to review
   than one big rewrite at the end.

---

## Questions

If something in this guide is unclear or out of date, please open an issue —
inaccurate contributor docs are a bug too.
