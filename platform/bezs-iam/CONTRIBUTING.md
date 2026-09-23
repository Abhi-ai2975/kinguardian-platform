# Contributing Guide

Thank you for considering contributing!  
This project uses a **modular monolith architecture** with strong boundaries between layers.  
This guide will help you contribute correctly and safely.

---

## 📑 Table of Contents

- [Getting Started](#-getting-started)
- [General Rules](#-general-rules)
- [Folder Responsibilities](#-folder-responsibilities)
- [Making Changes](#-making-changes)
- [Adding a New Feature Module](#-adding-a-new-feature-module)
- [Working With Usecases](#-working-with-usecases)
- [Working With Schemas / Types](#-working-with-schemas--types)
- [Working With Server Actions](#-working-with-server-actions)
- [Coding Standards](#-coding-standards)
- [Pull Request Checklist](#-pull-request-checklist)

---

## 🏁 Getting Started

### 1. Fork & clone

Fork the repo on GitHub, then clone your fork:

```bash
git clone https://github.com/<your-username>/bezs-iam.git
cd bezs-iam
```

If you have push access and don't need a fork, you can clone directly:

```bash
git clone https://github.com/Yazhnimalan/bezs-iam.git
cd bezs-iam
```

### 2. Install pnpm

This project uses **pnpm** as its package manager — npm/yarn are not supported. If you don't have it yet:

```bash
npm install -g pnpm
```

(or via Corepack: `corepack enable`)

### 3. Install dependencies

```bash
pnpm install
```

### 4. Set up your environment

```bash
cp .env.example .env
```

Fill in at least `DATABASE_URL` and `BETTER_AUTH_SECRET` (generate one with `openssl rand -base64 32`). See `.env.example` for the full list of variables.

### 5. Start a database

Requires PostgreSQL. Use whichever Postgres you already have installed locally:

1. Create a database (e.g. `iam_db`).
2. Point `DATABASE_URL` in your `.env` at it, using your local Postgres credentials.

Don't have Postgres installed? The repo root has a `docker-compose.yml` for exactly this — it spins up a local-only Postgres instance:

```bash
docker compose up -d
```

This gives you a database at `postgresql://iam_user:iam_password@localhost:5432/iam_db` — update `DATABASE_URL` in `.env` to match.

> `docker-compose.prod.yml` is a separate **production** stack (app + Postgres, no exposed DB port) — don't use it for local dev.

### 6. Push the schema and seed an admin user

```bash
pnpm db:push
pnpm seed:admin:dev
```

### 7. Run the dev server

```bash
pnpm dev
```

The app runs at `http://localhost:5001`, with the admin dashboard at `/admin`.

### 8. Create a branch and make your change

```bash
git checkout -b your-feature-name
```

Follow the architecture rules and conventions below, then open a PR against `main`.

---

## 🚦 General Rules

### ✔ Follow Clean Architecture boundaries

- **Entities** must NOT import anything from server or client.
- **Core** (usecases/domain) must NOT import presentation or Next.js.
- **Presentation** may depend on `core`, but not the other way around.
- **Client** must NOT import `server/core` directly.

### ✔ All validation schemas must come from `modules/entities`.

### ✔ All business logic must live inside **usecases**.

### ✔ All framework-specific logic must remain in **presentation**.

---

## 🗂 Folder Responsibilities

### `modules/entities/`

- Zod schemas
- Domain enums
- Domain types
- Shared DTO definitions

**Framework-agnostic.**  
No imports from `next/*`, `server/*`, or `infra/*`.

---

### `modules/server/core/`

- Domain interfaces
- Usecases
- Infrastructure implementations
- Controllers & presenters

**No Next.js code allowed.**

---

### `modules/server/presentation/`

- Server actions
- Route adapters
- Request/response mapping

Allowed to use Next.js APIs.

---

### `modules/client/`

- UI components
- Hooks
- Client utilities

No imports from backend internals.

---

### `modules/server/di/`

- DI symbols
- Dependency bindings
- Composition root

---

## ➕ Making Changes

### 🧱 1. Changing entities

If updating DTOs, schemas, enums, or shared types:

- Modify files inside `modules/entities/`
- Re-run validation where used
- Ensure frontend + backend build successfully

Schemas must be pure Zod objects.

---

### 🧠 2. Changing backend business logic

Modify code inside:

```ts
modules/server/core/{feature}/application/usecases/
modules/server/core/{feature}/domain/
modules/server/core/{feature}/infrastructure/
```

Controllers must remain thin:

- Validate
- Call usecases
- Map output via presenter

---

### 🎨 3. Changing server actions

Modify only inside:

```
modules/server/presentation/actions/
```

Never put business logic in server actions.

---

### 🧩 4. Adding a new dependency

Add DI bindings inside:

```
modules/server/di/modules/
modules/server/di/container.ts
```

Never instantiate dependencies manually inside usecases.

---

## 🆕 Adding a New Admin Feature

This repo currently has 11 admin features (users, oauth-clients, sessions, organizations, consents, agent-auth, apps, resources, api-keys, preference-templates, user-context), all following the same layout:

```
modules/
└─ server/
   └─ core/
      └─ admin/
         ├─ domain/interfaces/<feature>.service.interface.ts
         ├─ application/usecases/<feature>/        (one file per operation + index.ts)
         ├─ infrastructure/services/<feature>.service.ts
         └─ interface-adapters/controllers/<feature>/ (one file per operation + index.ts)
```

Steps (full detail in [`CLAUDE.md`](./CLAUDE.md) → "Adding a New Admin Feature"):

1. Schema → `modules/entities/schemas/admin/<feature>/`
2. Interface → `core/admin/domain/interfaces/<feature>.service.interface.ts`
3. Service → `core/admin/infrastructure/services/<feature>.service.ts` (calls `auth.api.*`, always passing `headers: await headers()`)
4. DI → `di/modules/admin/<feature>.module.ts` + update `types.ts`, `modules/index.ts`, `container.ts`
5. Use cases → `core/admin/application/usecases/<feature>/` (one file per operation + `index.ts`)
6. Controllers → `core/admin/interface-adapters/controllers/<feature>/` (validates with `safeParseAsync`, calls the use case, runs a `presenter()`)
7. Action → `presentation/actions/admin/<feature>.action.ts`, wrapped in `runWithTransport`, with `skipInputParsing: true` on mutations
8. Client types, store fields, forms, modals, provider, components, page — see `client/admin/` for the pattern used by existing features

**Naming convention:** use kebab-case for the feature name consistently across every layer (folder names, file names, DI symbols) — it should match the Next.js route segment under `app/[locale]/admin/`.

---

## 📐 Working With Usecases

Usecases must:

- Be pure
- Be framework-agnostic
- Depend only on domain interfaces
- Throw only application or domain errors
- Never import Next.js or infrastructure code directly

Example (`getUsers.usecase.ts`):

```ts
export async function getUsersUseCase(): Promise<TGetUsersResponseDtoSchema> {
  const usersService = getInjection("IUsersService");
  const data = await usersService.getUsers();
  return data;
}
```

## 🧬 Working With Schemas / Types

All schemas must live in:

```bash
modules/entities/schemas/
```

Types must live in:

```bash
modules/entities/types/
```

Never duplicate types inside core or client — always import from entities.

## 🎛 Working With Server Actions

Server actions must:

- Validate input with shared schemas

- Call controller, not usecase directly

- Return DTOs

- Never contain business logic

Example (`createUserAction`):

```ts
export const createUserAction = superadminProcedure.createServerAction()
  .input(CreateUserActionSchema, { skipInputParsing: true })
  .handler(async ({ input }) => {
    return await runWithTransport<TCreateUserControllerOutput>(async () => {
      const data = await createUserController(input.payload);
      return { result: data, transport: input.transportOptions };
    });
  });
```

## 🧹 Coding Standards

- ✔ Use Zod for validation

- ✔ Use DI for all services

- ✔ Use interfaces for all core dependencies

- ✔ Keep functions small and pure

- ✔ Use async/await

- ✔ Use consistent naming conventions:

  - \*.usecase.ts

  - \*.controller.ts

  - \*.presenter.ts

  - \*.service.ts

  - \*.schema.ts

  - \*.interface.ts

## ✔ Pull Request Checklist

Before submitting a PR:

- Code compiles

- No server code imported into client

- No Next.js imports inside core

- All new logic validated with schemas

- DI bindings updated if necessary

- No business logic inside controllers or server actions

- README updated if folder structure changed

---

🎉 Thank You for Contributing!

This architecture is designed for scalability and clean maintainability.
Following this guide ensures the project stays robust, modular, and production-ready.

If you need a PR template, ESLint rules, or folder generator script, feel free to ask.
