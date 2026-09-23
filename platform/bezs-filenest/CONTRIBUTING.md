# Contributing to FileNest

Thanks for your interest in contributing. This guide gets you from a fresh clone to a running local stack.

---

## Getting Started

### Prerequisites

Install these before anything else:

| Tool | Version | Install |
|------|---------|---------|
| Docker + Docker Compose | Latest | [docker.com](https://www.docker.com/) |
| Python | 3.12+ | [python.org](https://www.python.org/) |
| uv | Latest | `pip install uv` or [docs.astral.sh/uv](https://docs.astral.sh/uv/) |
| Node.js | 20+ | [nodejs.org](https://nodejs.org/) |
| pnpm | 9+ | `npm install -g pnpm` |
| just | Latest | [just.systems](https://just.systems/) |

### 1. Fork and clone

```bash
git clone https://github.com/<your-fork>/file-nest.git
cd file-nest
```

### 2. Start the local infrastructure

```bash
just dev
```

This starts six services via Docker Compose:

| Service | Port | Purpose |
|---------|------|---------|
| FileNest PostgreSQL | `5434` | Backend database |
| IAM PostgreSQL | `5433` | Auth database (BetterAuth) |
| Redis | `6379` | Cache + rate-limit counters |
| RustFS | `9000` / `9001` | S3-compatible object storage (console on `:9001`) |
| NATS JetStream | `4222` / `8222` | Event bus (monitor on `:8222`) |
| ClamAV | `3310` | Virus scanning |

> **ClamAV is slow on first start.** It loads a ~250 MB virus database before accepting scan requests. Expect 1–3 minutes. Watch progress with `just logs clamav` and wait for `socket found, clamd started`.

### 3. Set up the backend

```bash
cp backend/.env.example backend/.env
```

Open `backend/.env` and fill in the storage provider credentials. For local development, **RustFS** is the easiest — it runs in Docker and needs no cloud account:

```env
DEFAULT_STORAGE_PROVIDER=rustfs
RUSTFS_ENDPOINT_URL=http://localhost:9000
RUSTFS_ACCESS_KEY_ID=rustfsadmin
RUSTFS_SECRET_ACCESS_KEY=rustfsadmin
RUSTFS_BUCKET_NAME=filenest
```

Then install dependencies, run migrations, and seed the database:

```bash
just install      # install Python dependencies (uv sync)
just migrate      # apply Alembic migrations to the FileNest DB
just seed-dev     # create a dev project + API key
```

Start the backend:

```bash
just backend      # FastAPI on :8000 with hot-reload
```

API docs are available at [http://localhost:8000/docs](http://localhost:8000/docs).

> **Windows users:** run the backend from **PowerShell**, not Git Bash. Git Bash has a thread-buffer limit that causes fatal crashes when concurrent file scans run.

### 4. Set up the IAM

The IAM is a separate Next.js app that acts as the OAuth 2.1 authorization server.

```bash
cp iam/.env.example iam/.env   # fill in values
just iam                        # starts on :5000
```

The IAM needs its own environment file. Key variables:

```env
DATABASE_URL=postgresql://iam_user:iam_password@localhost:5433/iam_db
BETTER_AUTH_SECRET=<generate with: openssl rand -hex 32>
BETTER_AUTH_URL=http://localhost:5000
INTERNAL_API_SECRET=<same value as backend/.env INTERNAL_API_SECRET>
```

After starting, create the seed admin and an OAuth client for the console app:

```bash
cd iam && pnpm seed:admin
```

Then open the IAM admin UI at `http://localhost:5000`, navigate to **OAuth Clients**, and create a client with:
- **Client ID:** `filenest-console`
- **Redirect URI:** `http://localhost:3000/callback`

Copy the generated **Client Secret** — you need it in step 5.

### 5. Set up the console app

```bash
cp frontend/web/.env.example frontend/web/.env
```

Fill in the key values:

```env
NEXT_PUBLIC_BETTER_AUTH_URL=http://localhost:5000
BETTER_AUTH_URL=http://localhost:5000
NEXT_PUBLIC_BETTER_AUTH_CLIENT_ID=filenest-console
BETTER_AUTH_CLIENT_SECRET=<from step 4>
NEXT_PUBLIC_APP_URL=http://localhost:3000
APP_URL=http://localhost:3000
INTERNAL_API_SECRET=<same value as iam/.env and backend/.env>
FILENEST_API_KEY=fn_live_<from seed-dev output>
FILENEST_API_URL=http://localhost:8000
```

Start the console:

```bash
just web          # Next.js on :3000 with hot-reload
```

Open [http://localhost:3000](http://localhost:3000) — you should land on the login page and be able to sign in through the IAM.

---

## Useful Commands

```bash
# Infrastructure
just dev              # start all Docker services
just down             # stop all Docker services
just reset            # wipe volumes and start fresh

# Backend
just backend          # FastAPI with hot-reload (:8000)
just migrate          # apply pending migrations
just migration "name" # generate a new Alembic migration from model diff
just seed-dev         # seed the dev database
just test             # run the test suite
just lint             # ruff check
just fmt              # ruff format

# Frontend
just web              # Next.js console (:3000)
just iam              # IAM (:5000)

# SDKs
just build-sdks       # build all TypeScript SDK packages
```

---

## Project Structure

```
file-nest/
├── iam/              # BetterAuth IAM — OAuth 2.1 server, API key management
├── backend/          # FastAPI API — all file infrastructure logic
│   ├── app/
│   │   ├── auth/         # token verification, tenant context, scopes
│   │   ├── core/         # config, database, logging, NATS, outbox
│   │   ├── models/       # SQLAlchemy ORM models
│   │   ├── repositories/ # DB access (always tenant-scoped)
│   │   ├── services/     # business logic
│   │   ├── storage/      # StorageProvider protocol + S3/RustFS/Azure/GCS/R2
│   │   ├── processing/   # pipeline: virus scan, MIME validation, classification
│   │   ├── workers/      # NATS consumers: ProcessingWorker, WebhookWorker
│   │   └── routers/      # HTTP handlers (thin — delegate to services)
│   └── migrations/       # Alembic versions
├── frontend/
│   └── web/          # Next.js console app
├── sdks/
│   ├── core/         # @filenest/core — shared HTTP client + types
│   ├── node/         # @filenest/node
│   ├── react/        # @filenest/react
│   ├── nextjs/       # @filenest/nextjs
│   └── python/       # filenest (PyPI)
├── examples/         # runnable demo apps for each SDK
├── docker-compose.yml
└── justfile
```

---

## Making Changes

### Backend (Python)

- **Never skip migrations.** When you change a SQLAlchemy model, generate a migration immediately: `just migration "describe_the_change"`. Never handwrite migration files.
- **Dependency direction is strict:** `routers → services → repositories → DB`. No layer skips another.
- **Every mutation goes through the transactional outbox.** Write to the `events` table in the same DB transaction as the business operation — never call NATS directly from a service.
- **All queries must be tenant-scoped.** Every repository query includes `organization_id + project_id`. There are no exceptions.

### SDKs (TypeScript / Python)

- Changes to the Node.js SDK and Python SDK must stay in parity. If you add a method to one, add it to the other.
- Run `just build-sdks` after TypeScript SDK changes before testing examples.

### Console app (Next.js)

- Browser components live in `modules/client/`. Server components and actions live in `modules/server/`. Never mix the two.
- All mutations go through **zsa server actions** in `modules/server/actions/` — not API routes.

---

## Running Tests

```bash
just test          # all tests
just test-cov      # with coverage report
```

Tests run against a real database (no mocks). Make sure `just dev` is running and `just migrate` has been applied before running tests.

---

## Submitting a Pull Request

1. Fork the repo and create a branch from `main`.
2. Make your changes and add tests for new behaviour.
3. Run `just lint`, `just fmt`, and `just test` — all must pass.
4. Open a pull request with a clear description of what changed and why.
