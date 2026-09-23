# Implementation Plan — IAM Server

> Phased delivery plan. Each phase is independently shippable. Phases are ordered by impact/risk.
> Effort: XS < 30min | S < 2h | M < 1 day | L < 3 days

---

## Phase 1 — Critical Fixes (Unblock Everything)

These are bugs and misconfigurations that break existing functionality. Do these before anything else.

---

### 1.1 — Re-enable `agentAuth` Plugin

**Effort:** S  
**Files:** `src/modules/server/auth-provider/auth.config.ts`

The entire agent-auth admin UI, service layer, use cases, and controllers are already built. The plugin just needs to be enabled with a capability definition.

**Steps:**

1. Uncomment the import at line ~25:
```typescript
import { agentAuth } from "@better-auth/agent-auth";
```

2. Replace the commented-out block at lines ~692–759 with:
```typescript
agentAuth({
  providerName: "DrGodly IAM",
  providerDescription: "Central authentication authority for the DrGodly healthcare platform",
  modes: ["delegated", "autonomous"],

  capabilities: [
    { name: "profile:read", description: "Read the authenticated user's profile" },
    { name: "profile:write", description: "Update the authenticated user's profile" },
    { name: "organizations:read", description: "List organizations the user belongs to" },
    { name: "api_keys:read", description: "List API keys for the authenticated user" },
    { name: "api_keys:create", description: "Create API keys on behalf of the user" },
    { name: "api_keys:revoke", description: "Revoke API keys" },
  ],

  async onExecute({ capability, arguments: args, agentSession }) {
    switch (capability) {
      case "profile:read":
        return { id: agentSession.user?.id, name: agentSession.user?.name, email: agentSession.user?.email };
      default:
        throw new Error(`Capability '${capability}' not yet implemented`);
    }
  },
}),
```

3. Verify `/.well-known/agent-configuration` returns the capability list.

**Definition of done:** `GET /.well-known/agent-configuration` returns JSON with capabilities. Admin agent-auth page loads without errors.

---

### 1.2 — Fix `requireRole` Bug

**Effort:** XS  
**File:** `src/modules/server/shared/auth/require-role.ts`

Current code has a wrong null-check and loses type safety via `as any`.

**Replace entire file content:**
```typescript
import { redirect } from "@/i18n/navigation";
import { getServerSession } from "../../auth-provider/auth-server";
import { getLocale } from "next-intl/server";

export async function requireRole(roles: string[]) {
  const [session, locale] = await Promise.all([
    getServerSession(),
    getLocale(),
  ]);

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

### 1.3 — Remove PII from Production Logs

**Effort:** XS  
**File:** `src/modules/server/auth-provider/auth.config.ts:419`

```typescript
// Before:
onPasswordReset: async ({ user }) => {
  console.log(`Password for user ${user.email} has been reset.`);
},

// After:
onPasswordReset: async ({ user }) => {
  // no-op or use structured logger without PII
},
```

---

### 1.4 — Show Enrollment Token After Host Creation

**Effort:** M  
**Files:**
- `src/modules/entities/schemas/admin/agent-auth/agent-auth.schema.ts`
- `src/modules/client/admin/modals/agent-auth/CreateHostModal.tsx`

**Step 1** — Update schema to include enrollment token:
```typescript
// In agent-auth.schema.ts
export const CreateHostResponseDtoSchema = z.object({
  hostId: z.string(),
  default_capabilities: z.array(z.string()),
  status: z.string(),
  enrollmentToken: z.string().optional(),  // ← add
  enrollmentTokenExpiresAt: z.coerce.date().optional(),  // ← add
});
```

**Step 2** — Convert `CreateHostModal` to two-phase (form → credential display):
- Phase 1: show the create form (current behavior)
- Phase 2: on success, switch to show `hostId` + `enrollmentToken` with copy buttons

Follow the same pattern as `CreateOAuthClientModal.tsx` (two-phase: form → credentials).

**Definition of done:** After creating a host, the modal switches to show the Host ID and Enrollment Token with copy buttons. Token is not shown again on subsequent opens.

---

### 1.5 — Tighten Rate Limits

**Effort:** S  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
rateLimit: {
  window: 60,
  max: 50,
  customRules: {
    "/sign-in/email":              { window: 60,  max: 5 },
    "/sign-up/email":              { window: 60,  max: 3 },
    "/forget-password":            { window: 300, max: 3 },
    "/reset-password":             { window: 300, max: 5 },
    "/two-factor/verify-otp":      { window: 60,  max: 5 },
    "/magic-link/send-magic-link": { window: 60,  max: 3 },
    "/oauth2/token":               { window: 60,  max: 30 },
    "/agent/register":             { window: 300, max: 10 },
    "/capability/execute":         { window: 60,  max: 60 },
  },
},
```

