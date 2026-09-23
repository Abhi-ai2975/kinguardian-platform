# FileNest — Server-Side Component Skill

## Purpose
Build and scaffold **server-side components** for the FileNest platform.
Covers: FastAPI backend (clean architecture), Next.js console app server layer
(server actions, server components, route handlers, webhooks), Node.js SDK, Python SDK.

## When to invoke
- Adding a new FastAPI endpoint, service method, or repository method
- Adding a new Next.js server action, server component, or route handler
- Adding a new domain to the console app (entities → service → use cases → controllers → actions)
- Wiring up auth, NATS events, audit logging, or processing pipelines

---

## Console App — Next.js Modules Architecture

The console app (`frontend/web/src/modules/`) follows a strict clean-architecture layering.
**Dependency direction is one-way:** presentation → core → infrastructure → external API.

```
modules/
├── entities/                          # Framework-free Zod schemas (safe in browser + server)
│   └── schemas/
│       ├── transport/
│       │   └── index.ts              # TransportOptionsSchema — imported by every actions.ts
│       └── {domain}/                 # One subdirectory per domain (project/, file/, org/, …)
│           ├── response.ts           # Zod schemas for API response shapes
│           ├── input.ts              # Zod schemas for mutations (form + controller validation)
│           ├── actions.ts            # ZSA action envelope schemas (payload + transportOptions)
│           ├── forms.ts              # Flat React Hook Form schemas (may differ from input.ts)
│           └── index.ts              # Barrel export — import from here, never from sub-files
│
└── server/
    ├── auth/                          # getServerSession(), session types
    ├── presentation/
    │   └── actions/
    │       ├── procedures.ts          # authenticatedProcedure (ZSA gate — checks session)
    │       └── {domain}.actions.ts    # ZSA actions — thin: gate + runWithTransport + controller call
    ├── core/
    │   └── {domain}/
    │       ├── domain/
    │       │   └── interfaces/
    │       │       └── {domain}.service.interface.ts   # IXxxService — use cases depend on this
    │       ├── application/
    │       │   └── usecases/
    │       │       ├── listXxx.usecase.ts              # getInjection("IXxxService").list()
    │       │       ├── createXxx.usecase.ts
    │       │       ├── updateXxx.usecase.ts
    │       │       └── deleteXxx.usecase.ts
    │       ├── infrastructure/
    │       │   └── services/
    │       │       └── {domain}.rest.service.ts        # Implements IXxxService via filenestApi
    │       └── interface-adapters/
    │           └── controllers/
    │               ├── listXxx.controller.ts           # validate input → use case → presenter
    │               ├── createXxx.controller.ts
    │               ├── updateXxx.controller.ts
    │               ├── deleteXxx.controller.ts
    │               └── index.ts                        # Barrel export
    ├── di/
    │   ├── types.ts                   # DI_SYMBOLS + DI_RETURN_TYPES
    │   ├── container.ts               # ApplicationContainer + getInjection()
    │   └── modules/
    │       ├── index.ts               # Barrel of all registerXxxModule()
    │       └── {domain}/
    │           └── {domain}.module.ts # container.bind(DI_SYMBOLS.IXxxService).toClass(XxxRestService)
    ├── shared/
    │   └── errors/
    │       ├── schema-parse-error.ts              # InputParseError, OutputParseError (wrap ZodError)
    │       └── mappers/
    │           ├── zsa-error-codes.ts             # ZSA_ERROR_CODES constants
    │           ├── zsa-error-handling.ts          # throwZSAErrorFromStatus(status, message)
    │           └── map-error-to-zsa.ts            # mapErrorToZSA(err) + ApiError class
    └── utils/
        ├── api-client.ts              # filenestApi<T>(path, options?) — typed fetch to backend
        └── run-with-transport.ts      # runWithTransport() — revalidatePath/redirect + error mapping
```

---

## Naming Conventions

