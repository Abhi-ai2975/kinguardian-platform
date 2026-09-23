# Dashboard Architecture

## Layer structure

The dashboard is a Next.js App Router application.  It does not follow full Clean
Architecture internally (the data layer is thin read-only ClickHouse queries), but
it separates concerns clearly:

```
src/
├── app/                     — Routes (pages + API route handlers)
│   ├── (auth)/              — Unauthenticated pages (login)
│   ├── (dashboard)/         — Protected pages (overview, audit, logs, traces, metrics, settings)
│   └── api/
│       ├── auth/[...all]/   — better-auth endpoint catch-all
│       └── events/          — ClickHouse query endpoints (one per event type)
│
├── components/
│   ├── ui/                  — shadcn/ui primitives (button, card, badge, etc.)
│   ├── layout/              — AppSidebar, Header (structural shell components)
│   ├── dashboard/           — StatsCards, EventsChart, LiveFeed
│   ├── explorer/            — EventsExplorer (shared filterable table)
│   └── data-table/          — DataTable (TanStack Table wrapper)
│
├── hooks/
│   └── useRealtimeEvents.ts — WebSocket hook for the live feed
│
└── lib/
    ├── auth-server.ts       — Server-side better-auth instance (server only)
    ├── auth.ts              — Client-side better-auth client
    ├── clickhouse.ts        — ClickHouse client + typed query helpers
    └── utils.ts             — cn(), formatDate(), etc.
```

## Data flow

### Historical data (ClickHouse)

```
Browser → React Query → fetch /api/events/<type> → Route Handler → clickhouse.ts → ClickHouse
```

Server Route Handlers validate the session, enforce org-scoping, then query ClickHouse
directly.  Results flow back to TanStack Query's cache on the client.

### Real-time data (WebSocket)

```
realtime-go:8081/ws → useRealtimeEvents hook → LiveFeed component → React state
```

The browser opens a WebSocket directly to the realtime service using an API key from
Settings.  Events arrive as JSON strings and are prepended to a bounded ring buffer
in React state.

## Authentication flow

1. User visits any protected route
2. Next.js middleware (`src/middleware.ts`) reads the session cookie
3. `getSessionFromRequest(req, auth)` validates against shared PostgreSQL
4. Unauthenticated → redirect to `/login`
5. Login page calls `authClient.signIn.email()` → POST /api/auth/sign-in/email
6. better-auth creates a session in the shared `session` table → sets cookie
7. Dashboard layout (`(dashboard)/layout.tsx`) reads session server-side to get `orgId`
8. All ClickHouse queries are scoped to that `orgId`

## Multi-tenancy

Every ClickHouse query includes `WHERE organization_id = {orgId: String}`.  The orgId
comes from the better-auth session's `activeOrganizationId` field (set by the
`organization()` plugin).  API routes enforce that the `orgId` query parameter matches
the session's active org to prevent cross-tenant data access.
