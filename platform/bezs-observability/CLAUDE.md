# CLAUDE.md — Watcher24

## Project Overview

Watcher24 is a multi-tenant observability and audit logging platform.
It ingests telemetry (logs, metrics, traces, audit events) from SDKs, processes them through a pipeline, and displays them on a realtime dashboard.

**Monorepo structure:**

```
watcher24/
├── apps/
│   ├── gateway-go/        — Telemetry ingestion gateway (Go)
│   ├── analytics-python/  — Event processing workers (Python)
│   ├── realtime-go/       — WebSocket fan-out service (Go)
│   ├── console/           — Console UI: observability, onboarding, billing, docs (Next.js)
│   └── iam/               — Identity & Access Management (Next.js + better-auth)
├── sdk/                   — Client SDKs (JS, Python, Go, Rust)
├── infrastructure/        — DB migrations, Docker configs
└── docs/                  — Project-level architecture docs
```

---

## Rules — Follow These on Every App

### 1. Clean Architecture (mandatory)

Every app must follow clean architecture with strict one-way dependencies.
Outer layers depend on inner layers. Inner layers never import outer layers.

```
Domain (entities, value objects — zero external imports)
  ↑
Ports (interfaces/contracts — no implementations)
  ↑
Use Cases (business logic — depends on ports only, never on adapters)
  ↑
Adapters (implementations of ports — DB, Redis, HTTP clients, etc.)
  ↑
Transport / Presentation (HTTP handlers, CLI, workers)
  ↑
main / entrypoint (composition root — wires everything together)
```

**Rules:**
- Use cases NEVER import adapters directly — only port interfaces
- Domain NEVER imports anything outside the standard library
- Transport NEVER contains business logic
- The composition root (`main.go`, `main.py`, etc.) is the ONLY place where concrete implementations are injected
- One use case = one file = one operation

---

### 2. Documentation (mandatory)

Every app must have a `docs/` folder containing:

| File | Contents |
|------|----------|
| `overview.md` | What the app does, why it exists, where it fits in the system |
| `architecture.md` | Clean architecture layers explained for this specific app |
| `api.md` | Endpoints or interfaces exposed (if applicable) |
| `configuration.md` | All environment variables with defaults and descriptions |

Docs must be kept in sync with the code. If behaviour changes, update the relevant doc.

---

### 3. Code Comments (mandatory)

Every file, struct, interface, function, and method must have a comment explaining the WHY, not just the what.

**Rules:**
- Every **file** must start with a package/module comment explaining what the file contains and its role in the architecture
- Every **struct / class** must have a comment explaining what it represents
- Every **interface** must have a comment explaining the contract and why it exists as an interface
- Every **function / method** must have a comment if it is not immediately obvious
- Comments on **non-obvious logic** must explain WHY, not just re-state what the code does
- Never write a comment that just repeats the function name

**Example (Go):**
```go
// KeyValidator is the port interface for API key validation.
// The gateway depends on this interface rather than a concrete Postgres
// implementation so that tests can inject a fake validator without
// requiring a live database connection.
type KeyValidator interface {
    // Validate hashes the raw key and looks it up in the IAM database.
    // Returns the resolved APIKey (with org context) or an error if the
    // key is missing, disabled, or expired.
    Validate(ctx context.Context, rawKey string) (*domain.APIKey, error)
}
```

---

### 4. Tests (mandatory)

Every app must have tests. No exceptions.

**Coverage requirements:**
- All use cases must have unit tests with mocked ports
- All adapters must have integration tests (use real DB/Redis from docker-compose)
- All HTTP handlers must have tests
- All domain logic (validation, enrichment) must have unit tests

**Test file conventions:**

| Language | Unit test location | Integration test location |
|----------|--------------------|--------------------------|
| Go | Same package, `_test.go` suffix | `tests/integration/` folder |
| Python | `tests/unit/` folder | `tests/integration/` folder |
| TypeScript | Same folder, `.test.ts` suffix | `tests/` folder |

**Test naming:**

```
// Go
func TestIngestEvent_ValidEvent_PublishesToCorrectStream(t *testing.T)
func TestIngestEvent_ExpiredAPIKey_ReturnsError(t *testing.T)

# Python
def test_ingest_event_valid_event_publishes_to_correct_stream()
def test_ingest_event_expired_api_key_returns_error()
```

Pattern: `Test<UseCase>_<Condition>_<ExpectedBehaviour>`

**Mock/stub rules:**
- Unit tests must mock all ports — no real DB, no real Redis
- Integration tests must use the real docker-compose services (never a shared environment)
- Never mock the domain layer — domain objects are plain data structures

**Every app must include a test runner:**

```bash
# Go / Python (via justfile)
just test

# TypeScript / Next.js (via package.json)
pnpm test
```

---

### 5. Error Handling