| Pattern | Naming | Example |
|---|---|---|
| Calls external REST API | `{domain}.rest.service.ts` / `XxxRestService` / `IXxxService` | `project.rest.service.ts` |
| Direct DB/ORM access (Prisma/SQLAlchemy) | `{domain}.repository.ts` / `XxxRepository` / `IXxxRepository` | _(backend Python only)_ |

**Rule:** if it calls `filenestApi` (HTTP), it is a **service**. If it queries Prisma/SQLAlchemy directly, it is a **repository**.

---

## Runtime Call Chain

```
RSC page  /  client component
  └─► {domain}Action()                    ZSA gate (authenticatedProcedure) + runWithTransport
        └─► {operation}Controller()       validate input (InputParseError) → use case → presenter (OutputParseError)
              └─► {operation}UseCase()    getInjection("IXxxService") → service.method()
                    └─► XxxRestService    filenestApi("/v1/...") → Zod parse response
```

---

## Adding a New Domain — Step-by-step

### 1. Entity schemas — `entities/schemas/{domain}/`

```typescript
// response.ts — what the backend returns
export const XxxSchema = z.object({ id: z.string(), name: z.string(), /* … */ });
export type TXxx = z.infer<typeof XxxSchema>;
export const XxxListSchema = z.object({ items: z.array(XxxSchema), total: z.number() });
export type TXxxList = z.infer<typeof XxxListSchema>;

// input.ts — what forms/controllers validate
export const CreateXxxSchema = z.object({ name: z.string().min(1), /* … */ });
export type TCreateXxx = z.infer<typeof CreateXxxSchema>;

// actions.ts — ZSA envelope (payload + transportOptions on EVERY action)
export const CreateXxxActionSchema = z.object({
  payload: CreateXxxSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreateXxxAction = z.infer<typeof CreateXxxActionSchema>;

// index.ts — barrel
export * from "./response";
export * from "./input";
export * from "./actions";
export * from "./forms";
```

**Rule:** `transportOptions` is present on **every** action schema — reads included — so any action can trigger revalidation.

### 2. Domain interface — `core/{domain}/domain/interfaces/{domain}.service.interface.ts`

```typescript
export interface IXxxService {
  list(): Promise<TXxxList>;
  create(dto: TCreateXxx): Promise<TXxx>;
  update(id: string, dto: TUpdateXxx): Promise<TXxx>;
  delete(id: string): Promise<void>;
}
```

### 3. REST service — `core/{domain}/infrastructure/services/{domain}.rest.service.ts`

```typescript
"server-only";
export class XxxRestService implements IXxxService {
  async list(): Promise<TXxxList> {
    const raw = await filenestApi<unknown>("/v1/xxxs");
    const parsed = XxxListSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
  async create(dto: TCreateXxx): Promise<TXxx> {
    const raw = await filenestApi<unknown>("/v1/xxxs", {
      method: "POST",
      body: JSON.stringify(dto),
    });
    const parsed = XxxSchema.safeParse(raw);
    if (!parsed.success) throw new OutputParseError(parsed.error);
    return parsed.data;
  }
  // update, delete follow same pattern
}
```

### 4. Use cases — `core/{domain}/application/usecases/`

```typescript
// listXxx.usecase.ts
"server-only";
export async function listXxxUseCase(): Promise<TXxxList> {
  const service = getInjection("IXxxService");
  return service.list();
}
```

### 5. Controllers — `core/{domain}/interface-adapters/controllers/`

```typescript
// createXxx.controller.ts
"server-only";
function presenter(data: TXxx): TXxx { return data; }
export type TCreateXxxControllerOutput = ReturnType<typeof presenter>;

export async function createXxxController(input: unknown): Promise<TCreateXxxControllerOutput> {
  const parsed = await CreateXxxSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createXxxUseCase(parsed.data);
  return presenter(data);
}
```

Always export a barrel `index.ts` from the controllers folder.

### 6. DI wiring

