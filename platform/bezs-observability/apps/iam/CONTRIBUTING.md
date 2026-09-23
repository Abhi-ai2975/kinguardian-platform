# Contributing Guide

Thank you for considering contributing!  
This project uses a **modular monolith architecture** with strong boundaries between layers.  
This guide will help you contribute correctly and safely.

---

## 📑 Table of Contents

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

## 🆕 Adding a New Feature Module

Use the structure:

```
modules/
└─ server/
   └─ core/
      └─ feature/
         ├─ application/
         │  └─ usecases/
         ├─ domain/
         │  └─ interfaces/
         ├─ infrastructure/
         └─ interface-adapters/

```

Steps:

1. Create domain interface
2. Create usecases depending on the interface
3. Implement the interface in `infrastructure/`
4. Add DI registration
5. Create controller & presenter
6. Create server action to expose the feature

---

## 📐 Working With Usecases

Usecases must:

- Be pure
- Be framework-agnostic
- Depend only on domain interfaces
- Throw only application or domain errors
- Never import Next.js or infrastructure code directly

Example:

```ts
export async function signinUseCase(payload: TSigninInput) {
  const authService = getInjection("IAuthService");
  return authService.signIn(payload);
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

Example:

```ts
export const signinAction = createServerAction()
  .input(SigninActionSchema)
  .handler(async ({ input }) => {
    return await runWithTransport(async () => {
      const result = await signinController(input.payload);
      return { result };
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
