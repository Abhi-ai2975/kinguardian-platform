# FileNest

**Enterprise file infrastructure as a service.** FileNest sits between your application and cloud storage, handling uploads, virus scanning, MIME validation, search, webhooks, and compliance — so you don't have to build any of it yourself.

Think of it as **Stripe for files**: you integrate a few SDK calls, FileNest handles the rest.

---

## What It Does

| Capability | Details |
|---|---|
| **Upload** | Single-file and resumable multipart uploads. Browser-safe presigned URLs with per-project CORS. |
| **Processing** | Automatic virus scanning (ClamAV), MIME type validation, file classification — all async, never blocks your upload response. |
| **Storage** | S3, MinIO, RustFS, Azure Blob, GCS, Cloudflare R2 — or bring your own bucket. |
| **Search** | OpenSearch-backed full-text search with filters, facets, and metadata queries. |
| **Webhooks** | HMAC-SHA256 signed event delivery (Stripe-style) on every file state change. |
| **Compliance** | WORM, legal hold, retention policies, HIPAA/GDPR configuration-driven per project. |
| **Multi-tenancy** | Every query, log line, and event is scoped to `organization_id + project_id`. Nothing leaks across tenants. |
| **SDKs** | Node.js, React, Next.js, Python — all first-class. |

---

## System Architecture

Three separate deployments that talk to each other:

```
┌─────────────────────────────────────────────────────────────┐
│  iam/  — FileNest IAM                                       │
│  BetterAuth · Prisma · PostgreSQL                           │
│  OAuth 2.1 / OIDC server · user & org management · API keys│
└────────────────────────┬────────────────────────────────────┘
                         │  OAuth 2.1 PKCE
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  frontend/web  — FileNest Console                           │
│  Next.js 16 · React 19 · shadcn/ui · @filenest/react       │
│  Projects · file explorer · API keys · webhooks · usage     │
└────────────────────────┬────────────────────────────────────┘
                         │  REST API  (Bearer token)
                         ▼
┌─────────────────────────────────────────────────────────────┐
│  backend/  — FileNest API                                   │
│  FastAPI · PostgreSQL · Redis · NATS JetStream · OpenSearch │
│  All file operations, processing pipeline, webhooks         │
└─────────────────────────────────────────────────────────────┘
```

### How a File Goes from Upload to Ready

```
Your app uploads a file
      ↓
FastAPI saves it to object storage → sets status = "processing"
      ↓
Outbox writes file.uploaded event (same DB transaction — never lost)
      ↓
OutboxWorker publishes to NATS JetStream
      ↓
ProcessingWorker picks it up instantly (push consumer)
      ↓
  ┌── VirusScanStage    → ClamAV scans the bytes
  ├── MimeValidation    → libmagic confirms declared type matches actual bytes
  └── Classification    → .jpg → "image", .pdf → "document", etc.
      ↓
status = "ready" written to DB
      ↓
WebhookWorker delivers file.ready event to your endpoints (signed, retried)
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| IAM | BetterAuth v1.5, Prisma v7, PostgreSQL 16 |
| Console | Next.js 16, React 19, Tailwind CSS v4, shadcn/ui, TanStack Query & Table |
| Backend language | Python 3.12, async-first |
| Backend framework | FastAPI + Pydantic v2 |
| ORM / Migrations | SQLAlchemy 2.x (async) + Alembic |
| Database | PostgreSQL 16 |
| Cache | Redis 7 |
| Message broker | NATS JetStream |
| Search | OpenSearch 2 |
| Object storage | RustFS / MinIO (local) · S3 · Azure · GCS · R2 |
| Virus scanning | ClamAV |
| SDKs | TypeScript (Node, React, Next.js) · Python |

---

## Monorepo Layout

```
filenest/
├── iam/                 # BetterAuth IAM — OAuth 2.1 server, API key management
├── backend/             # FastAPI API — all file infrastructure logic
│   ├── app/
│   │   ├── core/        # config, database, logging, NATS, outbox
│   │   ├── auth/        # token verification, tenant context, scopes
│   │   ├── models/      # SQLAlchemy ORM models
│   │   ├── repositories/# DB access layer (always tenant-scoped)
│   │   ├── services/    # business logic
│   │   ├── storage/     # StorageProvider protocol + S3/MinIO/RustFS/Azure/GCS/R2
│   │   ├── processing/  # pipeline stages: virus scan, MIME validation, classification
│   │   ├── workers/     # NATS consumers: ProcessingWorker, WebhookWorker
│   │   └── routers/     # HTTP handlers (thin — delegate to services)
│   └── migrations/      # Alembic migration versions
├── frontend/
│   └── web/             # Next.js console app
├── sdks/
│   ├── core/            # @filenest/core — shared HTTP client + types
│   ├── node/            # @filenest/node — server-side Node.js SDK
│   ├── react/           # @filenest/react — components + hooks
│   ├── nextjs/          # @filenest/nextjs — server utilities
│   └── python/          # filenest — Python SDK (sync + async)
├── examples/
│   ├── nextjs-sdk/      # Full Next.js demo app
│   ├── node-sdk/        # Express + @filenest/node
│   ├── react-sdk/       # Vite + @filenest/react
│   └── python-sdk/      # FastAPI + filenest
├── docker-compose.yml   # Local stack: PostgreSQL × 2, Redis, RustFS, NATS, ClamAV
└── justfile             # Dev commands
```

---

## Local Development

### Prerequisites

- [Docker](https://www.docker.com/) + Docker Compose
- [Python 3.12+](https://www.python.org/) + [uv](https://github.com/astral-sh/uv)
- [Node.js 20+](https://nodejs.org/) + [pnpm](https://pnpm.io/)
- [just](https://github.com/casey/just) (command runner)

### 1. Start the local infrastructure

```bash
docker compose up -d
```

This starts PostgreSQL (×2), Redis, RustFS, NATS JetStream, and ClamAV.

> **ClamAV takes 1–3 minutes to load its virus database on first start.** Watch `docker compose logs -f clamav` and wait for `socket found, clamd started` before uploading files.

### 2. Backend

```bash
cp backend/.env.example backend/.env   # fill in values
just migrate                           # run Alembic migrations
just seed-dev                          # create a dev project + API key
just backend                           # start FastAPI on :8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