---

**Phase 1 Checklist:**
```
□ agentAuth plugin uncommented and configured
□ /.well-known/agent-configuration returns capabilities
□ Admin /agent-auth page loads without API errors
□ requireRole compiles without type errors
□ console.log removed from auth.config.ts
□ CreateHostModal shows enrollment token after creation
□ Rate limits updated
```

---

## Phase 2 — Security Hardening

---

### 2.1 — Add Security Response Headers

**Effort:** S  
**File:** `next.config.ts`

```typescript
const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

// Add to nextConfig:
async headers() {
  return [{ source: "/(.*)", headers: securityHeaders }];
},
```

---

### 2.2 — Add `bearer` Plugin

**Effort:** XS  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { bearer } from "better-auth/plugins";

// Add to plugins array:
bearer(),
```

Enables `Authorization: Bearer <token>` for non-browser clients. No other changes needed.

---

### 2.3 — Add `haveibeenpwned` Plugin

**Effort:** XS  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { haveibeenpwned } from "better-auth/plugins";

// Add to plugins array:
haveibeenpwned(),
```

No config. Automatically blocks compromised passwords at sign-up and password change using k-anonymity (sends only hash prefix).

---

### 2.4 — Add Session Absolute Expiry

**Effort:** XS  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
session: {
  storeSessionInDatabase: true,
  expiresIn: 60 * 60 * 24 * 7,   // 7-day absolute expiry
  updateAge: 60 * 60 * 24,         // refresh if >1 day old
  cookieCache: {
    enabled: true,
    maxAge: 60,
  },
},
```

---

### 2.5 — Enable Email Verification

**Effort:** S  
**File:** `src/modules/server/auth-provider/auth.config.ts:202`

```typescript
const REQUIRE_EMAIL_VERIFICATION = true;
```

Everything else (email sending, OAuth authorize gate, auto-sign-in after verify) is already wired correctly. Only change needed: update the sign-up success UI to show "check your email" state instead of redirecting directly into the app.

**Sign-up page change:** After `signUp` success when email verification is required, redirect to `/auth/verify-email?email=<email>` or show an inline message.

---

### 2.6 — Consolidate Email Templates

**Effort:** M  
**File:** `src/modules/shared/email-templates/auth-email.templates.ts`

Add helpers for all remaining raw-HTML emails in `auth.config.ts`:

```typescript
export function getPasswordResetTemplate(url: string, name: string): string { ... }
export function getChangeEmailTemplate(url: string, name: string): string { ... }
export function getDeleteAccountTemplate(url: string, name: string): string { ... }
export function getMagicLinkTemplate(url: string): string { ... }
export function get2FAOtpTemplate(otp: string): string { ... }
export function getOnboardingEmailTemplate(email: string, name: string): string { ... }
```

Replace the bare `<a href="${url}">` strings in `auth.config.ts` with these helpers.

---

### 2.7 — Remove Unused `inversify` Package

**Effort:** XS

```bash
pnpm remove inversify
```

Verify with `pnpm dlx madge src/modules --circular --extensions ts` that nothing imports it. Keep `reflect-metadata` only if something else uses it.

---

**Phase 2 Checklist:**
```
□ Security headers present on all routes (check with browser devtools)
□ bearer plugin added — test with Authorization: Bearer <token> header
□ haveibeenpwned blocks "password123" at sign-up
□ Sessions expire after 7 days (verify in DB)
□ Email verification enabled — new sign-up requires email confirmation
□ All email templates use helper functions (no raw HTML in auth.config.ts)
□ inversify removed from package.json
```

---

## Phase 3 — Agent Auth Protocol Completion

---

### 3.1 — Implement Capability Handlers

**Effort:** M  
**File:** `src/modules/server/auth-provider/auth.config.ts` (or extracted module)

Flesh out the `onExecute` handler with real implementations. Create a dedicated executor module:

**New file:** `src/modules/server/agent-auth/capability-executor.ts`

```typescript
import { prisma } from "@/prisma/db";

