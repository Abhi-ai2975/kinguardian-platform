---
name: server-module
description: "Scaffold a new clean-architecture server module (domain → infra → usecases → controllers → DI → server actions) for the drgodly project. Supports both REST (default) and GraphQL transports via DI switching."
trigger: /server-module
---

# /server-module

Scaffold a complete server module following clean architecture + ioctopus DI, matching the organization module pattern.

## Usage

```
/server-module <resource>
```

Examples: `/server-module appointment` · `/server-module encounter` · `/server-module vitals`

---

## Architecture

```
Client (useServerAction)
  → Server Action  [presentation/actions/<resource>/<resource>.actions.ts]
    → runWithTransport()
      → Controller  [core/<resource>/interface-adapters/controllers/]
        → safeParseAsync input
        → Use Case  [core/<resource>/application/usecases/]
          → getInjection("I<Resource>sService")
            → Service (REST or GraphQL — resolved by DI)
              → axios instance → request interceptor → JWT via getAuthToken()
```

---

## File Structure

```
src/modules/
├── entities/schemas/<resource>/
│   ├── response.ts              ← response + paginated schemas
│   ├── input.ts                 ← validation schemas + DTO types
│   ├── actions.ts               ← ZSA action schemas
│   ├── forms.ts                 ← React Hook Form schemas (written by /client-module)
│   └── index.ts                 ← barrel: re-exports all sub-files
│
└── server/
    ├── di/
    │   ├── types.ts                   ← ADD symbol + return type (EDIT)
    │   ├── container.ts               ← ADD register call (EDIT)
    │   └── modules/
    │       ├── index.ts               ← ADD export (EDIT)
    │       └── <resource>/
    │           └── <resource>.module.ts
    │
    ├── core/<resource>/
    │   ├── domain/interfaces/
    │   │   └── <resource>.service.interface.ts
    │   ├── infrastructure/services/
    │   │   ├── <resource>.rest.service.ts         ← simple: all methods here (≤5 methods)
    │   │   ├── <resource>.graphql.service.ts      ← stub (placeholder)
    │   │   └── rest/                              ← only when sub-resources exist (>5 methods)
    │   │       ├── <resource>.rest.errors.ts      ← shared handleError function
    │   │       ├── <resource>.core.rest.service.ts
    │   │       └── <resource>.<subresource>.rest.service.ts  ← one file per sub-resource group
    │   ├── application/usecases/
    │   │   └── <operation>.usecase.ts        ← one file per operation
    │   └── interface-adapters/controllers/
    │       ├── index.ts
    │       └── <operation>.controller.ts     ← one file per operation
    │
    └── presentation/actions/<resource>/
        ├── core.actions.ts              ← core CRUD (create, list, getById, update, delete, getMe)
        ├── <subresource>.actions.ts     ← one file per sub-resource group (4 actions each)
        └── index.ts                     ← barrel: re-exports all action files
```
> **Simple resources (≤5 methods):** use a single `<resource>.actions.ts` + no `index.ts` needed.
> **Sub-resource resources (>5 methods):** always split into `core.actions.ts` + one file per sub-resource + `index.ts` barrel.

---

## Step 1 — Explore the source API

Read the source API project (orchestrator or fhir-gql) to find:
- All HTTP endpoints (method + path)
- Request/response payload shapes — check Python Pydantic models for exact field nullability
- Required permissions/auth

---

## Step 2 — `entities/schemas/<resource>/` (split into files)

**Never put everything in one schema file.** Split into focused files and barrel-export from `index.ts`. All imports elsewhere always use the barrel path `@/modules/entities/schemas/<resource>` — never from sub-files directly.

### `response.ts`

```typescript
import { z } from "zod";
// Use .nullish() (not .optional()) — the API returns explicit JSON null, not missing keys.

export const <Resource>ResponseSchema = z.object({
  id: z.number(),
  name: z.string().nullish(),
  // ... all other optional fields use .nullish()
});
export type T<Resource>Response = z.infer<typeof <Resource>ResponseSchema>;

export const Paginated<Resource>ResponseSchema = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  data: z.array(<Resource>ResponseSchema),
});
export type TPaginated<Resource>Response = z.infer<typeof Paginated<Resource>ResponseSchema>;
```

