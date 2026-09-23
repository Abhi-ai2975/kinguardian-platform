# Console App — MVP Completion Plan

The `dashboard-nextjs` app is being renamed to **`console`**.
It is the single web interface for everything user-facing in Watcher24:
observability, admin, billing, documentation, and onboarding.

> Phases 1–6 are complete (Gateway, Worker, Python SDK, JS SDK, Realtime, initial Dashboard).
> This document covers Phase 7 (MVP completion) and beyond.

---

## Rename: `dashboard-nextjs` → `console`

Before any new work begins:

- Rename `apps/dashboard-nextjs/` → `apps/console/`
- Update `package.json` `name` field to `"console"`
- Update root `justfile` recipes: `dashboard-dev` → `console-dev`, etc.
- Update `CLAUDE.md` and `README.md` structure diagrams
- Update docs references inside the app's own `docs/` folder

---

## Phase 7A — Auth Flows & Onboarding

**Goal:** A new user can sign up, create an organisation, get an API key, and send their first event — all within the console, without touching the IAM admin panel.

### What to build

| Feature | Description |
|---|---|
| Sign-up page | Email + password registration (`/signup`) |
| Email verification | better-auth `emailOTP` or link-based flow |
| Forgot password | Password reset via email |
| Onboarding wizard | Multi-step flow after first login: create org → generate API key → pick SDK → send test event |
| Org creation | Users without an org are redirected to `/onboarding/create-org` |
| Post-login redirect | After login, detect active org; if none → onboarding; if yes → `/overview` |

### Files to add

```
src/app/(auth)/signup/page.tsx
src/app/(auth)/forgot-password/page.tsx
src/app/(auth)/verify-email/page.tsx
src/app/(onboarding)/layout.tsx
src/app/(onboarding)/create-org/page.tsx
src/app/(onboarding)/get-api-key/page.tsx
src/app/(onboarding)/install-sdk/page.tsx
src/app/(onboarding)/test-event/page.tsx
src/components/onboarding/StepIndicator.tsx
```

### better-auth additions to `auth-server.ts`

```ts
import { emailOTP } from "better-auth/plugins";

plugins: [
  emailOTP({ sendVerificationOTP: async ({ email, otp }) => { /* nodemailer */ } }),
  // existing: organization(), apiKey(), nextCookies()
]
```

---

## Phase 7B — Organisation & Team Management

**Goal:** Organisation owners can invite members, assign roles, manage teams, and configure org-level settings — all within the console.

### Pages to add

| Route | Description |
|---|---|
| `/settings/org` | Org name, slug, logo |
| `/settings/members` | Member list, invite by email, change role, remove |
| `/settings/teams` | Create/manage teams (groups of members) |
| `/settings/api-keys` | Move API key management here (currently in `/settings`) |
| `/settings/billing` | Link to Phase 7C billing page |

### Features per page

**Members (`/settings/members`)**
- List all members with role badge (owner / admin / member)
- Invite by email → better-auth `organization.inviteMember()`
- Change role → `organization.updateMemberRole()`
- Remove member → `organization.removeMember()`
- Pending invitations list with resend / cancel

**Teams (`/settings/teams`)**
- Create team → `organization.createTeam()`
- Add/remove members from a team
- Assign teams to specific environments or apps (future)

**Org Switcher (Header)**
- Dropdown in the header listing all orgs the user belongs to
- "Create new organisation" option at the bottom
- Calls `organization.setActive()` on switch → refreshes session → redirects to `/overview`

### better-auth org methods used

```ts
authClient.organization.create({ name, slug })
authClient.organization.setActive({ organizationId })
authClient.organization.inviteMember({ email, role })
authClient.organization.removeMember({ memberId })
authClient.organization.updateMemberRole({ memberId, role })
authClient.organization.getFullOrganization()
authClient.organization.listMembers()
```

---

## Phase 7C — Billing & Payments (Stripe)

**Goal:** Organisations can subscribe to a paid plan, manage their subscription, and the system enforces plan limits on ingestion volume.

### Plans

