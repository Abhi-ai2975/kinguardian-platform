# bezs-iam

![Next.js](https://img.shields.io/badge/Next.js-000000?logo=next.js&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178c6?logo=typescript&logoColor=white)
![Better Auth](https://img.shields.io/badge/Better%20Auth-2f5f76)
![License: MIT](https://img.shields.io/badge/License-MIT-4ade80)

A **Next.js Identity & Access Management (IAM) server** built on [Better Auth](https://www.better-auth.com/). It acts as a central authentication authority for:

- AI agents and MCP servers (via capability-based agent auth)
- Frontend web applications
- Backend services and APIs
- Mobile applications

It exposes **OAuth 2.1 / OIDC** endpoints, **API keys**, **agent auth**, and ships with an **admin dashboard** for managing users, OAuth clients, sessions, organizations, and more.

---

## 📑 Table of Contents

- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Architecture](#-architecture)
- [Admin Dashboard](#-admin-dashboard)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## ✨ Features

- **OAuth 2.1 / OIDC provider** — this app *is* the authorization server (`/oauth2/*` endpoints), not just a client.
- **API keys** — issue and manage scoped API keys for machine clients.
- **Agent auth** — capability-based identity for AI agents/MCP servers, including device-code approval flows.
- **RBAC admin dashboard** — manage users, OAuth clients, sessions, organizations, consents, agents, apps, resources, API keys, preference templates, and user context, all from `/admin`.
- **Two-factor auth**, email verification, rate limiting, captcha (Turnstile), and other Better Auth security plugins enabled by default.
- **Multi-tenant organizations** via Better Auth's `organization` plugin.

## 🧱 Technology Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Auth | Better Auth (Prisma adapter) |
| Database | PostgreSQL via Prisma ORM |
| DI Container | `@evyweb/ioctopus` |
| Server Actions | ZSA (Zod Server Actions) |
| Validation | Zod |
| UI | Tailwind CSS + shadcn/ui |
| Client State | Zustand |
| Forms | React Hook Form + `@hookform/resolvers/zod` |
| i18n | next-intl |
| Package Manager | pnpm |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+
- pnpm
- PostgreSQL

### 1. Clone and install

```bash
git clone https://github.com/Yazhnimalan/bezs-iam.git
cd bezs-iam
pnpm install
```

### 2. Configure environment

```bash
cp .env.example .env
```

Fill in at least `DATABASE_URL` and `BETTER_AUTH_SECRET` (generate one with `openssl rand -base64 32`). See `.env.example` for the full list of variables and what each one is for.

### 3. Set up a database

Use whichever Postgres you already have installed locally: create a database, then point `DATABASE_URL` in `.env` at it with your local credentials.

No local Postgres? Run the dev-only database with Docker Compose:

```bash
docker compose up -d
```

This starts Postgres at `postgresql://iam_user:iam_password@localhost:5432/iam_db` — update `DATABASE_URL` in `.env` to match.

> `docker-compose.prod.yml` is a separate **production** stack (app + Postgres) — not for local dev.

### 4. Push the database schema

```bash
pnpm db:push
```

### 5. Seed an admin user

```bash
pnpm seed:admin:dev
```

### 6. Run the dev server

```bash
pnpm dev
```

The app runs at `http://localhost:5001` by default. The admin dashboard is at `/admin`.

---

## 📦 Project Structure

```
src/
├── app/                        # Next.js App Router — routing and pages only
│   ├── [locale]/
│   │   ├── admin/               # Admin dashboard pages (users, oauth-clients, sessions, ...)
│   │   ├── auth/                 # Sign-in, sign-up, 2FA, magic link, password reset, consent
│   │   └── settings/              # End-user preference + security settings
│   └── api/                        # Better Auth catch-all, internal + misc REST endpoints
│
├── modules/
│   ├── entities/                # Shared Zod schemas, types, enums — zero framework imports
│   ├── server/
│   │   ├── auth-provider/        # Better Auth instance + plugin configuration
│   │   ├── core/                  # Clean Architecture layers, one folder per bounded domain
│   │   │   ├── admin/               #   11 admin-dashboard features (domain → application → infrastructure → interface-adapters)
│   │   │   ├── auth/                  #   sign-in/up, 2FA, session flows
│   │   │   ├── settings/                #   end-user preferences
│   │   │   └── common/email/              #   outbound email sending
│   │   ├── di/                     # Dependency injection container + module registrations
│   │   ├── presentation/            # ZSA server actions
│   │   └── shared/                   # requireRole, error mappers
│   └── client/
│       ├── admin/                  # Admin UI: stores, forms, modals, tables, providers
│       ├── auth/                    # Auth UI: sign-in/up, 2FA, device flow
│       ├── settings/                 # End-user preference + security UI
│       └── shared/                    # Shared UI components
└── components/                          # Global shadcn/ui components
```

Within `core/<domain>`, infrastructure splits into **Services** (wrap an external API, e.g. Better Auth's `auth.api.*` or SMTP) and **Repositories** (direct Prisma access) — a feature gets whichever it needs, or both. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the full directory tree, the Services-vs-Repositories rationale, a per-feature breakdown, and an end-to-end request walkthrough.

## 🏗 Architecture

**Clean Architecture** with a strict one-way dependency flow:

```
Entities (schemas/types)
  └── Domain (interfaces: services/ + repositories/)
        └── Application (use cases)
              └── Infrastructure (services → Better Auth API / repositories → Prisma)
                    └── Interface Adapters (controllers)
                          └── Presentation (ZSA server actions)
                                └── Client (React components)
```

Every admin feature (users, OAuth clients, sessions, organizations, consents, agent-auth, apps, resources, API keys, preference templates, user context) follows this same layering. See [`ARCHITECTURE.md`](./ARCHITECTURE.md) for the deep dive and [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the step-by-step guide to adding a new feature.

## 🖥 Admin Dashboard

Available at `/admin` for users with the `admin` or `superadmin` role:

| Role | Permissions |
|---|---|
| `guest` | Read own user info |
| `admin` | Create/read OAuth clients, read organizations |
| `superadmin` | Full CRUD on all resources |

---

## 🤝 Contributing

Contributions are welcome. Please read [`CONTRIBUTING.md`](./CONTRIBUTING.md) for the architecture rules, folder conventions, and the checklist for adding a new admin feature.

## 🔒 Security

Found a vulnerability? Please **do not** open a public issue — see [`SECURITY.md`](./SECURITY.md) for how to report it privately.

## 📄 License

[MIT](./LICENSE)