### `input.ts`

```typescript
import { z } from "zod";

export const Create<Resource>ValidationSchema = z.object({ /* ... */ });
export type TCreate<Resource> = z.infer<typeof Create<Resource>ValidationSchema>;

const Update<Resource>BaseSchema = z.object({ /* patchable fields only */ });
export const Update<Resource>DtoSchema = Update<Resource>BaseSchema;
export type TUpdate<Resource>Dto = z.infer<typeof Update<Resource>DtoSchema>;

export const Update<Resource>ValidationSchema = Update<Resource>BaseSchema.extend({ id: z.number() });
export type TUpdate<Resource> = z.infer<typeof Update<Resource>ValidationSchema>;

export const List<Resource>sValidationSchema = z.object({
  limit: z.number().optional(),
  offset: z.number().optional(),
});
export type TList<Resource>sQuery = z.infer<typeof List<Resource>sValidationSchema>;

export const GetById<Resource>ValidationSchema = z.object({ id: z.number() });
export type TGetById<Resource> = z.infer<typeof GetById<Resource>ValidationSchema>;

export const Delete<Resource>ValidationSchema = z.object({ id: z.number() });
export type TDelete<Resource> = z.infer<typeof Delete<Resource>ValidationSchema>;
```

### `actions.ts`

```typescript
import { z } from "zod";
import { TransportOptionsSchema } from "@/modules/entities/schemas/transport";
// Import validation schemas from input.ts via relative path — avoids circular barrel import.
import {
  Create<Resource>ValidationSchema,
  Update<Resource>ValidationSchema,
  List<Resource>sValidationSchema,
  GetById<Resource>ValidationSchema,
  Delete<Resource>ValidationSchema,
} from "./input";

// Mutating ops include transportOptions; reads do not.
export const Create<Resource>ActionSchema = z.object({
  payload: Create<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TCreate<Resource>Action = z.infer<typeof Create<Resource>ActionSchema>;

export const List<Resource>sActionSchema = z.object({
  payload: List<Resource>sValidationSchema.optional(),
});
export type TList<Resource>sAction = z.infer<typeof List<Resource>sActionSchema>;

export const GetById<Resource>ActionSchema = z.object({
  payload: GetById<Resource>ValidationSchema,
});
export type TGetById<Resource>Action = z.infer<typeof GetById<Resource>ActionSchema>;

export const Update<Resource>ActionSchema = z.object({
  payload: Update<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TUpdate<Resource>Action = z.infer<typeof Update<Resource>ActionSchema>;

export const Delete<Resource>ActionSchema = z.object({
  payload: Delete<Resource>ValidationSchema,
  transportOptions: TransportOptionsSchema.optional(),
});
export type TDelete<Resource>Action = z.infer<typeof Delete<Resource>ActionSchema>;
```

### `forms.ts` (stub — written by `/client-module`)

```typescript
import { z } from "zod";
// Flat UI schemas for React Hook Form.
// The modal maps flat form values to the nested API payload before calling the action.

export const Create<Resource>FormSchema = z.object({ /* flat fields */ });
export type TCreate<Resource>FormSchema = z.infer<typeof Create<Resource>FormSchema>;

export const Edit<Resource>FormSchema = z.object({ /* flat patchable fields */ });
export type TEdit<Resource>FormSchema = z.infer<typeof Edit<Resource>FormSchema>;
```

### `index.ts` (barrel — always re-exports all sub-files)

```typescript
export * from "./response";
export * from "./input";
export * from "./actions";
export * from "./forms";
```

---

## Step 3 — Domain interface

Naming convention: **plural** (`I<Resource>sService`, not `I<Resource>Service`).

```typescript
// domain/interfaces/<resource>.service.interface.ts
export interface I<Resource>sService {
  create(dto: TCreate<Resource>): Promise<T<Resource>Response>;
  list(query?: TList<Resource>sQuery): Promise<TPaginated<Resource>Response>;
  getById(id: number): Promise<T<Resource>Response>;
  update(id: number, dto: TUpdate<Resource>Dto): Promise<T<Resource>Response>;
  delete(id: number): Promise<void>;
}
```

