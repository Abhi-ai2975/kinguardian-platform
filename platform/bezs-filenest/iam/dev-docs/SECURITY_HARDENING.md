# Security Hardening Plan

> IAM server security analysis and remediation guide

---

## Priority Matrix

| ID | Issue | Severity | Effort | File |
|---|---|---|---|---|
| S1 | `console.log` leaks user PII | 🔴 Critical | XS | `auth.config.ts:419` |
| S2 | Rate limits too permissive | 🔴 Critical | S | `auth.config.ts` |
| S3 | `requireRole` logic bug | 🔴 Critical | S | `require-role.ts` |
| S4 | No compromised password check | 🟠 High | XS | `auth.config.ts` |
| S5 | No security response headers | 🟠 High | S | `next.config.ts` |
| S6 | Email verification disabled | 🟠 High | XS | `auth.config.ts` |
| S7 | Raw HTML in email templates | 🟡 Medium | M | `auth.config.ts` |
| S8 | No bot protection (captcha) | 🟡 Medium | M | `auth.config.ts` |
| S9 | No bearer token auth | 🟡 Medium | XS | `auth.config.ts` |
| S10 | Session never absolutely expires | 🟡 Medium | S | `auth.config.ts` |
| S11 | Cross-subdomain cookies disabled | 🟡 Medium | S | `auth.config.ts` |
| S12 | Unused `inversify` package | 🟢 Low | XS | `package.json` |

---

## S1 — Remove PII from Logs

**File:** `src/modules/server/auth-provider/auth.config.ts:419`

```typescript
// Before:
onPasswordReset: async ({ user }) => {
  console.log(`Password for user ${user.email} has been reset.`);
},

// After:
onPasswordReset: async ({ user }) => {
  // Use structured logger — winston is already installed
  logger.info("password_reset_completed", { userId: user.id });
},
```

Import the existing logger:
```typescript
import { logger } from "@/modules/server/config/logger";
```

---

## S2 — Per-Endpoint Rate Limits

**File:** `src/modules/server/auth-provider/auth.config.ts`

Better Auth supports `customRules` for per-path rate limiting:

```typescript
rateLimit: {
  window: 60,
  max: 50,  // tighter global default
  customRules: {
    // Auth endpoints — tight limits
    "/sign-in/email": { window: 60, max: 5 },
    "/sign-up/email": { window: 60, max: 3 },
    "/forget-password": { window: 300, max: 3 },  // 3 per 5 min
    "/reset-password": { window: 300, max: 5 },
    "/two-factor/verify-otp": { window: 60, max: 5 },
    "/magic-link/send-magic-link": { window: 60, max: 3 },

    // OAuth endpoints — moderate limits
    "/oauth2/authorize": { window: 60, max: 20 },
    "/oauth2/token": { window: 60, max: 30 },

    // Agent auth — moderate limits
    "/agent/register": { window: 300, max: 10 },
    "/host/enroll": { window: 300, max: 10 },
    "/capability/execute": { window: 60, max: 60 },

    // Admin endpoints — per-minute budget
    "/admin/list-users": { window: 60, max: 30 },
    "/admin/create-user": { window: 60, max: 10 },
  },
},
```

---

## S3 — Fix requireRole Logic

**File:** `src/modules/server/shared/auth/require-role.ts`

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

  // Better Auth attaches `role` to the user object when the `admin` plugin is active
  const userRole = (session.user as { role?: string | null }).role;

  if (!userRole || !roles.includes(userRole)) {
    redirect({ href: "/", locale });
  }

  return session;
}
```

---

## S4 — Have I Been Pwned

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { haveibeenpwned } from "better-auth/plugins";

// Add to plugins array:
haveibeenpwned(),
```

No config needed — it automatically intercepts sign-up, password change, and password reset, rejecting passwords found in breach databases. The check is done via k-anonymity (sends only hash prefix, never the full password).

---

## S5 — Security Response Headers

**File:** `next.config.ts` (or `next.config.js`)

```typescript
import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-DNS-Prefetch-Control", value: "on" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-XSS-Protection", value: "1; mode=block" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  // ... rest of config
};

export default nextConfig;
```

**Note on CSP:** A strict Content-Security-Policy for Next.js 15 with App Router requires nonce-based inline script handling (Next.js uses inline scripts for hydration). Start with the headers above and add CSP incrementally once you validate it doesn't break the app in development.

---

## S6 — Enable Email Verification

**File:** `src/modules/server/auth-provider/auth.config.ts:202`

```typescript
// Change from:
const REQUIRE_EMAIL_VERIFICATION = false;

// To:
const REQUIRE_EMAIL_VERIFICATION = true;
```

The OAuth authorize gate already handles this correctly (see `auth.config.ts:487-509`). The only remaining work is ensuring the sign-up success page redirects users to a "check your email" state rather than directly into the app.