type AgentSession = {
  agent: { id: string; name: string; mode: string };
  user?: { id: string; email: string; name: string } | null;
  capabilities: string[];
};

export async function executeCapability(
  capability: string,
  args: Record<string, unknown>,
  agentSession: AgentSession,
) {
  switch (capability) {
    case "profile:read": {
      if (!agentSession.user) throw new Error("Requires delegated agent");
      return prisma.user.findUnique({
        where: { id: agentSession.user.id },
        select: { id: true, name: true, email: true, image: true },
      });
    }

    case "organizations:read": {
      if (!agentSession.user) throw new Error("Requires delegated agent");
      const members = await prisma.member.findMany({
        where: { userId: agentSession.user.id },
        include: { organization: { select: { id: true, name: true, slug: true } } },
      });
      return { organizations: members.map((m) => m.organization) };
    }

    case "api_keys:read": {
      if (!agentSession.user) throw new Error("Requires delegated agent");
      // List non-revoked API keys for user
      return { keys: [] };
    }

    default:
      throw new Error(`Capability '${capability}' is not implemented`);
  }
}
```

Then reference it in `auth.config.ts`:
```typescript
import { executeCapability } from "@/modules/server/agent-auth/capability-executor";

agentAuth({
  // ...
  async onExecute({ capability, arguments: args, agentSession }) {
    return executeCapability(capability, args ?? {}, agentSession);
  },
}),
```

---

### 3.2 — Add `verifyAgentRequest` to Protected Routes

**Effort:** S  
**New file:** `src/modules/server/agent-auth/require-agent-auth.ts`

```typescript
import { verifyAgentRequest } from "@better-auth/agent-auth";
import { auth } from "@/modules/server/auth-provider/auth";