---

## Step 4 — Services (REST + GraphQL stub)

**Decide the service structure first based on method count:**

| Methods | Structure |
|---|---|
| ≤ 5 (core CRUD only, no sub-resources) | Single `<resource>.rest.service.ts` — all methods inline |
| > 5 (has sub-resource groups) | Shell + `rest/` delegation subfolder (see "Sub-resource delegation" below) |

Create **two files** minimum (REST + GraphQL stub). The DI module selects between them via `FHIR_TRANSPORT`.

### `<resource>.rest.service.ts` — simple (≤5 methods)

```typescript
/**
 * <Resource>RestApiService — REST transport implementation of I<Resource>sService.
 * Transport: REST  (bound when FHIR_TRANSPORT !== "graphql")
 * For GraphQL transport, see <resource>.graphql.service.ts.
 */
import { randomUUID } from "crypto";
import axios, { AxiosError, AxiosInstance } from "axios";
import { getAuthToken } from "@/modules/server/auth/jwt-token";
import { logOperation } from "@/modules/server/config/logger/log-operation";
import { BadGatewayError, ConflictError, ForbiddenError, NotFoundError,
         RateLimitError, UnauthorizedError, ValidationError }
  from "@/modules/server/shared/errors/commonErrors";
import { I<Resource>sService } from "../../domain/interfaces/<resource>.service.interface";

export class <Resource>RestApiService implements I<Resource>sService {
  private readonly client: AxiosInstance;

  constructor() {
    const url = process.env.ORCHESTRATOR_API_URL; // or FHIR_GQL_URL for fhir-gql resources
    if (!url) throw new Error("ORCHESTRATOR_API_URL is not configured");
    this.client = axios.create({
      baseURL: `${url}/<resource-path>`,
      headers: { "Content-Type": "application/json" },
      timeout: 10_000,
    });
    this.client.interceptors.request.use(async (config) => {
      const token = await getAuthToken();
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    });
  }

  /**
   * Maps AxiosError → domain error. Always throws (return type: never).
   * 400→ValidationError  401→UnauthorizedError  403→ForbiddenError
   * 404→NotFoundError    409→ConflictError       429→RateLimitError  5xx→BadGatewayError
   */
  private handleError(error: AxiosError): never {
    const body = error.response?.data as Record<string, unknown> | undefined;
    const message = typeof body?.message === "string"
      ? body.message : (error.response?.statusText ?? error.message);
    switch (error.response?.status) {
      case 400: throw new ValidationError(message);
      case 401: throw new UnauthorizedError(message);
      case 403: throw new ForbiddenError(message);
      case 404: throw new NotFoundError(message);
      case 409: throw new ConflictError(message);
      case 429: throw new RateLimitError(message);
      default:  throw new BadGatewayError(`API error ${error.response?.status ?? "unknown"}: ${message}`);
    }
  }

  async create(dto: TCreate<Resource>): Promise<T<Resource>Response> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "<Resource>RestApiService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/", dto);
      const data = await <Resource>ResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "<Resource>RestApiService.create", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "<Resource>RestApiService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) this.handleError(err);
      throw err;
    }
  }
  // list, getById, update, delete — same try/catch/log pattern.
}
```

### `<resource>.graphql.service.ts` — stub (placeholder)

```typescript
/**
 * <Resource>GraphQLService — GraphQL transport stub for I<Resource>sService.
 * Not yet implemented. Bound when FHIR_TRANSPORT=graphql.
 * Set FHIR_TRANSPORT=rest (default) to use the REST implementation.
 */
export class <Resource>GraphQLService implements I<Resource>sService {
  async create(_dto: TCreate<Resource>): Promise<T<Resource>Response> {
    throw new Error("<Resource>GraphQLService.create is not yet implemented. Set FHIR_TRANSPORT=rest.");
  }
  async list(_query?: TList<Resource>sQuery): Promise<TPaginated<Resource>Response> {
    throw new Error("<Resource>GraphQLService.list is not yet implemented.");
  }
  async getById(_id: number): Promise<T<Resource>Response> {
    throw new Error("<Resource>GraphQLService.getById is not yet implemented.");
  }
  async update(_id: number, _dto: TUpdate<Resource>Dto): Promise<T<Resource>Response> {
    throw new Error("<Resource>GraphQLService.update is not yet implemented.");
  }
  async delete(_id: number): Promise<void> {
    throw new Error("<Resource>GraphQLService.delete is not yet implemented.");
  }
}
```

