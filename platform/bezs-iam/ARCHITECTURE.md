# Architecture

This document explains **how `src/` is organized** and **why**, in more depth than the README's quick overview. It reflects the current, actual layout of the codebase (last aligned with commit `4bb6a76`, after the services/repositories separation refactor).

If you're adding a new admin feature, use this as the mental model, then follow the step-by-step checklist in [`CONTRIBUTING.md`](./CONTRIBUTING.md).

---

## 📑 Table of Contents

- [Guiding Principle](#-guiding-principle)
- [Top-Level Layout](#-top-level-layout)
- [`modules/entities` — Framework-Agnostic Contracts](#-modulesentities--framework-agnostic-contracts)
- [`modules/server` — Backend](#-modulesserver--backend)
  - [`core/<domain>` — Clean Architecture Layers](#coredomain--clean-architecture-layers)
  - [Services vs. Repositories](#services-vs-repositories)
  - [Per-Feature Breakdown (`core/admin`)](#per-feature-breakdown-coreadmin)
  - [`di/` — Dependency Injection](#di--dependency-injection)
  - [`presentation/` — Server Actions](#presentation--server-actions)
- [`modules/client` — Frontend](#-modulesclient--frontend)
- [Request Lifecycle, End to End](#-request-lifecycle-end-to-end)
- [Naming Conventions](#-naming-conventions)

---

## 🎯 Guiding Principle

**Clean Architecture** with a strict one-way dependency rule: outer layers may depend on inner layers, never the reverse.

```
Entities (schemas/types)                         ← zero framework imports
  └── Domain (interfaces)                         ← contracts only, no implementation
        └── Application (use cases)                ← business logic, depends on interfaces only
              └── Infrastructure (services/repositories)  ← implements the interfaces
                    └── Interface Adapters (controllers)   ← validates input, calls use cases
                          └── Presentation (ZSA server actions)  ← Next.js-aware glue
                                └── Client (React components)     ← UI
```

A use case never imports Prisma, Better Auth, or Next.js directly — it asks the DI container for an interface and calls a method on it. This is what makes it possible to swap `organizations.repository.ts`'s Prisma queries for something else later without touching a single use case.

---

## 📦 Top-Level Layout

```
src/
├── app/                          # Next.js App Router — routing only, no business logic
│   ├── [locale]/
│   │   ├── admin/                # Admin dashboard pages (one folder per feature)
│   │   ├── auth/                 # Sign-in, sign-up, 2FA, magic link, password reset, consent
│   │   └── settings/             # End-user preference + security settings pages
│   ├── api/
│   │   ├── auth/[...all]/        # Better Auth's catch-all handler (OAuth2/OIDC endpoints live here)
│   │   ├── admin/org-members/    # Misc REST endpoints not modeled as server actions
│   │   ├── internal/             # Internal-only endpoints (cors-origins, active-organization)
│   │   ├── me/context/           # Current-user context endpoint
│   │   └── permissions/check/    # Permission check endpoint
│   ├── .well-known/               # OAuth authorization server + agent-configuration metadata
│   └── device/capabilities/       # Agent device-code capability listing
│
├── modules/
│   ├── entities/                 # Zod schemas, TS types, enums — shared, framework-agnostic
│   ├── server/                   # Everything backend: core business logic, DI, server actions
│   ├── client/                   # Everything frontend: components, forms, modals, stores
│   └── shared/                   # Assets shared by both server and client (e.g. email-templates)
│
└── components/                    # Global shadcn/ui primitives (Button, Dialog, Table, …)
```

---

## 🧩 `modules/entities` — Framework-Agnostic Contracts

```
entities/
├── schemas/
│   ├── admin/<feature>/          # Zod schemas per admin feature (users, organizations, …)
│   ├── auth/                     # Sign-in/up, 2FA, password reset schemas
│   ├── email/                    # Email payload schemas
│   ├── settings/preference/      # User preference schemas
│   └── transport.ts              # TransportOptionsSchema (revalidate/redirect instructions)
├── types/
│   ├── admin/                    # TS payload types for write operations
│   ├── auth/
│   └── email/
└── enums/
    ├── admin/oauth-client/       # Grant types, auth methods, etc.
    ├── auth/
    └── transportOptions.enum.ts
```

**Rule:** nothing in here imports from `next/*`, `server/*`, or `client/*`. Both the backend and frontend import from `entities` — never the other way around, and never directly between `server` and `client`.

---

## 🖥 `modules/server` — Backend

```
server/
├── auth-provider/         # The Better Auth instance itself + all plugin configuration
├── agent-auth/             # Agent capability execution + agent-auth request guard
├── config/logger/           # Winston logger setup
├── core/                    # Clean Architecture layers, one subfolder per bounded domain:
│   ├── admin/                #   → all 11 admin-dashboard features
│   ├── auth/                  #   → sign-in/up, 2FA, session flows
│   ├── settings/               #   → end-user preferences
│   └── common/email/            #   → outbound email sending
├── di/                       # Dependency injection container + composition root
├── presentation/               # ZSA server actions (Next.js-aware glue layer)
├── shared/                      # requireRole guard, captcha validation, error types/mappers
└── utils/                        # getUserPermissions, sendAuthEmail, misc helpers
```

### `core/<domain>` — Clean Architecture Layers

Every bounded domain under `core/` (`admin`, `auth`, `settings`, `common/email`) follows the same five-folder shape:

```
core/<domain>/
├── domain/interfaces/
│   ├── services/         # Interfaces for things that call an external system's API
│   └── repositories/     # Interfaces for things that talk to Postgres directly
├── application/usecases/<feature>/   # One file per operation + an index.ts barrel
├── infrastructure/
│   ├── services/          # Implements domain/interfaces/services — e.g. calls auth.api.*
│   └── repositories/      # Implements domain/interfaces/repositories — e.g. calls prisma.*
└── interface-adapters/
    ├── controllers/<feature>/  # Validates input (safeParseAsync), calls the use case, presents output
    └── presenters/               # (auth domain only) response shaping for auth flows
```

Not every domain has both `services/` and `repositories/` — it depends on what that domain actually does:

| Domain | Has `services/` | Has `repositories/` |
|---|:---:|:---:|
| `core/admin` | ✅ | ✅ |
| `core/auth` | ✅ | — |
| `core/common/email` | ✅ | — |
| `core/settings` | — | ✅ |

### Services vs. Repositories

This is the split most recently introduced (see commit `8dcb875`) and the convention every new feature must follow:

- **Service** — wraps a call to an *external system's API or SDK*. In this codebase that's almost always Better Auth's `auth.api.*` (e.g. `UsersService.createUser` → `auth.api.createUser`), but it also covers things like `NodemailerEmailService`, which wraps the `nodemailer` SMTP client. Services always pass `headers: await headers()` when calling `auth.api.*`.
- **Repository** — wraps *direct Postgres access via Prisma*. No `auth.api` calls, no third-party SDKs — just `prisma.<model>.<method>(...)`.

**Why split them:** several admin infrastructure files used to mix both concerns in the same class (and sometimes the same method) — calling `auth.api.updateOrganization` and then doing a follow-up `prisma.organization.findUnique` for data Better Auth's response didn't include. That made it unclear which methods were safe to test with a mocked HTTP layer vs. a test database, and grew each service into a grab-bag. The fix: one class per concern. If a feature needs both, it gets a Service **and** a Repository, and a use case is free to inject either (or both) via DI.

A concrete example — `organizations`:
- `organizations.service.ts` → pure `auth.api.*` calls: `createOrganization`, `deleteOrganization`, `addMember`, `createInvitation`, `cancelInvitation`, `createTeam`, `updateTeam`, `addTeamMember`.
- `organizations.repository.ts` → pure Prisma: `getOrganization`, `updateOrganization`, `updateMemberRole`, `removeTeamMember`, `removeMember`, `listOrganizations`, org-role CRUD (`listOrgRoles`, `createOrgRole`, `updateOrgRole`, `deleteOrgRole`), `isMemberInOrg`, `getOrgRoleRedirects`.
- `addTeamMember.usecase.ts` is a case where a single use case injects **both** `IOrganizationsService` (to add the member via Better Auth) and `IOrganizationsRepository` (to check `isMemberInOrg` first) — mixing is fine at the use-case level, just not inside a single infrastructure class.

### Per-Feature Breakdown (`core/admin`)

All 11 admin features live under `core/admin/`, classified by which infrastructure they need:

| Feature | Folder | Service (auth.api) | Repository (Prisma) |
|---|---|:---:|:---:|
| Users | `users` | ✅ | — |
| OAuth Clients | `oauthclient` | ✅ | — |
| Consents | `consents` | ✅ | — |
| Agent Auth | `agentauth` | ✅ | — |
| API Keys | `apikeys` | ✅ | ✅ |
| Sessions | `sessions` | ✅ | ✅ |
| Organizations | `organizations` | ✅ | ✅ |
| Apps | `apps` | — | ✅ |
| Resources | `resources` | — | ✅ |
| Preference Templates | `preferenceTemplates` | — | ✅ |
| User Context | `usercontext` | — | ✅ |

> Folder/symbol naming is not yet 100% kebab-case-consistent across every layer (e.g. `agentauth` vs the `agent-auth` route segment, `preferenceTemplates` vs `preference-templates`) — a normalization pass is a tracked follow-up. **New features should use kebab-case consistently in every layer**, matching the route segment under `app/[locale]/admin/`.

### `di/` — Dependency Injection

```
di/
├── types.ts              # DI_SYMBOLS (Symbol.for(...) registry) + DI_RETURN_TYPES (interface map)
├── container.ts           # createContainer() + getInjection(symbolName)
└── modules/
    ├── index.ts             # Re-exports every module's register function
    ├── admin/<feature>.module.ts   # Binds that feature's Service and/or Repository symbol(s)
    ├── auth/auth.module.ts
    ├── email/email.module.ts
    └── settings/userPreference.module.ts
```

`types.ts` keeps two clearly separated blocks — `// Repositories` and `// Services` — in both `DI_SYMBOLS` and `DI_RETURN_TYPES`, mirroring the `domain/interfaces/{services,repositories}` split. A use case resolves a dependency with:

```ts
const organizationsRepository = getInjection("IOrganizationsRepository");
```

Never `new` up a Service or Repository directly inside a use case — always go through `getInjection`.

### `presentation/` — Server Actions

```
presentation/
├── actions/
│   ├── admin/<feature>.action.ts   # ZSA server actions per admin feature, + index.ts barrel
│   ├── auth/auth.actions.ts
│   ├── settings/preference.action.ts
│   └── procedures.ts                 # ZSA procedure definitions (e.g. superadminProcedure)
└── transport/runWithTransport.ts     # Wraps action bodies: handles revalidatePath/redirect + error → ZSA mapping
```

This is the only place in `server/` allowed to use Next.js APIs (`headers()`, `revalidatePath`, `redirect`). Mutation actions use `skipInputParsing: true` — the controller (not the action) does the actual Zod parsing, so validation errors come back shaped consistently through the controller's error path.

---

## 🎨 `modules/client` — Frontend

```
client/
├── admin/
│   ├── stores/admin.store.ts        # Zustand: ModalType, ModalData, onOpen/onClose — single source of truth for all modals
│   ├── types/<feature>.type.ts       # Client-side view types (e.g. TUser, TOAuthClient)
│   ├── components/<feature>/          # Tables + column definitions
│   ├── forms/<feature>/                # React Hook Form + zod resolver forms
│   ├── modals/<feature>/                # Dialogs that read from admin.store and render a form
│   └── provider/<Feature>ModalProvider.tsx  # Mounts all of a feature's modals once per page
├── auth/
│   ├── auth-client.ts                  # Better Auth client instance (browser-side)
│   ├── components/{auth,device,landing,layout,shared}/
│   └── hooks/
├── settings/{preference,security}/     # End-user-facing settings pages' components
└── shared/
    ├── components/table/                # Generic DataTable + sorting
    ├── custom-form-fields/                # FormInput, FormSelect, FormSwitch
    ├── error/handleZSAError.ts             # Maps ZSA errors onto RHF field errors
    ├── menubar/ and navbar/
```

**Rule:** `client/` never imports from `server/core` — it only calls server actions exported from `server/presentation/actions` (which Next.js turns into RPC-style calls across the server/client boundary).

Two conventions worth internalizing:
- `values` vs `defaultValues` in `useForm`: `defaultValues` for create modals, `values` for edit/update modals (so the form re-syncs when `modalData` changes).
- Column definitions (`*TableColumn.tsx`) aren't React components and can't use hooks — they read the Zustand store directly via `adminStore.getState()`, not `useAdminStore()`.

---

## 🔁 Request Lifecycle, End to End

Using "ban a user" as an example, a request flows through every layer in order:

1. **Client** — `UsersTableColumn.tsx` dropdown → opens `BanUserModal` (via `admin.store.ts`) → `UserBanForm.tsx` submits.
2. **Presentation** — `users.action.ts`'s `banUserAction` (a ZSA server action, `skipInputParsing: true`) is called, wrapped in `runWithTransport`.
3. **Interface Adapters** — `banUser.controller.ts` runs `safeParseAsync` against the Zod schema from `entities/schemas/admin/users/`, then calls the use case, then runs its local `presenter()`.
4. **Application** — `banUser.usecase.ts` calls `getInjection("IUsersService")` and invokes one method on it.
5. **Infrastructure** — `users.service.ts`'s `banUser` method calls `auth.api.banUser({ body, headers: await headers() })`.
6. Response bubbles back up through the presenter → controller → action, where `runWithTransport` applies `revalidatePath`/`redirect` per the schema's `TransportOptionsSchema`, or maps a thrown domain error to a ZSA error.
7. **Client** — `handleZSAError.ts` maps any field-level error back onto the React Hook Form instance; on success the modal closes and the table revalidates.

---

## 🏷 Naming Conventions

| Suffix | Layer | Example |
|---|---|---|
| `.schema.ts` | Entities | `users.schema.ts` |
| `.service.interface.ts` | Domain | `organizations.service.interface.ts` |
| `.repository.interface.ts` | Domain | `organizations.repository.interface.ts` |
| `.usecase.ts` | Application | `banUser.usecase.ts` |
| `.service.ts` | Infrastructure | `organizations.service.ts` |
| `.repository.ts` | Infrastructure | `organizations.repository.ts` |
| `.controller.ts` | Interface Adapters | `banUser.controller.ts` |
| `.action.ts` | Presentation | `users.action.ts` |
| `.module.ts` | DI | `organizations.module.ts` |

For the complete step-by-step checklist for wiring up a brand-new admin feature across all of these layers, see [`CONTRIBUTING.md`](./CONTRIBUTING.md#-adding-a-new-admin-feature).