export async function requireAgentAuth(request: Request) {
  const session = await verifyAgentRequest(request, auth);
  if (!session) {
    throw Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session;
}

export async function requireCapability(request: Request, capability: string) {
  const session = await requireAgentAuth(request);
  if (!session.capabilities.includes(capability)) {
    throw Response.json({ error: `Missing capability: ${capability}` }, { status: 403 });
  }
  return session;
}
```

Apply to any API route agents will call. Start with a test route to verify the JWT flow works end-to-end.

---

### 3.3 — Agent Rotate Key (Admin UI)

**Effort:** M  
**Follow the standard SKILL.md pattern for a new mutation.**

**Files to create:**
- Schema: add `RotateAgentKeyValidationSchema` + `RotateAgentKeyActionSchema` to `agent-auth.schema.ts`
- Use case: `src/.../usecases/agent-auth/rotateAgentKey.usecase.ts`
- Controller: `src/.../controllers/agent-auth/rotateAgentKey.controller.ts`
- Action: add `rotateAgentKeyAction` to `agentauth.action.ts`
- Modal: `src/modules/client/admin/modals/agent-auth/RotateAgentKeyModal.tsx`
- Add modal type `"rotateAgentKey"` to `admin.store.ts`
- Add to `AgentAuthModalProvider`
- Add menu item in `AgentsTableColumn.tsx`

**API call:**
```typescript
await auth.api.rotateKey({ headers: await headers(), body: { agent_id: payload.agent_id } });
```

---

### 3.4 — TOTP Support in 2FA

**Effort:** M  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
twoFactor({
  skipVerificationOnEnable: true,
  totpOptions: {
    issuer: "DrGodly IAM",
  },
  otpOptions: {
    sendOTP: async ({ user, otp }) => {
      await sendAuthEmail({
        to: user.email,
        subject: "Your 2FA code",
        html: get2FAOtpTemplate(otp),
      });
    },
  },
}),
```

**UI changes needed:**
- Settings page: show "Set up authenticator" option
- On enable: display QR code (`authClient.twoFactor.getTotpUri`)
- Sign-in flow: ask for TOTP code when 2FA is enabled

---

### 3.5 — `multiSession` Plugin + Admin UI

**Effort:** M  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { multiSession } from "better-auth/plugins";

multiSession({ maximumSessions: 5 }),
```

**Admin UI:** Extend the Sessions page (`/admin/sessions`) to show per-user session details including device/browser info. The sessions service already has `getAllSessions` — verify it returns the `userAgent` and `ipAddress` fields for display.

---

**Phase 3 Checklist:**
```
□ capability:execute returns real data for profile:read
□ Agent with no grant for X gets 403 when executing X
□ requireAgentAuth rejects invalid/expired JWTs
□ Rotate agent key works from admin UI
□ TOTP setup flow works (scan QR → verify → enabled)
□ Multiple sessions visible in admin sessions page
```

---

## Phase 4 — More Auth Methods

---

### 4.1 — `deviceAuthorization` Plugin

**Effort:** M  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { deviceAuthorization } from "better-auth/plugins";

deviceAuthorization({
  deviceCodeExpiresIn: 300,
  pollingInterval: 5,
}),
```

**New page:** `src/app/[locale]/auth/device/page.tsx`

The device flow: CLI tool calls `POST /api/auth/device/code` → gets `user_code` → tells user to visit this page → user approves → CLI polls for token.

```typescript
// Minimal device approval page
async function DevicePage({ searchParams }: { searchParams: Promise<{ user_code?: string }> }) {
  const { user_code } = await searchParams;
  // Show user_code, Approve / Deny buttons
  // Approve: call auth.api.approveDeviceRequest({ body: { userCode: user_code } })
  // Deny: call auth.api.denyDeviceRequest({ body: { userCode: user_code } })
}
```

---

### 4.2 — `passkey` Plugin (WebAuthn)

**Effort:** L  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { passkey } from "better-auth/plugins";

passkey({
  rpName: "DrGodly IAM",
  rpId: process.env.PASSKEY_RP_ID ?? "localhost",
  origin: process.env.BETTER_AUTH_URL!,
}),
```

**UI changes:**
1. Sign-in page: add "Sign in with passkey" button
2. Settings page: add passkey management (register new, list existing, revoke)
3. Sign-up: offer passkey setup after account creation

**Client:**
```typescript
import { passkeyClient } from "better-auth/client/plugins";
// add to auth client plugins array
```

---

### 4.3 — `captcha` Plugin

**Effort:** S  
**File:** `src/modules/server/auth-provider/auth.config.ts`

Requires a Cloudflare Turnstile account (free tier available at cloudflare.com/turnstile):

```typescript
import { captcha } from "better-auth/plugins";

captcha({
  provider: "cloudflare-turnstile",
  secretKey: process.env.TURNSTILE_SECRET_KEY!,
  endpoints: ["/sign-up/email", "/sign-in/email", "/forget-password"],
}),
```

Add env var:
```
TURNSTILE_SECRET_KEY=<from Cloudflare dashboard>
NEXT_PUBLIC_TURNSTILE_SITE_KEY=<from Cloudflare dashboard>
```

Add Turnstile widget to sign-in and sign-up forms.

---

### 4.4 — `emailOtp` Plugin

**Effort:** S  
**File:** `src/modules/server/auth-provider/auth.config.ts`

Standalone email OTP separate from 2FA — useful for confirming sensitive operations:

```typescript
import { emailOtp } from "better-auth/plugins";

emailOtp({
  sendVerificationOtp: async ({ email, otp, type }) => {
    await sendAuthEmail({
      to: email,
      subject: type === "sign-in" ? "Your sign-in code" : "Your verification code",
      html: get2FAOtpTemplate(otp),
    });
  },
  expiresIn: 600,
}),
```

---

### 4.5 — Google One Tap

**Effort:** S  
**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { oneTap } from "better-auth/plugins";

oneTap(),
```

Add `NEXT_PUBLIC_GOOGLE_CLIENT_ID` env var (same as `GOOGLE_CLIENT_ID`). Add the One Tap component to the sign-in page. It auto-prompts users already signed into Google.

---

### 4.6 — `phoneNumber` Plugin

**Effort:** M  
**File:** `src/modules/server/auth-provider/auth.config.ts`

Requires an SMS provider (Twilio free trial, or similar):

```typescript
import { phoneNumber } from "better-auth/plugins";

phoneNumber({
  sendOTP: async ({ phoneNumber, otp }) => {
    // Twilio / AWS SNS / any SMS provider
    await smsClient.send({ to: phoneNumber, body: `Your code: ${otp}` });
  },
  signInWithPhoneNumber: true,
  expiresIn: 300,
}),
```

---

**Phase 4 Checklist:**
```
□ Device code flow: CLI gets code, user approves on /auth/device, CLI gets token
□ Passkey registration and sign-in works in Chrome/Safari
□ Captcha blocks bot sign-up attempts
□ Email OTP: send code → verify code flow works
□ Google One Tap prompts on sign-in page
□ Phone number sign-in works (if SMS provider configured)
```

---

## Phase 5 — MCP & Agent Ecosystem

---

### 5.1 — `mcp` Plugin

**Effort:** M  
**File:** `src/modules/server/auth-provider/auth.config.ts`

Exposes this IAM server as an MCP server so AI clients (Claude Desktop, etc.) can discover and use auth through MCP protocol:

```typescript
import { mcp } from "better-auth/plugins";

mcp({
  loginPage: process.env.LOGIN_PAGE!,
}),
```

This adds MCP-compatible endpoints that AI agent frameworks can call to authenticate users and check permissions without going through REST directly.

---

### 5.2 — FHIR OpenAPI Integration (agentAuth)

**Effort:** L  
**Prerequisite:** FHIR server must be running and have OpenAPI spec available at `FHIR_OPENAPI_URL`

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { createFromOpenAPI } from "@better-auth/agent-auth/openapi";
import { getJwtToken } from "better-auth/plugins/jwt";

// Make auth creation async to await the spec
export async function createAuthConfig() {
  const spec = await fetch(process.env.FHIR_OPENAPI_URL!).then((r) => r.json());

  return {
    // ... all existing config ...
    plugins: [
      // ... existing plugins ...
      agentAuth({
        ...createFromOpenAPI(spec, {
          baseUrl: process.env.FHIR_SERVER_URL!,
          async resolveHeaders({ ctx }) {
            const token = await getJwtToken(ctx);
            return { Authorization: `Bearer ${token}` };
          },
        }),
        modes: ["delegated", "autonomous"],
      }),
    ],
  };
}
```

Update `auth.ts` to use the factory:
```typescript
import { createAuthConfig } from "./auth.config";
export const auth = betterAuth(await createAuthConfig());
```

---

### 5.3 — Agent Detail Page

**Effort:** M  
**New page:** `src/app/[locale]/admin/agent-auth/agents/[agentId]/page.tsx`

Show full agent info including all capability grants, approval history, and last used time.

**API:** `auth.api.getAgent({ query: { agent_id }, headers: await headers() })`

Follow the same pattern as `/admin/organizations/[organizationId]/page.tsx`.

---

### 5.4 — Host Detail Page

**Effort:** M  
**New page:** `src/app/[locale]/admin/agent-auth/hosts/[hostId]/page.tsx`

Show full host info, list all agents under the host, enrollment status.

**API:** `auth.api.getHost({ query: { host_id }, headers: await headers() })`

---

### 5.5 — Capability Catalog Page

**Effort:** M  
**New page:** `src/app/[locale]/admin/agent-auth/capabilities/page.tsx`

List all capabilities registered on the server with name, description, and input schema. Allow admins to see which agents have which grants.

**API:** `auth.api.listCapabilities({ headers: await headers() })`

---

**Phase 5 Checklist:**
```
□ MCP plugin: Claude Desktop can connect to this IAM server via MCP
□ FHIR: agentAuth auto-generates capabilities from FHIR OpenAPI spec
□ Agent detail page shows capability grants and approval history
□ Host detail page shows all agents under each host
□ Capability catalog page lists all registered capabilities
```

---

## Phase 6 — Polish & Completeness

Lower-priority items that round out the implementation.

---

### 6.1 — TOTP Backup Codes UI

When a user enables TOTP 2FA, Better Auth generates backup codes. Add a page/modal to:
- Display backup codes after enabling TOTP (one-time display)
- Let users regenerate backup codes from settings
- Store reminder that codes have been saved

---

### 6.2 — `genericOAuth` Plugin

Add support for custom OAuth providers without extra code:

```typescript
import { genericOAuth } from "better-auth/plugins";

genericOAuth({
  config: [
    // Add any OAuth2 provider by config
  ],
}),
```

Useful when a connected application has its own OAuth server that staff need to sign in with.

---

### 6.3 — Agent `switch-account`

Allow admins to move a host from one user to another. Add to admin UI:

**API:** `auth.api.switchAccount({ headers: await headers(), body: { host_id, new_user_id } })`

Useful when a service is transferred between team members.

---

### 6.4 — CIBA Notification Endpoint

The `ApprovalRequest` model has `clientNotificationEndpoint` and `clientNotificationToken` fields that support push notifications when an admin approves/denies a CIBA request. Currently unused — the agent must poll.

Wire up push notifications to the registered endpoint on approval so agents get instant notification instead of polling.

---

### 6.5 — `anonymousUser` Plugin

Allow users to try the app without registering, then upgrade to a full account:

```typescript
import { anonymous } from "better-auth/plugins";

anonymous({
  onLinkAccount: async ({ anonymousUser, newUser }) => {
    // Migrate anonymous user's data
  },
}),
```

---

### 6.6 — Cross-Subdomain Cookies

Enable once all subdomains are on `drgodly.com`:

```typescript
advanced: {
  crossSubDomainCookies: {
    enabled: true,
    domain: "drgodly.com",
  },
},
```

---

## Summary Table

| Phase | Name | Items | Total Effort |
|---|---|---|---|
| **1** | Critical Fixes | 5 items | ~1 day |
| **2** | Security Hardening | 7 items | ~1 day |
| **3** | Agent Auth Completion | 5 items | ~3 days |
| **4** | More Auth Methods | 6 items | ~4 days |
| **5** | MCP & Agent Ecosystem | 5 items | ~5 days |
| **6** | Polish & Completeness | 6 items | ~3 days |

**Phase 1 is the only blocker.** All later phases are independent of each other and can be done in any order within their priority level.

---

## Plugin Addition Checklist (for any phase)

After adding any Better Auth plugin:

```
□ Add to plugins array in auth.config.ts
□ Run: pnpm auth:generate   (updates Prisma schema if plugin adds tables)
□ Run: pnpm db:push         (applies schema to DB — use db:migrate in production)
□ Add client plugin to auth client config (if plugin has client-side)
□ Restart dev server
□ Test: existing sign-in flow still works
□ Test: existing sessions not invalidated
□ Update CLAUDE.md plugin table
```