### Sub-resource delegation pattern (>5 methods)

When a resource has sub-resource groups (e.g. names, addresses, contacts), the REST service is split into a shell + `rest/` subfolder. The shell wires everything; all HTTP logic lives in the sub-files.

**`rest/<resource>.rest.errors.ts`** — shared error mapper (no `this` dependency, plain function):
```typescript
import { AxiosError } from "axios";
// ... domain error imports

export function handle<Resource>ApiError(error: AxiosError): never {
  const body = error.response?.data as Record<string, unknown> | undefined;
  const message = typeof body?.detail === "string"
    ? body.detail : (error.response?.statusText ?? error.message);
  switch (error.response?.status) {
    case 400: throw new ValidationError(message);
    case 401: throw new UnauthorizedError(message);
    case 403: throw new ForbiddenError(message);
    case 404: throw new NotFoundError(message);
    case 409: throw new ConflictError(message);
    case 429: throw new RateLimitError(message);
    default:  throw new BadGatewayError(`API error ${error.response?.status ?? "unknown"}: ${message}`);
  }
}
```

**`rest/<resource>.core.rest.service.ts`** — core CRUD methods:
```typescript
export class <Resource>CoreRestService {
  constructor(private readonly client: AxiosInstance) {}

  async create(dto: TCreate<Resource>): Promise<T<Resource>Response> {
    const startTimeMs = Date.now(); const operationId = randomUUID();
    logOperation("start", { name: "<Resource>CoreRestService.create", startTimeMs, context: { operationId } });
    try {
      const res = await this.client.post<unknown>("/<resource-path>/", dto);
      const data = await <Resource>ResponseSchema.parseAsync(res.data);
      logOperation("success", { name: "<Resource>CoreRestService.create", startTimeMs, data, context: { operationId } });
      return data;
    } catch (err) {
      logOperation("error", { name: "<Resource>CoreRestService.create", startTimeMs, err, context: { operationId } });
      if (axios.isAxiosError(err)) handle<Resource>ApiError(err);
      throw err;
    }
  }
  // list, getById, update, delete — same pattern
}
```

**`rest/<resource>.<subresource>.rest.service.ts`** — one file per sub-resource group, 4 methods each (add/list/patch/delete). Method names are just `add`, `list`, `patch`, `delete` — the sub-resource is encoded in the class name.
```typescript
export class <Resource><Subresource>RestService {
  constructor(private readonly client: AxiosInstance) {}

  async add(resourceId: number, dto: TAdd<Resource><Subresource>): Promise<T<Resource>Response> { ... }
  async list(resourceId: number): Promise<T<Resource><Subresource>List> { ... }
  async patch(resourceId: number, itemId: number, dto: TPatch<Resource><Subresource>): Promise<T<Resource>Response> { ... }
  async delete(resourceId: number, itemId: number): Promise<void> { ... }
}
```

**`<resource>.rest.service.ts`** — thin shell (implements the interface, delegates only):
```typescript
export class <Resource>RestApiService implements I<Resource>sService {
  private readonly core: <Resource>CoreRestService;
  private readonly <subresource>: <Resource><Subresource>RestService;
  // ... one property per sub-resource group

  constructor() {
    const url = process.env.FHIR_GQL_URL;
    if (!url) throw new Error("FHIR_GQL_URL is not configured");

    const client = axios.create({ baseURL: url, headers: { "Content-Type": "application/json" }, timeout: 10_000, maxRedirects: 5 });
    client.interceptors.request.use(async (config) => {
      config.headers.Authorization = `Bearer ${await getAuthToken()}`;
      return config;
    });

    this.core = new <Resource>CoreRestService(client);
    this.<subresource> = new <Resource><Subresource>RestService(client);
    // ...
  }

  // Every method is a one-liner delegation:
  create(dto: TCreate<Resource>) { return this.core.create(dto); }
  add<Subresource>(id: number, dto: TAdd<Resource><Subresource>) { return this.<subresource>.add(id, dto); }
  // ...
}
```

