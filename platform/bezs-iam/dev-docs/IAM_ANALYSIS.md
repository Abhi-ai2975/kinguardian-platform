# IAM Server — Comprehensive Analysis & Implementation Plan

> Generated: 2026-06-03 | Stack: Next.js 15, Better Auth 1.5.6, Prisma, PostgreSQL

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Implementation Audit](#current-implementation-audit)
3. [Critical Issues (Must Fix)](#critical-issues-must-fix)
4. [Better Auth — Missing Plugins & Features](#better-auth--missing-plugins--features)
5. [Security Analysis](#security-analysis)
6. [Agent Auth Protocol — Analysis & Gaps](#agent-auth-protocol--analysis--gaps)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Architecture Recommendations](#architecture-recommendations)

---

## Executive Summary

This is a production-grade IAM server built on Better Auth with clean architecture layering (entities → domain → application → infrastructure → interface-adapters → presentation → client). The codebase is mature and well-structured.

**The single most critical issue**: the `agentAuth` plugin is **commented out** in `auth.config.ts`, meaning all agent auth admin UI, service code, use cases, controllers, and schemas built for it are non-functional dead code at runtime. Every API call to agent endpoints will fail until this is restored.

Beyond that, roughly **12 Better Auth plugins** are installed/available but not used, several **security hardening steps** are missing, and the **Agent Auth Protocol** full specification has important flows not yet wired up.

---

## Current Implementation Audit

### Fully Implemented ✅

| Area | Admin Operations |
|---|---|
| **Users** | list, create, update, set role, ban/unban, delete, set password, revoke sessions, impersonate |
| **OAuth Clients** | list, create, update, delete, rotate secret, get single |
| **Sessions** | list all, revoke single, revoke all |
| **Organizations** | list, create, update, delete |
| **Members** | add, update role, remove |
| **Invitations** | create, cancel |
| **Teams** | create, update, remove, add/remove members |
| **Consents** | list, get, update scopes, delete |
| **Agent Auth (UI only)** | agents: list/update/revoke/reactivate/grant-capability/cleanup; hosts: list/create/update/revoke; approvals: list/approve-deny |
| **Apps & Menus** | full CRUD for apps and hierarchical menu nodes |
| **Resources & Actions** | full CRUD for resources and resource actions |
| **API Keys** | full CRUD |
| **Preference Templates** | full CRUD |
| **User Context** | set active org/role |

### Partially Implemented ⚠️

| Area | What's There | What's Missing |
|---|---|---|
| **Agent Auth** | Admin UI + service + use cases + controllers | Plugin is **commented out** — nothing works |
| **2FA** | Email OTP via `twoFactor` plugin | TOTP (app-based), recovery codes display, backup code flow |
| **OAuth Provider** | Core authorization, consent, client management | PKCE enforcement validation, custom claims richness, audience dynamic loading |
| **JWT** | `definePayload` with org context | Key rotation strategy, JWKS endpoint exposure |
| **Email** | Reset password, email verify, change email, delete account | No template system, raw HTML strings, no retry/queue |

### Not Implemented ❌

See [Better Auth — Missing Plugins](#better-auth--missing-plugins--features) section.

---

## Critical Issues (Must Fix)

### 🔴 P0 — AgentAuth Plugin Commented Out

**File:** `src/modules/server/auth-provider/auth.config.ts`

Lines 25–26 and 692–696 have `agentAuth` and `createFromOpenAPI` commented out. The entire `/api/auth/agent/*` and `/api/auth/host/*` and `/api/auth/capability/*` endpoint namespace does not exist at runtime.

**Impact:** All agent auth admin UI pages will get API errors on every operation. The `/.well-known/agent-configuration` route calls `auth.api.getAgentConfiguration()` which also fails.

**Fix (Phase 1):** Re-enable the plugin with a minimal capability definition:

```typescript
import { agentAuth } from "@better-auth/agent-auth";

// In plugins array:
agentAuth({
  providerName: "DrGodly IAM",
  providerDescription: "IAM server for DrGodly healthcare platform",
  modes: ["delegated", "autonomous"],
  capabilities: [
    { name: "read_profile", description: "Read user profile data" },
    // Add more per your domain
  ],
  async onExecute({ capability, arguments: args, agentSession }) {
    // Capability execution router
    throw new Error(`Unknown capability: ${capability}`);
  },
}),
```

**Fix (Phase 2):** Wire in `createFromOpenAPI` from the FHIR server spec once the FHIR server is available. The commented code at lines 688–696 is the right approach.

---

### 🔴 P0 — `requireRole` Has Type Errors and Logic Bug

**File:** `src/modules/server/shared/auth/require-role.ts`

```typescript
// Current — BROKEN
if (!session && !(session as any).user) {   // ← `!session` already covers the null case;
                                             //   `(session as any)` loses type safety
```

The condition `!session && !(session as any).user` is logically wrong — if `!session` is true, accessing `.user` would throw, and the `&&` prevents the second check from mattering. Additionally, `(session as any).role` on the next check casts away type safety.

**Fix:**
```typescript
export async function requireRole(roles: string[]) {
  const session = await getServerSession();
  const locale = await getLocale();

  if (!session?.user) {
    redirect({ href: "/auth/sign-in", locale });
  }

  const userRole = (session.user as { role?: string | null }).role;
  if (!userRole || !roles.includes(userRole)) {
    redirect({ href: "/", locale });
  }

  return session;
}
```

---

### 🔴 P0 — `console.log` in Production Auth Code

**File:** `src/modules/server/auth-provider/auth.config.ts:419`

```typescript
onPasswordReset: async ({ user }) => {
  console.log(`Password for user ${user.email} has been reset.`);  // LEAK PII
},
```

User email in console logs is a PII/GDPR issue. Replace with structured logger (`winston`) which is already installed.

---

### 🟠 P1 — No `verifyAgentRequest` in Any API Route

The agent JWT verification helper from `@better-auth/agent-auth` is documented in `AGENT_AUTH_GUIDE.md` but no API route in this application actually calls it. Any route that should accept agent calls is currently open.

**Files to add verification:** any protected API route that agents will call.

---

### 🟠 P1 — Rate Limiting Too Permissive

**File:** `auth.config.ts:225-229`

```typescript
rateLimit: {
  window: 60,
  max: 100,  // 100 req/min globally
},
```

For an IAM server, 100 req/min globally is extremely permissive. Better Auth supports per-endpoint rate limits.

**Recommendation:**
```typescript
rateLimit: {
  window: 60,
  max: 30,  // tighter global
  // Per-endpoint overrides:
  customRules: {
    "/sign-in": { window: 60, max: 5 },
    "/sign-up": { window: 60, max: 3 },
    "/forgot-password": { window: 60, max: 3 },
    "/two-factor/verify-otp": { window: 60, max: 5 },
  },
},
```

---

### 🟠 P1 — No Enrollment Token Display After Host Creation

**File:** `src/modules/client/admin/modals/agent-auth/CreateHostModal.tsx`

The `CreateHostResponseDtoSchema` captures `hostId`, `status`, and `default_capabilities` but the Agent Auth Protocol requires that an **enrollment token** be shown to the host operator after creation so agents can enroll. This enrollment token flow is not exposed in the admin UI.

The host creation response from `auth.api.createHost` should include an `enrollmentToken`. This needs to be displayed in a two-phase modal (like `CreateOAuthClientModal` shows the client secret).

---

## Better Auth — Missing Plugins & Features

### Not Used — High Priority

| Plugin | Package | Why Important |
|---|---|---|
| `bearer` | `better-auth/plugins` | API access for non-browser clients (CLI tools, mobile apps, backend services). Without it, API keys can't be used as bearer tokens |
| `passkey` | `better-auth/plugins` | WebAuthn/FIDO2 support — expected by modern enterprise users |
| `multiSession` | `better-auth/plugins` | Allow users to be logged into multiple accounts simultaneously |
| `emailOtp` | `better-auth/plugins` | Standalone email OTP for verification flows (different from 2FA) |
| `haveIBeenPwned` | `better-auth/plugins` | Block compromised passwords at registration/change — security baseline |
| `deviceAuthorization` | `better-auth/plugins` | OAuth 2.0 Device Flow — required for CLI tools and TV apps accessing this IAM |

### Not Used — Medium Priority

| Plugin | Package | Why Important |
|---|---|---|
| `mcp` | `better-auth/plugins` | Expose this IAM as an MCP server so AI agents can discover auth directly via MCP protocol |
| `captcha` | `better-auth/plugins` | Bot protection on sign-up and sign-in |
| `oneTimeToken` | `better-auth/plugins` | Secure single-use invite/reset links |
| `phoneNumber` | `better-auth/plugins` | SMS-based auth and 2FA |
| `oneTap` | `better-auth/plugins` | Google One Tap for frictionless sign-in |
| `genericOAuth` | `better-auth/plugins` | Allow connecting arbitrary OAuth providers without custom code |
| `anonymousUser` | `better-auth/plugins` | Let users start without registration, upgrade to full account |

### Not Used — Low Priority / Enterprise

| Plugin | Package | When Needed |
|---|---|---|
| `sso` | `better-auth/plugins` | SAML/SSO when enterprise clients require it |
| `scim` | `better-auth/plugins` | Directory sync (Okta, Azure AD) for enterprise |
| `siwe` | `better-auth/plugins` | Web3/Ethereum sign-in |
| `sentinel` | Better Auth Infrastructure | Enterprise security (impossible travel, credential stuffing detection) |

### Plugin: `bearer` — Implementation Steps

```typescript
// auth.config.ts — add to plugins:
import { bearer } from "better-auth/plugins";

bearer(),
```

Then in API routes that should accept bearer token auth:
```typescript
// API route that accepts both session cookies and bearer tokens
const session = await auth.api.getSession({
  headers: await headers(),
});
// bearer plugin makes this transparently handle `Authorization: Bearer <token>`
```

### Plugin: `haveIBeenPwned` — Implementation Steps

```typescript
import { haveibeenpwned } from "better-auth/plugins";

haveibeenpwned(),
// Automatically blocks sign-up and password change with compromised passwords
```

### Plugin: `deviceAuthorization` — Implementation Steps

```typescript
import { deviceAuthorization } from "better-auth/plugins";

deviceAuthorization({
  // Optional: customize device code expiry
  deviceCodeExpiresIn: 300, // 5 minutes
  pollingInterval: 5,
}),
```

Then expose the device code flow UI at a route agents/CLI tools can direct users to.

### Plugin: `multiSession` — Implementation Steps

```typescript
import { multiSession } from "better-auth/plugins";

multiSession({
  maximumSessions: 5,
}),
```

Enables `auth.api.listDeviceSessions`, `auth.api.revokeDeviceSession` in admin.

---

## Security Analysis

### Current Security Posture

| Category | Status | Notes |
|---|---|---|
| Rate Limiting | ⚠️ Weak | 100 req/min globally, no per-endpoint rules |
| Email Verification | ❌ Disabled | `REQUIRE_EMAIL_VERIFICATION = false` |
| Password Strength | ❌ None | No HIBP check, no complexity rules |
| CSRF Protection | ✅ Built-in | Better Auth handles via SameSite cookies |
| Session Security | ✅ OK | Cookie cache 60s, stored in DB |
| 2FA | ✅ Partial | Email OTP works; TOTP not available |
| OAuth Clients | ✅ Good | Secrets hashed, PKCE configurable |
| API Keys | ✅ Good | Prefixed, rate-limited per key |
| Admin Path Protection | ✅ OK | `requireRole` guards pages (but has bug — see P0) |
| Input Validation | ✅ Good | Zod everywhere, `safeParseAsync` in controllers |
| SQL Injection | ✅ N/A | Prisma parameterizes all queries |
| XSS | ✅ N/A | React escapes by default |
| PII in Logs | ❌ Yes | `console.log` with email in `onPasswordReset` |
| Cross-subdomain Cookies | ⚠️ Commented | `crossSubDomainCookies` block is disabled |
| Security Headers | ❌ None | No CSP, HSTS, X-Frame-Options in Next.js config |

### Recommended Security Fixes

#### 1. Enable Email Verification

```typescript
const REQUIRE_EMAIL_VERIFICATION = true;  // flip when ready
```

The OAuth authorize hook already gates unverified users correctly (auth.config.ts:487-509). The emailVerification flow is already built. Just flip the constant.

#### 2. Add Security Headers in `next.config.ts`

```typescript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline'",  // Next.js requires these
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob: https:",
      "font-src 'self'",
      "connect-src 'self' https:",
    ].join("; "),
  },
];

module.exports = {
  async headers() {
    return [{ source: "/(.*)", headers: securityHeaders }];
  },
};
```

#### 3. Add `haveIBeenPwned` Plugin

Block compromised passwords at sign-up and password change.

#### 4. Add Captcha for Auth Endpoints

```typescript
import { captcha } from "better-auth/plugins";

captcha({
  provider: "cloudflare-turnstile",
  secretKey: process.env.TURNSTILE_SECRET_KEY!,
  endpoints: ["/sign-up", "/sign-in"],
}),
```

#### 5. Proper API Key Rate Limiting

The `apiKey` plugin supports per-key rate limiting. Current config uses defaults. Define explicit limits:

```typescript
apiKey({
  defaultPrefix: "drgodly_",
  defaultRateLimitMax: 1000,
  defaultRateLimitTimeWindow: 86400000, // 24h
  enableMetadata: true,
}),
```

#### 6. Session Hardening

Add absolute session expiry and idle timeout:

```typescript
session: {
  storeSessionInDatabase: true,
  expiresIn: 60 * 60 * 24 * 7,  // 7 days absolute
  updateAge: 60 * 60 * 24,       // refresh if >1 day old
  cookieCache: {
    enabled: true,
    maxAge: 60,
  },
},
```

---

## Agent Auth Protocol — Analysis & Gaps

### Protocol Overview (from agentauthprotocol.com)

The Agent Auth Protocol defines four core flows:
1. **Discovery** — `/.well-known/agent-configuration` — ✅ Implemented
2. **Registration** — agent POSTs to `/agent/register` or enrolls via host token
3. **Authentication** — agent creates short-lived Ed25519 JWT, presents as `AgentAuth <jwt>`
4. **Capability Execution** — agent calls `/capability/execute` with auth JWT

### What's Implemented in This Codebase

| Flow | Status | Notes |
|---|---|---|
| Discovery endpoint | ✅ | `/.well-known/agent-configuration` route exists |
| Agent schema (DB) | ✅ | `Agent`, `AgentHost`, `AgentCapabilityGrant`, `ApprovalRequest` models |
| Admin: list agents | ✅ | UI + service + use case + controller |
| Admin: update agent | ✅ | Full stack |
| Admin: revoke/reactivate agent | ✅ | Full stack |
| Admin: grant capability | ✅ | Full stack |
| Admin: cleanup expired | ✅ | Full stack |
| Admin: list hosts | ✅ | Full stack |
| Admin: create host | ✅ | Full stack (but enrollment token not displayed) |
| Admin: update host | ✅ | Full stack |
| Admin: revoke host | ✅ | Full stack |
| Admin: list approvals (CIBA) | ✅ | Full stack |
| Admin: approve/deny capability | ✅ | Full stack |
| **`agentAuth` plugin enabled** | ❌ | **Commented out — everything above is dead code** |

### What's Missing / Not Implemented

| Missing Item | Priority | Details |
|---|---|---|
| `agentAuth` plugin enabled | 🔴 P0 | Must uncomment and configure — blocks everything |
| Enrollment token display | 🔴 P0 | After `createHost`, enrollment token must be shown once (like OAuth client secret) |
| `verifyAgentRequest` in API routes | 🟠 P1 | No route verifies agent JWTs — agent auth can't protect anything |
| Capability endpoint (`/capability/execute`) | 🟠 P1 | Agents have no way to execute registered capabilities |
| Capability executor registry | 🟠 P1 | `onExecute` in `agentAuth` plugin is commented out |
| `rotateKey` for agents | 🟡 P2 | `POST /api/auth/agent/rotate-key` exists in protocol but not exposed in admin UI |
| Get single agent view | 🟡 P2 | `GET /api/auth/agent/get?agent_id=` — admin detail page missing |
| Get single host view | 🟡 P2 | `GET /api/auth/host/get?host_id=` — admin detail page missing |
| `hostEnroll` admin action | 🟡 P2 | Generate enrollment token for host programmatically |
| Agent status badge detail | 🟡 P2 | Agent status `claimed` and `rejected` states not shown distinctly in UI |
| CIBA notification endpoint | 🟡 P2 | `clientNotificationEndpoint` in `ApprovalRequest` schema unused |
| Host `switch-account` | 🟢 P3 | Move host to different user — not in admin UI |
| Agent introspect UI | 🟢 P3 | `POST /api/auth/agent/introspect` — no admin UI |
| Device code flow page | 🟢 P3 | The protocol defines a device code page for browser-less auth |
| FHIR OpenAPI integration | 🟢 P3 | `createFromOpenAPI` was intended, still commented |
| Capability catalog UI | 🟢 P3 | No admin UI for listing/describing available capabilities |
| Batch capability execute | 🟢 P3 | `/capability/batch-execute` not wired |
| Agent SDK usage example | 🟢 P3 | No example of client agent using this server |

### Agent Auth — Enable Plugin (Exact Steps)

**Step 1:** Update `auth.config.ts` — uncomment and configure:

```typescript
import { agentAuth } from "@better-auth/agent-auth";

// In plugins array, replace the commented block with:
agentAuth({
  providerName: "DrGodly IAM",
  providerDescription: "Authentication provider for DrGodly healthcare platform",
  modes: ["delegated", "autonomous"],

  capabilities: [
    {
      name: "read_profile",
      description: "Read the authenticated user's profile",
    },
    {
      name: "read_organizations",
      description: "Read organizations the user belongs to",
    },
    {
      name: "manage_api_keys",
      description: "Create and revoke API keys on behalf of the user",
    },
    // Add FHIR-specific capabilities when ready:
    // { name: "fhir_patient_read", description: "Read FHIR patient data" },
  ],

  async onExecute({ capability, arguments: args, agentSession }) {
    switch (capability) {
      case "read_profile":
        return { userId: agentSession.user?.id, name: agentSession.user?.name };
      case "read_organizations":
        // Query prisma for user's orgs
        return { organizations: [] };
      default:
        throw new Error(`Capability '${capability}' not implemented`);
    }
  },
}),
```

**Step 2:** Update `CreateHostModal` to two-phase (show enrollment token after creation):

The `CreateHostResponseDtoSchema` needs to include `enrollmentToken`. Check the actual `auth.api.createHost` return type and update the schema, then display the token in the modal like `CreateOAuthClientModal` does for client secrets.

**Step 3:** Add `verifyAgentRequest` to any protected API route:

```typescript
// src/app/api/agent-protected/route.ts
import { verifyAgentRequest } from "@better-auth/agent-auth";
import { auth } from "@/modules/server/auth-provider/auth";

export async function POST(request: Request) {
  const agentSession = await verifyAgentRequest(request, auth);
  if (!agentSession) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }
  // agentSession.agent — the verified agent
  // agentSession.capabilities — what it's allowed to do
  return Response.json({ ok: true });
}
```

---

## Implementation Roadmap

### Phase 1 — Critical Fixes (Do First)

| Task | File(s) | Effort |
|---|---|---|
| Re-enable `agentAuth` plugin | `auth.config.ts` | S |
| Fix `requireRole` type bug | `require-role.ts` | S |
| Replace `console.log` with `winston` logger | `auth.config.ts:419` | S |
| Fix per-endpoint rate limits | `auth.config.ts` | S |
| Show enrollment token after host creation | `CreateHostModal.tsx`, `CreateHostResponseDtoSchema` | M |
| Add `verifyAgentRequest` to protected routes | New API routes | M |

### Phase 2 — Security Hardening

| Task | File(s) | Effort |
|---|---|---|
| Add `bearer` plugin | `auth.config.ts` | S |
| Add `haveIBeenPwned` plugin | `auth.config.ts` | S |
| Add security headers | `next.config.ts` | S |
| Tighten per-endpoint rate limits | `auth.config.ts` | S |
| Enable `crossSubDomainCookies` | `auth.config.ts` | S |
| Session expiry configuration | `auth.config.ts` | S |
| Enable email verification | `auth.config.ts` | S → requires signup flow update |

### Phase 3 — Missing Better Auth Plugins

| Task | Plugin | Effort |
|---|---|---|
| WebAuthn/Passkey | `passkey` | L (UI + API) |
| Multi-session | `multiSession` | M (admin UI exists partially) |
| Phone number auth | `phoneNumber` | M |
| Google One Tap | `oneTap` | S |
| Email OTP standalone | `emailOtp` | S |
| Device Authorization Grant | `deviceAuthorization` | M |
| MCP server plugin | `mcp` | M |
| Captcha | `captcha` | S |
| Generic OAuth | `genericOAuth` | S |

### Phase 4 — Agent Auth Protocol Completion

| Task | Effort |
|---|---|
| Capability executor: implement `onExecute` handlers | M |
| Agent rotate-key admin UI | M |
| Agent/Host detail page (single record view) | M |
| CIBA notification endpoint integration | L |
| Device code flow page | M |
| Capability catalog admin UI | M |
| FHIR OpenAPI `createFromOpenAPI` integration | L |
| Agent SDK example / documentation | M |

### Phase 5 — Enterprise Additions

| Task | Notes |
|---|---|
| SAML/SSO plugin | When enterprise clients require it |
| SCIM directory sync | For Okta/Azure AD integration |
| Better Auth Infrastructure `sentinel` | Impossible-travel, credential-stuffing detection |
| Better Auth Infrastructure `dash` | Analytics and audit logs dashboard |
| Telemetry (`@better-auth/telemetry`) | OpenTelemetry integration |
| Redis secondary storage for sessions | Performance at scale |

---

## Architecture Recommendations

### 1. Session Caching — Add Redis

Current: cookie cache only (60s TTL). At scale, you need a distributed cache so multiple Next.js instances share session state.

```typescript
import { redis } from "@better-auth/redis"; // or use ioredis directly

session: {
  storeSessionInDatabase: true,
  secondaryStorage: redis({
    url: process.env.REDIS_URL!,
    ttl: 3600,
  }),
  cookieCache: {
    enabled: true,
    maxAge: 60,
  },
},
```

### 2. Email — Replace Raw HTML with Template System

Current: inline HTML strings in `auth.config.ts`. The existing `getEmailVerificationTemplate` function is the right pattern but only used for email verification.

Apply the same pattern to all emails:
- `src/modules/shared/email-templates/auth-email.templates.ts` — add all templates here
- `sendResetPassword`, `onExistingUserSignUp`, magic link — all use raw HTML strings currently

### 3. Agent Auth — Capability Design

When enabling `agentAuth`, capabilities should be designed around your actual domain resources. Suggested schema:

```
<resource>:<action>
  patient:read
  patient:write
  appointment:read
  appointment:create
  prescription:read
  prescription:create
  fhir:*          (wildcard for full FHIR access)
  admin:users     (IAM management capabilities)
  admin:orgs
```

### 4. `customSession` Performance

The current `buildUserContext` function runs 4+ database queries on every session validation. With 60s cookie cache this is acceptable, but:
- The function builds the **entire nav tree** on every cache miss
- If the cache is disabled or TTL is reduced, this becomes a bottleneck
- Recommendation: break into lazy-loaded parts or cache at the app layer

### 5. DI Container — Consider Lazy Binding

Currently every module is eagerly registered. For an IAM server that may be cold-started frequently (serverless), lazy DI binding reduces initial load time.

### 6. Missing Index on `oauthAccessToken.token`

In `schema.prisma`, `OauthAccessToken` has `@@unique([token])` but no separate index. The unique constraint creates an implicit index, so this is fine — but verify token lookups are fast under load.

### 7. `inversify` vs `@evyweb/ioctopus` Conflict

`package.json` lists **both** `inversify@7.10.8` and `@evyweb/ioctopus@1.3.1` as dependencies. The codebase uses `ioctopus` exclusively. `inversify` appears unused — remove it to reduce bundle size:

```bash
pnpm remove inversify reflect-metadata  # if inversify is the only reason for reflect-metadata
```

Verify with: `pnpm dlx madge src/modules --circular --extensions ts` (the `deps` script).

---

## Quick Reference: What to Do Right Now

```
Priority  Task                                          File
────────────────────────────────────────────────────────────────────────
P0        Re-enable agentAuth plugin                   auth.config.ts
P0        Fix requireRole logic bug                    require-role.ts
P0        Remove console.log with user email           auth.config.ts:419
P0        Show enrollment token after host creation    CreateHostModal.tsx
P1        Add bearer plugin                            auth.config.ts
P1        Add haveIBeenPwned plugin                   auth.config.ts
P1        Tighten rate limits (per-endpoint)           auth.config.ts
P1        Add verifyAgentRequest to API routes         new files
P1        Add security headers                         next.config.ts
P1        Remove unused `inversify` package            package.json
P2        Add passkey plugin                           auth.config.ts + UI
P2        Add deviceAuthorization plugin               auth.config.ts + UI
P2        Add multiSession plugin                      auth.config.ts + UI
P2        Agent detail page                            new admin page
P2        Capability catalog page                      new admin page
P3        FHIR OpenAPI integration (createFromOpenAPI) auth.config.ts
P3        Redis secondary session storage              auth.config.ts
P3        Email template system                        email-templates/
P3        Capability onExecute handlers                auth.config.ts
```