| Plan | Price | Event limit/month | Team members | Retention |
|---|---|---|---|---|
| Free | $0 | 100k events | 3 | 7 days |
| Pro | $49/mo | 5M events | 20 | 90 days |
| Enterprise | Custom | Unlimited | Unlimited | Custom |

### What to build

**better-auth stripe plugin** (add to `auth-server.ts`):
```ts
import { stripe } from "@better-auth/stripe";
import Stripe from "stripe";

const stripeClient = new Stripe(process.env.STRIPE_SECRET_KEY!);

plugins: [
  stripe({
    stripeClient,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET!,
    subscription: {
      enabled: true,
      plans: [
        { name: "free",       priceId: "price_xxx", limits: { events: 100_000 } },
        { name: "pro",        priceId: "price_xxx", limits: { events: 5_000_000 } },
        { name: "enterprise", priceId: "price_xxx", limits: { events: -1 } },
      ],
    },
  }),
  // existing plugins...
]
```

**Pages:**

| Route | Description |
|---|---|
| `/settings/billing` | Current plan, usage meter, upgrade/downgrade CTA |
| `/settings/billing/plans` | Plan comparison table |
| `/settings/billing/portal` | Redirect to Stripe Customer Portal |

**API routes:**
```
POST /api/billing/checkout          — create Stripe checkout session
POST /api/billing/portal            — create Stripe billing portal session
POST /api/webhooks/stripe           — Stripe webhook handler (plan changes)
GET  /api/billing/usage             — query ClickHouse for current month event count
```

**Enforcement:**
- Gateway checks org plan limit on every ingest (cached in Redis, refreshed every 5 min)
- When limit is reached → `429 Too Many Requests` with `X-Limit-Reason: plan_limit`
- Console shows a banner when org is within 80% of limit

**New env vars needed:**
```
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PRO_PRICE_ID=price_...
```

---

## Phase 7D — Documentation Site

**Goal:** A product documentation site built directly into the console at `/docs`, with a design similar to better-auth docs — sidebar navigation, search, code blocks with copy, dark mode.

### URL structure

```
/docs                          — overview / getting started
/docs/quickstart               — 5-minute quickstart
/docs/sdks/javascript          — JS SDK reference
/docs/sdks/python              — Python SDK reference
/docs/sdks/nextjs              — Next.js specific guide
/docs/api/ingestion            — Gateway REST API reference
/docs/api/authentication       — Auth / API key reference
/docs/configuration            — Environment variables
/docs/integrations/fastapi     — FastAPI middleware
/docs/integrations/express     — Express middleware
/docs/integrations/django      — Django integration
/docs/concepts/events          — Event types explained
/docs/concepts/organisations   — Multi-tenancy
/docs/concepts/retention       — Data retention and TTL
/docs/changelog                — Release history
```

### Tech choices

- **Content**: MDX files in `src/content/docs/` — easy to write, supports React components
- **Rendering**: `next-mdx-remote` or `@next/mdx` for MDX → React
- **Syntax highlighting**: `shiki` (same highlighter used by shadcn docs)
- **Search**: `fuse.js` for client-side search (simple, no server needed at MVP)
- **Layout**: Two-column — sidebar nav (collapsible sections) + content + right-side TOC

### Folder structure

```
src/
├── app/(docs)/
│   └── docs/
│       ├── layout.tsx              — sidebar + content shell
│       └── [...slug]/page.tsx      — dynamic MDX page renderer
├── content/docs/                   — all .mdx files live here
│   ├── index.mdx
│   ├── quickstart.mdx
│   ├── sdks/
│   │   ├── javascript.mdx
│   │   ├── python.mdx
│   │   └── nextjs.mdx
│   └── ...
└── components/docs/
    ├── DocsSidebar.tsx             — collapsible nav tree
    ├── DocsSearch.tsx              — fuse.js search modal
    ├── CodeBlock.tsx               — shiki-powered code block with copy button
    └── TableOfContents.tsx         — right-side heading anchor list
```

---

## Phase 7E — Admin Panel (Superadmin)

**Goal:** Platform operators (superadmins) can manage all organisations, users, and system health from within the console — currently this lives only in the IAM app.

### Pages to add (behind `/admin/*`, role-gated to `superadmin`)