**Key points:**
- Axios client created **once** in the shell constructor and passed to every sub-service
- `handleError` is a **standalone exported function** in `rest.errors.ts` — not a class method
- Sub-service method names are short (`add`/`list`/`patch`/`delete`) — context comes from the class name
- Shell body is `@inheritdoc` delegations only — no business logic

---

## Step 5 — Use cases (one file per operation)

```typescript
// application/usecases/create<Resource>.usecase.ts
import { getInjection } from "@/modules/server/di/container";

export async function create<Resource>UseCase(dto: TCreate<Resource>): Promise<T<Resource>Response> {
  const service = getInjection("I<Resource>sService"); // ← plural
  return service.create(dto);
}
```

---

## Step 6 — Controllers (one file per operation)

**Every controller lives in its own file.** The `index.ts` is a barrel only — it never contains controller logic.

```typescript
// interface-adapters/controllers/create<Resource>.controller.ts
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";

function presenter(data: T<Resource>Response) { return data; }
export type TCreate<Resource>ControllerOutput = ReturnType<typeof presenter>;

export async function create<Resource>Controller(input: unknown): Promise<TCreate<Resource>ControllerOutput> {
  const parsed = await Create<Resource>ValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await create<Resource>UseCase(parsed.data);
  return presenter(data);
}
```

Sub-resource controllers follow the same pattern — one file each:
```
addPatientName.controller.ts   listPatientNames.controller.ts
patchPatientName.controller.ts deletePatientName.controller.ts
```

`interface-adapters/controllers/index.ts` — barrel only, re-exports all controllers + output types:
```typescript
export * from "./create<Resource>.controller";
export * from "./list<Resource>s.controller";
export * from "./getById<Resource>.controller";
export * from "./update<Resource>.controller";
export * from "./delete<Resource>.controller";
// sub-resource controllers...
export * from "./add<Resource>Name.controller";
// ...
```

---

## Step 7 — Wire DI

**Edit `di/types.ts`** — add to both `DI_SYMBOLS` and `DI_RETURN_TYPES`:
```typescript
// DI_SYMBOLS
I<Resource>sService: Symbol.for("I<Resource>sService"),

// DI_RETURN_TYPES
I<Resource>sService: I<Resource>sService;
```

**Create `di/modules/<resource>/<resource>.module.ts`**:
```typescript
/**
 * Binds I<Resource>sService to REST or GraphQL implementation.
 * Switch via FHIR_TRANSPORT env var: "rest" (default) | "graphql"
 */
import { Container } from "@evyweb/ioctopus";
import { DI_SYMBOLS } from "../../types";
import { <Resource>RestApiService } from "@/modules/server/core/<resource>/infrastructure/services/<resource>.rest.service";
import { <Resource>GraphQLService } from "@/modules/server/core/<resource>/infrastructure/services/<resource>.graphql.service";

const transport = process.env.FHIR_TRANSPORT ?? "rest";

export function register<Resource>Module(container: Container) {
  container
    .bind(DI_SYMBOLS.I<Resource>sService)
    .toClass(transport === "graphql" ? <Resource>GraphQLService : <Resource>RestApiService);
}
```

**Edit `di/modules/index.ts`** — add `export * from "./<resource>/<resource>.module";`

**Edit `di/container.ts`** — add `register<Resource>Module(ApplicationContainer);`

---

## Step 8 — Server actions

**Simple resources (≤5 ops):** single `<resource>.actions.ts` file.

**Sub-resource resources (>5 ops):** split by group — `core.actions.ts` + one file per sub-resource + `index.ts` barrel. Never put all 30+ actions in one file.

### `core.actions.ts` — core CRUD + getMe