- Never swallow errors silently
- Every error must be wrapped with context: `fmt.Errorf("ingest event: %w", err)`
- Domain errors must be typed (not raw strings) so callers can switch on them
- HTTP errors must always return the standard error shape: `{ "error": "...", "code": "..." }`

---

### 6. Environment Variables

- Every app must have a `.env.example` file in its own folder
- Never hardcode secrets, ports, or URLs
- All env vars must be documented in `docs/configuration.md`

---

### 7. Folder Structure Per App

```
<app-name>/
├── docs/               — markdown documentation (overview, architecture, api, configuration)
├── tests/              — integration tests
│   └── integration/
├── internal/ (Go) or src/ (Python/TS)
│   ├── domain/         — entities, value objects
│   ├── ports/          — interfaces
│   ├── usecases/       — business logic
│   ├── adapters/       — infrastructure implementations
│   └── transport/      — HTTP / worker / CLI layer
├── main.go / main.py   — composition root
├── .env.example        — environment variable template
└── README.md           — quick start (how to run, test, configure)
```

---

### 8. Scripts & Package Managers

**Python apps and SDKs — always use `uv`:**
- Install deps: `uv sync`
- Run anything: `uv run <command>`
- Add a dep: `uv add <package>`
- Add a dev dep: `uv add --dev <package>`
- Never use `pip install` directly in Python projects

**npm projects — always use `pnpm`:**
- Install deps: `pnpm install`
- Add a dep: `pnpm add <package>`
- Add a dev dep: `pnpm add -D <package>`
- Run a script: `pnpm <script>`
- Never use `npm install`, `npm run`, `yarn`, or `npx` — use `pnpm dlx` for one-off executables

**Script runner per tech stack:**

| Stack | Script runner | Where scripts live |
|-------|--------------|-------------------|
| Next.js / React / any npm app | `pnpm` (never `npm` or `yarn`) | `package.json` → `scripts` |
| Go / Python / Rust / anything else | `just` | `justfile` in the app root |

Every non-npm app must have a `justfile` with at minimum these recipes:

```makefile
# Go
dev       # go run main.go (with .env loaded)
build     # go build -o bin/<name> .
test      # go test ./...
lint      # go vet ./...
tidy      # go mod tidy

# Python
dev       # uv run python main.py
test      # uv run pytest
test-cov  # uv run pytest --cov
sync      # uv sync
```

The root `justfile` must have a recipe per app that delegates to it:
```
gateway   # just -f apps/gateway-go/justfile <recipe>
worker    # just -f apps/analytics-python/justfile <recipe>
```

npm app recipes in the root `justfile` delegate with `cd <app> && pnpm <script>`.

---

### 9. Two Separate PostgreSQL Databases (mandatory)

Watcher24 runs **two separate PostgreSQL databases**:

| Database | Who owns it | How migrations are managed |
|----------|------------|---------------------------|
| **IAM DB** | `apps/iam` exclusively | Prisma (`prisma migrate dev` inside `apps/iam`) |
| **`watcher24` DB** | All other services (console, gateway, analytics-python) | Raw SQL files in `infrastructure/postgres/migrations/`, applied via `just migrate-pg` |

**Never mix them.** The IAM app connects to `IAM_DATABASE_URL`. Every other service connects to `WATCHER24_DATABASE_URL` (the `watcher24` database). They are different databases, even if they run in the same Postgres container.

**Rule: Never write raw SQL migrations in `infrastructure/postgres/migrations/` that touch IAM-owned tables.**

If you add a migration there but IAM later runs `prisma migrate`, Prisma will conflict with or drop your changes because it doesn't know about them.

**The correct flow whenever you need to change IAM data or schema:**

```
Need to change IAM data/schema?
  ↓
1. Modify the Prisma schema inside apps/iam/prisma/schema.prisma
2. Run `prisma migrate dev` inside apps/iam — Prisma owns the migration
3. Add a secured API endpoint in apps/iam that performs the operation
4. Other services (console, gateway) call that IAM endpoint — never touch the IAM DB directly
```

**What this means in practice:**

| Scenario | Wrong | Right |
|----------|-------|-------|
| Add a column to `apikey` | Write `ALTER TABLE apikey ADD COLUMN ...` in `infrastructure/postgres/migrations/` | Add the field to `apps/iam/prisma/schema.prisma`, run `prisma migrate dev`, expose via IAM API |
| Create a new key type | Insert directly into `apikey` from the console's pg pool | Add a `POST /api/internal/public-tokens` route in IAM; console calls that route |
| Read org subscription data | Query `subscription` table from gateway or console directly | IAM exposes `GET /api/internal/org/:id/plan`; caller uses that |
| Add prompt templates table | Put it in the IAM DB or touch IAM Prisma schema | Create `infrastructure/postgres/migrations/00N_prompt_templates.sql` targeting the `watcher24` DB |