```typescript
// di/modules/{domain}/{domain}.module.ts
export function registerXxxModule(container: Container): void {
  container.bind(DI_SYMBOLS.IXxxService).toClass(XxxRestService);
}

// di/types.ts — add entry:
export const DI_SYMBOLS = { /* existing… */ IXxxService: Symbol.for("IXxxService") };
export interface DI_RETURN_TYPES { /* existing… */ IXxxService: IXxxService; }

// di/modules/index.ts — add export:
export { registerXxxModule } from "./{domain}/{domain}.module";

// di/container.ts — add registration:
registerXxxModule(ApplicationContainer);
```

### 7. Server action — `presentation/actions/{domain}.actions.ts`

```typescript
"use server";
export const listXxxAction = authenticatedProcedure
  .createServerAction()
  .input(ListXxxActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TListXxxAction }) => {
    return await runWithTransport<TListXxxControllerOutput>(async () => {
      const data = await listXxxController();
      return { result: data, transport: input.transportOptions };
    });
  });

export const createXxxAction = authenticatedProcedure
  .createServerAction()
  .input(CreateXxxActionSchema, { skipInputParsing: true })
  .handler(async ({ input }: { input: TCreateXxxAction }) => {
    return await runWithTransport<TCreateXxxControllerOutput>(async () => {
      const data = await createXxxController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
```

---

## Key files — server utilities

| File | Purpose |
|---|---|
| `server/utils/api-client.ts` | `filenestApi<T>(path, options?)` — reads `FILENEST_API_URL` + `FILENEST_API_KEY`, throws `ApiError(status, message)` on non-2xx |
| `server/utils/run-with-transport.ts` | Wraps action executor; on success runs `revalidatePath`/`redirect`; on error calls `mapErrorToZSA` |
| `server/shared/errors/schema-parse-error.ts` | `InputParseError` / `OutputParseError` — wrap `ZodError` into typed error classes |
| `server/shared/errors/mappers/map-error-to-zsa.ts` | `mapErrorToZSA(err)` — converts `InputParseError`, `OutputParseError`, `ApiError` → `ZSAError`; re-throws Next.js control errors untouched |
| `server/shared/errors/mappers/zsa-error-handling.ts` | `throwZSAErrorFromStatus(status, message)` — maps HTTP status codes → `ZSAError` codes |
| `server/di/container.ts` | `getInjection(symbol)` — typed DI lookup used by use cases |
| `server/presentation/actions/procedures.ts` | `authenticatedProcedure` — ZSA gate, calls `getServerSession()`, throws `NOT_AUTHORIZED` if no session |

---

## Error pipeline (end-to-end)

```
filenestApi()          throws ApiError(statusCode, message) on non-2xx
  ↓
runWithTransport()     catch → mapErrorToZSA(err)
  ↓
mapErrorToZSA()        ApiError      → throwZSAErrorFromStatus(status)
                       InputParseError → ZSAError("INPUT_PARSE_ERROR", { fieldErrors })
                       OutputParseError → ZSAError("OUTPUT_PARSE_ERROR")
                       Next.js redirect/notFound → re-thrown unchanged
  ↓ (client mutations only)
handleZSAError()       INPUT_PARSE_ERROR → form.setError() per field
                       NOT_AUTHORIZED / FORBIDDEN / NOT_FOUND / CONFLICT → toast
                       fallback → toast
```

Client import: `@/modules/client/shared/error/handle-zsa-error`

---

## Consuming actions in RSC pages

```tsx
// Server component — await action directly (no useServerAction hook needed)
const [data] = await listProjectsAction({});
const projects = data?.items ?? [];
```

## Consuming actions in client components

```tsx
"use client";
import { useServerAction } from "zsa-react";
import { createProjectAction } from "@/modules/server/presentation/actions/project.actions";
import { handleZSAError } from "@/modules/client/shared/error/handle-zsa-error";

const { execute, isPending } = useServerAction(createProjectAction, {
  onSuccess: () => toast.success("Project created"),
  onError: ({ err }) => handleZSAError({ err, form, fallbackMessage: "Failed to create project" }),
});

await execute({
  payload: { name, storage_mode, storage_provider },
  transportOptions: { shouldRevalidate: true, url: "/projects" },
});
```

---

## FastAPI Backend — Clean Architecture

