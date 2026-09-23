# Modular Monolith Architecture — Next.js + Clean Architecture + DI + Shared Entities

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Clean Architecture](https://img.shields.io/badge/Clean%20Architecture-000?logo=archlinux&logoColor=white)
![Modular Monolith](https://img.shields.io/badge/Modular%20Monolith-4ade80)

This project implements a **fully modular, enterprise-grade architecture** using:

- **Next.js App Router**
- **Clean Architecture + Dependency Inversion**
- **Shared Zod Schemas & Types (Domain Kernel)**
- **Centralized Dependency Injection**
- **Modular Monolith structure**
- **Framework-agnostic backend `core`**

The architecture is designed for **long-term scalability**, **testability**, and **future microservice extraction** without breaking the frontend.

---

# 📑 Table of Contents

- [Why This Architecture?](#-why-this-architecture)
- [Installation](#-installation)
- [Project Structure](#-project-structure)
- [Shared Domain Kernel](#-shared-domain-kernel--modulesentities)
- [Backend Core (Clean Architecture)](#-backend-business-logic--modulesservercore)
- [Dependency Injection](#-dependency-injection--modulesserverdi)
- [Presentation Layer](#-presentation-layer--modulesserverpresentation)
- [Client Layer](#-client-layer--modulesclient)
- [Frontend → Backend Interaction](#-frontend--backend-interaction)
- [Extracting Backend To Express/Hono](#-extracting-backend-into-a-separate-api-server)
- [Example Migration (Express)](#-example-migration-to-express)
- [Example Migration (Hono)](#-example-migration-to-hono)
- [Architecture Flow](#-architecture-flow)
- [Core Principles](#-core-principles-followed)
- [Conclusion](#-conclusion)

---

# 💡 Why This Architecture?

This architecture solves several core problems:

### ✅ Clear separation between **frontend UI**, **backend logic**, and **domain models**

### ✅ **Schemas & types shared** across client and server

### ✅ Backend can be **extracted into Express/Hono/Nest** without code changes

### ✅ **Usecases never depend on frameworks**

### ✅ **DI container keeps dependencies clean and testable**

### ✅ Perfect for **large teams**, **long-term maintenance**, and **feature growth**

---

# 🚀 Installation

```bash
npm install
npm run dev
```

---

## 📦 Project Structure

```
modules/
├─ client/ → UI and client-only logic
├─ entities/ → Shared domain kernel (schemas, types, enums)
└─ server/ → Backend core, DI, presentation and infrastructure
```

---

## 🧱 Shared Domain Kernel — `modules/entities/`

This folder stores all Zod schemas, types, enums, and domain-level data models used by both frontend and backend.

```
entities/
├─ enums/
├─ errors/
├─ schemas/
│ ├─ auth/
│ │ ├─ base.schema.ts
│ │ ├─ reusable.schema.ts
│ │ ├─ auth.schema.ts
│ │ └─ index.ts
│ └─ transport/
└─ types/
```

### Purpose

- One source of truth for data validation and types
- Avoid duplication between client & server
- Provide safe DTO validation everywhere
- No Next.js or server dependencies
- Fully portable across frameworks

### Example Usage

Frontend:

```ts
import { SignupFormSchema } from "@/modules/entities/schemas/auth";
```

Backend:

```ts
import { SigninValidationSchema } from "@/modules/entities/schemas/auth";
```

## 🧠 Backend Business Logic — modules/server/core/

Implements Clean Architecture:

```
server/core/
├─ auth/
│  ├─ application/       → use cases
│  ├─ domain/            → business interfaces
│  ├─ infrastructure/    → repository/service implementations
│  └─ interface-adapters/→ controllers, presenters
├─ common/
│  └─ email/
└─ shared/

```

### Core Responsibilities

- Pure business logic (no Next.js)

- Use cases depend only on interfaces

- Infrastructure implements interfaces

- Zero framework code inside core

- Fully portable — can be reused in any backend

## 🎛 Dependency Injection — modules/server/di/

```
di/
├─ modules/     → Feature DI bindings (auth.module.ts, email.module.ts)
├─ types.ts     → DI symbols
└─ container.ts → AppContainer (composition root)

```

### Responsibilities

- Bind interfaces → implementations

- Provide testability

- Keep modules decoupled

- Keep core clean

## 🎨 Presentation Layer — modules/server/presentation/

Contains framework-specific delivery logic.

```
presentation/
├─ actions/        → Next.js server actions (ZSA)
└─ transport/      → runWithTransport, redirect handling

```

This layer adapts the backend to Next.js.

- The only layer allowed to import Next.js APIs

- The only layer aware of HTTP / routing / request objects

## 🗂 Client Layer — modules/client/

```
client/
├─ auth/
│  ├─ components/
│  ├─ types/
│  └─ auth-client.ts
└─ shared/

```

### Frontend rules:

- Uses schemas from entities/

- Interacts with server via server actions

- No backend imports

- No core imports

## 🔌 Frontend → Backend Interaction

Frontend communicates through:

- Server Actions

- ZSA

- Shared Schemas (modules/entities/)

Ensures type-safe end-to-end communication.

## 🚀 Extracting Backend Into a Separate API Server

To migrate backend away from Next.js, copy ONLY:

```bash
modules/entities/
modules/server/core/
modules/server/di/
modules/server/prisma/

```

Everything else stays in Next.js.
This makes backend portable to Express, Hono, NestJS, Fastify, Bun, etc.
No changes needed inside core or entities.

## 🌐 Example Migration to Express

```ts
import "reflect-metadata";
import express from "express";
import { SignupValidationSchema } from "./entities/schemas/auth";
import { signupUseCase } from "./server/core/auth/application/usecases/auth/signup.usecase";

const app = express();
app.use(express.json());

app.post("/auth/signup", async (req, res) => {
  const parsed = SignupValidationSchema.parse(req.body);
  const result = await signupUseCase(parsed);
  res.json(result);
});

app.listen(4000, () => console.log("Server running on 4000"));
```

## ⚡ Example Migration to Hono

```ts
import { Hono } from "hono";
import { SignupValidationSchema } from "./entities/schemas/auth";
import { signupUseCase } from "./server/core/auth/application/usecases/auth/signup.usecase";

const app = new Hono();

app.post("/auth/signup", async (c) => {
  const body = await c.req.json();
  const parsed = SignupValidationSchema.parse(body);
  const result = await signupUseCase(parsed);
  return c.json(result);
});

export default app;
```

## 🗺 Architecture Flow

```
Shared Entities (Schemas, Types, Enums)
   ↓
Clean Architecture Core (Usecases, Domain, Infra)
   ↓
Dependency Injection Container
   ↓
Presentation Layer (Next.js Actions, Transport)
   ↓
Client

```

## 🧩 Core Principles Followed

- Clean Architecture

- Dependency Inversion

- Feature Modularization

- Single Responsibility

- Zero Client/Server Coupling

- Backend Portability

- Shared Domain Kernel

- Testability

- Future Microservice Support

## 🏁 Conclusion

This architecture is:

- Clean

- Scalable

- Modular

- Type-safe

- Enterprise-ready

- Easy to test

- Easy to extend

- Easy to migrate

You can safely build large-scale features without breaking structure, while keeping flexibility to extract backend services when needed.

```
"seed:admin-menu": "tsx --env-file=.env scripts/seed-admin-menu.ts","seed:admin": "tsx --env-file=.env scripts/seed-admin.ts"
```