**IAM API endpoint security rules:**
- Internal endpoints (called by console/gateway, not by end users) must be protected with a shared secret header: `X-Internal-Secret: <IAM_INTERNAL_SECRET env var>`
- Never expose an internal endpoint without authentication — even internal traffic must be authenticated
- Document every new endpoint in `apps/iam/docs/api.md`

**What `infrastructure/postgres/migrations/` is for:**
All non-IAM application tables in the `watcher24` database — feature tables owned by the console or other services: `applications`, `prompt_templates`, `eval_datasets`, `eval_dataset_items`, `notification_channels`, `notification_deliveries`, `in_app_notifications`, `alert_rules`, `alert_history`, and any future console feature tables. Files are numbered sequentially (`001_`, `002_`, …) and applied in order by `just migrate-pg`.

---

### 10. Keep Internal Docs, SDKs, Console Docs, and Example Apps in Sync (mandatory)

Every time you add a feature, change an API, or modify behaviour in any app, you **must** read
and update the relevant internal documentation, console-facing MDX docs, SDK code/docs, and
example applications **in the same commit**. Never split doc updates into a later commit.

**Internal docs to check on every change:**

| Change type | Docs to update |
|-------------|---------------|
| New or changed API endpoint | `apps/<app>/docs/api.md` |
| New env variable | `apps/<app>/docs/configuration.md` + `apps/<app>/.env.example` |
| Architecture change (new port, adapter, layer) | `apps/<app>/docs/architecture.md` |
| Changed system overview / event flow | `apps/<app>/docs/overview.md` |
| New IAM internal endpoint | `apps/iam/docs/api.md` (mandatory per Rule 9) |
| Console UI feature visible to users | `apps/console/docs/api.md` (if a new route was added) |

**Console MDX docs — always check when anything user-facing changes:**

These are the docs users read at `/docs` in the console. They must reflect reality, not aspirational behaviour.

| Change type | Console MDX docs to update |
|-------------|---------------------------|
| New or changed SDK method / option | `apps/console/src/content/docs/sdks/<lang>.mdx` |
| New event type, field, or gateway behaviour | `apps/console/src/content/docs/api/ingestion.mdx` |
| New platform concept (retention, limits, quotas, etc.) | `apps/console/src/content/docs/concepts/<topic>.mdx` |
| New SDK added | Create `apps/console/src/content/docs/sdks/<lang>.mdx` + add to `docs-nav.ts` + add to `sdks/index.mdx` |
| Billing plan limits changed | `apps/console/src/content/docs/concepts/` (whichever concept page describes that limit) |
| Any behaviour described in an existing concept doc that changed | Update the concept doc — never leave it describing an implementation that no longer exists |

**Rules for console MDX docs:**
- Every MDX doc must describe the **actual current implementation**, never a planned or aspirational one.
- If a concept doc describes how something works technically (e.g. how retention is enforced), it must match the code exactly — wrong technical descriptions are worse than no documentation.
- Docs must be updated in the **same commit** as the code change, not after.

**SDKs — always update when the platform changes:**
- If you add a new event type, token type, or field that SDKs send or receive, update all SDKs:
  - `sdk/js/packages/core/` — shared types and client facade
  - `sdk/js/packages/browser/` — browser transport and public-token helpers
  - `sdk/js/packages/node/` — Node.js transport
  - `sdk/python/src/watcher_sdk/` — Python client and HTTP transport
  - `sdk/go/` — Go client
  - `sdk/rust/src/` — Rust client
- Update the SDK docs (`sdk/js/docs/api.md`, `sdk/python/docs/api.md`, `sdk/go/docs/api.md`, `sdk/rust/docs/api.md`) to reflect the change.
- Update the matching console MDX SDK docs (`apps/console/src/content/docs/sdks/`).
- If the SDK API surface changes (new method, removed param, new optional field), bump the version comment at the top of the relevant client file.

**Example apps — always update when the SDK or gateway changes:**
- `examples/nextjs/` — Next.js full-stack example (server + browser SDKs)
- `examples/react-node/` — React SPA + Node.js backend example
- `examples/fastapi/` — FastAPI + Python SDK example
- `examples/go/` — Go service example
- `examples/rust/` — Rust service example
- Keep `.env.example` files in each example up to date with new required/optional variables.
- Example code must demonstrate new features with correct, working code and inline comments explaining the WHY.

**The rule in one sentence:**  
_A feature is not done until the internal docs, console MDX docs, SDKs, and example apps all reflect it — in the same commit._

---

### 11. Git

- All MVP work goes on the `mvp` branch
- Commit message format: `feat:`, `fix:`, `refactor:`, `test:`, `docs:`
- Never commit `.env` files — only `.env.example`
- Never commit `node_modules/`, `__pycache__/`, build artifacts