```
backend/app/
├── main.py              # FastAPI factory + lifespan
├── core/                # config, db, logging, messaging (outbox)
├── auth/                # TenantContext, authenticate_request, require_scope
├── errors/              # FileNestError hierarchy + exception handlers
├── models/              # SQLAlchemy ORM models
├── schemas/             # Pydantic request/response DTOs
├── repositories/        # All DB queries — tenant-scoped, no business logic
├── services/            # All business logic — coordinates repo + storage + events
├── storage/             # StorageProvider protocol, S3 impl, StorageResolver
└── routers/             # HTTP handlers — validate, call service, return schema
```

**Dependency rule:** routers → services → repositories → DB. No layer skips another.

### Auth

```python
# Every route uses Depends(require_scope("scope:name"))
@router.post("/projects/{project_id}/files/upload", response_model=UploadInitResponse)
async def init_upload(
    project_id: str,
    body: UploadInitRequest,
    svc: FileService = Depends(_get_service),
) -> UploadInitResponse:
    require_scope(svc._ctx, "files:upload")
    return await svc.init_upload(body)
```

Token prefixes: `fn_live_` / `fn_test_` (API key), `fn_sa_` (service account), `fn_upload_token_` (browser upload)

Scopes: `files:upload`, `files:download`, `files:read`, `files:delete`, `files:update_metadata`,
`projects:read`, `projects:update`, `api_keys:create`, `api_keys:revoke`, `audit:read`, `compliance:manage`

### Repository pattern (Python — direct DB access)

```python
class ProjectRepository:
    async def list(self, organization_id: str) -> list[Project]:
        result = await self.db.execute(
            select(Project)
            .where(Project.organization_id == organization_id, Project.deleted_at.is_(None))
        )
        return list(result.scalars().all())

    async def create(self, project: Project) -> Project:
        self.db.add(project)
        await self.db.flush()   # get DB-assigned id; session context manager commits
        return project
```

### Exceptions — raise these, never raw HTTP

```python
from app.errors import (
    FileNotFoundError,        # → 404
    AuthenticationError,      # → 401
    AuthorizationError,       # → 403
    MetadataValidationError,  # → 422
    WORMViolationError,       # → 409
    LegalHoldViolationError,  # → 409
    FileTooLargeError,        # → 413
    FileQuarantinedError,     # → 409
)
```

### Transactional outbox (events)

```python
# Write to outbox_messages in the SAME transaction as the business op.
# OutboxWorker publishes to NATS separately — never call NATS directly.
await self.outbox.publish(
    subject=f"filenest.{ctx.organization_id}.{ctx.project_id}.file.uploaded",
    payload={"file_id": str(file.id), "filename": file.filename},
    db=self.db,
)
```

### Structured logging

```python
import structlog
logger = structlog.get_logger()

# Always include tenant context
logger.info("file.uploaded",
    file_id=str(file.id),
    organization_id=ctx.organization_id,
    project_id=ctx.project_id,
)
```

---

## Key rules (all layers)

1. **Action is thin** — ZSA gate + `runWithTransport` + one controller call. No business logic, no filenestApi calls.
2. **Controller validates input** — `Schema.safeParseAsync(input)` → `InputParseError`; then use case; then presenter → `OutputParseError`.
3. **Use case coordinates** — calls `getInjection("IXxxService")`; no HTTP, no Zod, no business logic beyond coordination.
4. **Service calls the API** — `filenestApi` calls + response `safeParse` + `OutputParseError` on drift.
5. **`transportOptions` on every action schema** — present by default, even for reads.
6. **`skipInputParsing: true`** on all `.input()` calls — controller handles Zod validation, not ZSA.
7. **Repository = DB access (Python)** — always include `organization_id` + `project_id` in every query.
8. **Service = external API call (TypeScript)** — `XxxRestService` implements `IXxxService` via `filenestApi`.
9. **Outbox for all events (Python)** — never publish to NATS directly from a service method.
10. **Audit every mutation (Python)** — upload, delete, download, legal-hold, WORM, metadata-update.