**Sign-up flow after enabling:**
1. User submits sign-up form
2. Better Auth sends verification email (already configured)
3. User is NOT auto-signed in
4. User clicks verification link → `autoSignInAfterVerification: true` handles sign-in
5. OAuth flows are blocked for unverified emails (the before hook handles this)

---

## S7 — Email Template Consolidation

**File:** `src/modules/server/auth-provider/auth.config.ts`

Currently only email verification uses the template helper. All other emails use inline HTML:

```typescript
// These use raw strings — should use templates:
sendResetPassword: async ({ user, url }) => {
  html: `<a href="${url}">Reset password</a>`,       // bare link
},
sendChangeEmailConfirmation: async ({ user, url }) => {
  html: `Click the link below...<a href="${url}">Change Email</a>`,
},
sendDeleteAccountVerification: async ({ user, url }) => {
  html: `Click the link below...<a href="${url}">Delete Account</a>`,
},
```

**Fix:** Add helpers to `src/modules/shared/email-templates/auth-email.templates.ts`:

```typescript
export function getPasswordResetTemplate(url: string, name: string, appName: string): string {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
      <h2>Reset your password</h2>
      <p>Hi ${name},</p>
      <p>Click the button below to reset your password for ${appName}.</p>
      <a href="${url}" style="...button styles...">Reset Password</a>
      <p>This link expires in 1 hour. If you didn't request this, ignore this email.</p>
    </div>
  `;
}

export function getChangeEmailTemplate(url: string, name: string, appName: string): string { ... }
export function getDeleteAccountTemplate(url: string, name: string, appName: string): string { ... }
export function getMagicLinkTemplate(url: string, appName: string): string { ... }
export function get2FAOtpTemplate(otp: string, appName: string): string { ... }
```

---

## S8 — Captcha Protection

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { captcha } from "better-auth/plugins";

captcha({
  provider: "cloudflare-turnstile",  // or "recaptcha" or "hcaptcha"
  secretKey: process.env.TURNSTILE_SECRET_KEY!,
  endpoints: [
    "/sign-up/email",
    "/sign-in/email",
    "/forget-password",
  ],
}),
```

**Client side:** Add the Turnstile widget to sign-in and sign-up forms. Better Auth's captcha plugin validates on the server side automatically.

---

## S9 — Bearer Token Plugin

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { bearer } from "better-auth/plugins";

bearer(),
```

With this plugin, API routes that call `auth.api.getSession({ headers })` will also accept:
- `Authorization: Bearer <session-token>` from programmatic clients
- `Authorization: Bearer <api-key>` when combined with the `apiKey` plugin

This enables backend services and CLI tools to authenticate without browser cookies.

---

## S10 — Session Absolute Expiry

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
session: {
  storeSessionInDatabase: true,
  expiresIn: 60 * 60 * 24 * 7,  // 7-day absolute expiry
  updateAge: 60 * 60 * 24,       // Refresh token if older than 1 day
  cookieCache: {
    enabled: true,
    maxAge: 60,
  },
},
```

Without `expiresIn`, sessions only expire if explicitly revoked. Setting this ensures abandoned sessions eventually expire automatically.

---

## S11 — Cross-Subdomain Cookies

For a platform with multiple apps (`app1.drgodly.com`, `app2.drgodly.com`) all trusting this IAM server, enable cross-subdomain cookie sharing:

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
// Uncomment the advanced block:
advanced: {
  crossSubDomainCookies: {
    enabled: true,
    domain: "drgodly.com",  // Top-level domain
  },
},
```

**Note:** This requires all subdomains to trust the same auth server. Test in staging first — cross-subdomain cookies have security implications if any subdomain is compromised.

---

## S12 — Remove Unused Dependencies

**File:** `package.json`

`inversify` is listed as a dependency but the codebase uses `@evyweb/ioctopus` exclusively. `reflect-metadata` is required by `inversify` but not by `ioctopus`.

```bash
# Verify no code imports inversify:
pnpm dlx madge src/modules --circular --extensions ts

# If confirmed unused:
pnpm remove inversify reflect-metadata
```

Also verify `@types/reflect-metadata` in devDependencies.

---

## Environment Variables Security Checklist

Ensure all secrets are in `.env` and never committed:

```bash
# Required — verify these are set
BETTER_AUTH_SECRET=<64-char-random>  # never expose
BETTER_AUTH_URL=https://iam.drgodly.com
DATABASE_URL=postgresql://...
GITHUB_CLIENT_ID=...
GITHUB_CLIENT_SECRET=...
GOOGLE_CLIENT_ID=...
GOOGLE_CLIENT_SECRET=...
LOGIN_PAGE=https://...
CONSENT_PAGE=https://...
SIGNUP_PAGE=https://...

# Add for new features
TURNSTILE_SECRET_KEY=...  # if captcha enabled
REDIS_URL=redis://...     # if secondary session storage added
FHIR_SERVER_URL=https://...
FHIR_OPENAPI_URL=https://...
```

The `.env` file is in `.gitignore` — verify it stays there.