> **Windows users:** Run the backend from **PowerShell**, not Git Bash. Git Bash has a thread-buffer limit that causes fatal crashes when concurrent file scans run.

### 3. IAM

```bash
cp iam/.env.example iam/.env
cd iam && pnpm install && pnpm dev     # starts on :3001
```

### 4. Console app

```bash
cp frontend/web/.env.example frontend/web/.env
just frontend                          # starts on :3000
```

### Useful `just` commands

```bash
just backend          # FastAPI hot-reload
just frontend         # Next.js dev server
just migrate          # apply pending migrations
just migration "name" # generate new migration from model diff
just seed-dev         # seed dev DB
just reset            # wipe Docker volumes and start fresh
```

---

## SDK Quick Start

### Node.js

```typescript
import { FileNest } from "@filenest/node";

const client = new FileNest({ apiKey: "fn_live_...", projectId: "..." });

// Upload a file
const file = await client.files.upload({
  filename: "report.pdf",
  data: fs.createReadStream("./report.pdf"),
  mimeType: "application/pdf",
});

console.log(file.status); // "processing" → becomes "ready" via webhook
```

### React

```tsx
import { FileNestProvider, FileUpload } from "@filenest/react";

function App() {
  return (
    <FileNestProvider tokenEndpoint="/api/filenest-token" projectId="...">
      <FileUpload
        variant="dropzone"
        accept={{ "image/*": [], "application/pdf": [] }}
        onComplete={(file) => console.log("Ready:", file.id)}
      />
    </FileNestProvider>
  );
}
```

### Python

```python
from filenest import AsyncFileNest

async with AsyncFileNest(api_key="fn_live_...", project_id="...") as client:
    file = await client.files.upload(
        filename="data.csv",
        data=open("data.csv", "rb").read(),
        mime_type="text/csv",
    )
```

### Verify a webhook

```typescript
import { verifyWebhookSignature } from "@filenest/nextjs/server";

export async function POST(req: Request) {
  const body = await req.text();
  const signature = req.headers.get("x-filenest-signature") ?? "";
  const valid = verifyWebhookSignature(body, signature, process.env.WEBHOOK_SECRET!);
  if (!valid) return new Response("Unauthorized", { status: 401 });
  // handle event...
}
```

---

## API Keys

Keys are issued by the IAM and verified by the backend. All keys start with `fn_`:

| Prefix | Type | Use |
|---|---|---|
| `fn_live_...` | Live API key | Server-to-server production calls |
| `fn_test_...` | Test API key | Development and CI |
| `fn_sa_...` | Service account | Background jobs, machine-to-machine |
| `fn_upload_token_...` | Short-lived upload token | Browser-side direct uploads |

---

## Events (Webhooks)

FileNest delivers signed events to your endpoints on every file state change:

| Event | Fired when |
|---|---|
| `file.uploaded` | File saved to storage, processing starting |
| `file.ready` | All pipeline stages passed |
| `file.processing_failed` | MIME mismatch or pipeline error |
| `file.quarantined` | Virus detected by ClamAV |
| `file.deleted` | File deleted |

Signature format (same as Stripe):
```
X-FileNest-Signature: t=1234567890,v1=<hmac-sha256-hex>
```

---

## Build Status (Phases)

| Phase | Description | Status |
|---|---|---|
| 1 — Foundation | Auth, single-file upload to S3, basic file CRUD | ✅ Complete |
| 2 — Processing & Events | Virus scan, MIME validation, NATS, webhooks, multipart | ✅ Complete |
| 3 — Metadata & Search | Custom schemas, folders, tags, OCR, OpenSearch | 🔲 Planned |
| 4 — Console App | Next.js OAuth client, file explorer, API key management | ✅ Complete |
| 5 — SDKs | `@filenest/node`, `@filenest/react`, `@filenest/nextjs`, `filenest` Python | 🔄 In Progress |
| 6 — Production | Kubernetes, observability, rate limiting, usage metering | 🔲 Planned |
| 7 — Advanced | All storage providers, previews, sharing, bulk ops, semantic search | 🔲 Planned |
| 8 — Compliance | HIPAA, GDPR, WORM, legal hold, PHI detection, FHIR | 🔲 Planned |

---

## Documentation

Engineering specs live in [`dev-docs/`](./dev-docs/):

| Document | Covers |
|---|---|
| `00_Implementation_Roadmap.md` | Phase-by-phase build order |
| `02_System_Architecture.md` | Service map, data flows |
| `03_Database_Design.md` | Full schema |
| `04_Backend_Architecture.md` | FastAPI internals |
| `05_API_Specification.md` | REST endpoints |
| `06_SDK_Specification.md` | All SDK APIs |
| `11_Event_Architecture.md` | NATS streams and subjects |
| `13_Processing_Pipelines.md` | Stage registry, virus scan, OCR |
| `Processing_Pipeline_Internals_and_Bug_History.md` | How the pipeline works + every bug fixed |

---

## License

Private — all rights reserved.