| Route | Description |
|---|---|
| `/admin/overview` | Platform-wide stats (total orgs, total events today, error rate) |
| `/admin/organisations` | List all orgs, click into org detail |
| `/admin/organisations/[id]` | Org detail: members, plan, usage, API keys |
| `/admin/users` | List all users (mirrors IAM's user management) |
| `/admin/users/[id]` | User detail: sessions, orgs, ban/unban, impersonate |
| `/admin/api-keys` | List all API keys across all orgs, revoke any |
| `/admin/events` | Cross-org event explorer (no org filter) |

### Implementation notes

- Pages call the console's own API routes (`/api/admin/*`)
- API routes call `auth.api.*` (better-auth admin plugin) — same pattern as IAM
- Add `admin()` plugin to `auth-server.ts` (already in IAM, just not in console yet)
- Role gate: middleware checks `session.user.role === "superadmin"` for all `/admin/*` routes

---

## Summary: MVP Completion Checklist

```
Phase 7A — Auth & Onboarding
  [ ] Rename dashboard-nextjs → console
  [ ] Sign-up page
  [ ] Forgot password + email reset
  [ ] Onboarding wizard (org → key → SDK → test event)
  [ ] Redirect logic (no org → onboarding)

Phase 7B — Org & Team Management
  [ ] Org switcher in header
  [ ] /settings/members (invite, manage roles, remove)
  [ ] /settings/teams (create, add/remove members)
  [ ] /settings/org (name, slug, logo)

Phase 7C — Billing
  [ ] Stripe plugin wired into auth-server.ts
  [ ] /settings/billing (plan, usage, upgrade)
  [ ] /settings/billing/plans (comparison)
  [ ] Stripe webhook handler
  [ ] Usage meter from ClickHouse
  [ ] Gateway plan limit enforcement

Phase 7D — Documentation Site
  [ ] MDX pipeline set up
  [ ] /docs layout with sidebar + TOC
  [ ] Quickstart, SDK guides, API reference written
  [ ] Search (fuse.js)
  [ ] CodeBlock with copy button

Phase 7E — Admin Panel
  [ ] /admin/* routes behind superadmin role gate
  [ ] Platform overview stats
  [ ] All-orgs user and event management
```

---

## Phase 8 — Alert Engine (post-MVP)

A new lightweight service (or extension to `analytics-python`) that watches
ClickHouse for threshold conditions and fires notifications.

### Alert types
- Error rate > threshold (e.g. > 5% in 5 min window)
- Event volume spike / drop
- Specific event pattern match (e.g. `event_type = 'security'`)
- Custom ClickHouse query result

### Notification channels
- Webhook (generic HTTP POST)
- Email (via nodemailer / Resend)
- Slack (incoming webhook)
- PagerDuty (future)

### Data model (PostgreSQL)
```sql
alert_rules (id, org_id, name, condition_sql, threshold, window_minutes, channel, enabled)
alert_history (id, rule_id, triggered_at, resolved_at, payload)
```

### Implementation
- `apps/alerts-go` — new Go service with a ticker that runs each alert rule on schedule
- Console `/alerts` page — create/manage rules, view history
- Console `/settings/notifications` — configure channels

---

## Phase 9 — AI Analytics (post-MVP)

- Natural language query interface over ClickHouse ("what caused the error spike at 3am?")
- Anomaly detection (statistical baseline + deviation alerts)
- Smart error grouping (cluster similar errors, show root cause)
- AI-generated incident summaries
- Model: Claude API (Anthropic) for query generation + summarisation

---

## Phase 10 — Infrastructure & Enterprise (post-MVP)

- **Kafka migration**: Replace Redis Streams with Kafka for replay, consumer groups, higher throughput
- **Kubernetes**: Helm charts for all services, horizontal pod autoscaling
- **OpenTelemetry**: Native OTLP ingest endpoint in the gateway
- **SAML / SSO**: Enterprise single sign-on via better-auth SSO plugin
- **Data export**: CSV / Parquet export from ClickHouse via the console
- **Audit log compliance**: Immutable audit log export for SOC2 / GDPR