```typescript
// presentation/actions/<resource>/core.actions.ts
"use server";

// adminProcedure for admin-area resources, authenticatedProcedure for user-facing resources
import { adminProcedure } from "../procedures";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";

export const create<Resource>Action = adminProcedure
  .createServerAction()
  .input(Create<Resource>ActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await create<Resource>Controller(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });

// Read operations — no transportOptions:
export const list<Resource>sAction = adminProcedure
  .createServerAction()
  .input(List<Resource>sActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await list<Resource>sController(input.payload);
      return { result: data };
    });
  });
// getById, update, delete, getMe follow the same pattern.
```

### `<subresource>.actions.ts` — 4 actions per sub-resource group

```typescript
// presentation/actions/<resource>/names.actions.ts
"use server";
import { adminProcedure } from "../procedures";
import { runWithTransport } from "@/modules/server/presentation/transport/runWithTransport";

export const add<Resource>NameAction = adminProcedure
  .createServerAction()
  .input(Add<Resource>NameActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const data = await add<Resource>NameController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
// list, patch, delete follow same pattern.
```

### `index.ts` — barrel re-exporting all action files

```typescript
// presentation/actions/<resource>/index.ts
export * from "./core.actions";
export * from "./names.actions";
export * from "./identifiers.actions";
// ... one line per sub-resource file
```

---

## Rules

- **File splitting**: Never write a large file that mixes multiple concerns. Split into focused files; always add an `index.ts` barrel. Schema folder is always split into `response.ts` / `input.ts` / `actions.ts` / `forms.ts` / `index.ts`. If any file would exceed ~120 lines with distinct concerns, split it further and create sub-folders as needed.
- **Barrel imports only**: All imports from other modules always use the folder barrel (e.g. `@/modules/entities/schemas/<resource>`) — never import from internal sub-files across module boundaries.
- **Service structure threshold**: ≤5 methods → single `<resource>.rest.service.ts` with all logic inline. >5 methods (sub-resources exist) → shell + `rest/` subfolder using the delegation pattern. One sub-service file per sub-resource group; one shared `rest.errors.ts`; shell only wires and delegates.
- **Service naming**: `I<Resource>sService` (plural interface), `<Resource>RestApiService` / `<Resource>GraphQLService` (classes)
- **Two service files always**: REST (active) + GraphQL (stub). DI module switches via `process.env.FHIR_TRANSPORT ?? "rest"`
- **Response schema fields**: `.nullish()` not `.optional()` — APIs return explicit `null`, not missing keys
- **TransportOptionsSchema**: always import from `@/modules/entities/schemas/transport` — never define inline
- **Procedure**: `adminProcedure` for admin resources, `authenticatedProcedure` for user-facing resources
- **Use cases and controllers**: plain async functions only — never classes
- **`skipInputParsing: true`** on all ZSA actions — validation is the controller's job
- **Axios, never fetch** — `AxiosInstance` with `baseURL`, `Content-Type`, `timeout: 10_000`, JWT interceptor
- **`handleError(error: AxiosError): never`** — synchronous, return type `never`; `if (axios.isAxiosError(err)) this.handleError(err); throw err;`
- **Error field**: fhir-gql resources → `body?.detail` (FastAPI default). Orchestrator resources → `body?.message`. Never mix them.
- **Controllers — individual files**: Every controller is its own file (`create<Resource>.controller.ts`, `add<Resource>Name.controller.ts`, etc.). The `index.ts` is a barrel only — zero logic inside it.
- **Actions — split by group**: Resources with sub-resources always split actions into `core.actions.ts` + one `<subresource>.actions.ts` per group + `index.ts` barrel. Never write a single file with 30+ actions.
- **Comments**: file-level block + JSDoc on every class/function/method (project rule)

## Key Reference Files

| File | Purpose |
|---|---|
| `server/core/organization/` | Full working example for fhir-gql resources |
| `server/core/patient/` | Full working example for orchestrator resources |
| `server/di/types.ts` | Add symbols here |
| `server/di/container.ts` | Register modules here |
| `server/shared/auth/roles.ts` | Role groups for `adminProcedure` |
| `entities/schemas/transport/index.ts` | Canonical `TransportOptionsSchema` |
