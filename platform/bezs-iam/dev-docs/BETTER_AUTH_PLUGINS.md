# Better Auth — Missing Plugins Implementation Guide

> Which plugins to add, why, and exact implementation steps for each

---

## Currently Active Plugins

| Plugin | Package | Status |
|---|---|---|
| `openAPI` | `better-auth/plugins` | ✅ Active |
| `username` | `better-auth/plugins` | ✅ Active |
| `twoFactor` | `better-auth/plugins` | ✅ Active |
| `jwt` | `better-auth/plugins` | ✅ Active |
| `organization` | `better-auth/plugins` | ✅ Active |
| `admin` | `better-auth/plugins` | ✅ Active |
| `oauthProvider` | `@better-auth/oauth-provider` | ✅ Active |
| `lastLoginMethod` | `better-auth/plugins` | ✅ Active |
| `magicLink` | `better-auth/plugins` | ✅ Active |
| `apiKey` | `@better-auth/api-key` | ✅ Active |
| `customSession` | `better-auth/plugins` | ✅ Active |
| `nextCookies` | `better-auth/next-js` | ✅ Active |
| `agentAuth` | `@better-auth/agent-auth` | ❌ Commented out |

---

## High Priority — Add Now

### 1. `bearer` Plugin

**Why:** Without this, programmatic clients (backend services, CLI tools, mobile apps) cannot authenticate using session tokens as bearer tokens. They must use cookies, which don't work for non-browser clients.

**Install:** Already included in `better-auth` package.

```typescript
import { bearer } from "better-auth/plugins";

// Add to plugins array:
bearer(),
```

No admin UI changes needed. After adding, any route that calls `auth.api.getSession({ headers })` will also accept `Authorization: Bearer <token>`.

---

### 2. `haveibeenpwned` Plugin

**Why:** Blocks users from registering or changing passwords to ones found in data breaches. Industry-standard security practice, required by NIST SP 800-63B.

**Install:** Already in `better-auth`.

```typescript
import { haveibeenpwned } from "better-auth/plugins";

haveibeenpwned(),
```

**How it works:** Uses k-anonymity — only the first 5 characters of the SHA-1 password hash are sent to the HIBP API. The full password never leaves the server. No configuration needed.

---

### 3. `multiSession` Plugin

**Why:** Allows users to be simultaneously signed into multiple accounts (e.g., personal + work). Common requirement for healthcare staff managing multiple roles.

**Install:** Already in `better-auth`.

```typescript
import { multiSession } from "better-auth/plugins";

multiSession({
  maximumSessions: 5,
}),
```

**Client setup:**
```typescript
// better-auth client — add plugin inference
import { multiSessionClient } from "better-auth/client/plugins";
const authClient = createAuthClient({
  plugins: [multiSessionClient()],
});
```

**Admin UI addition:** Add a "Device Sessions" section to the user detail page that calls:
- `auth.api.listDeviceSessions` — list all active sessions for user
- `auth.api.revokeDeviceSession` — revoke a specific session

---

### 4. `emailOtp` Plugin

**Why:** Standalone email OTP for verification steps outside of 2FA (e.g., confirming a sensitive operation, one-time login for accounts without passwords).

**Install:** Already in `better-auth`.

```typescript
import { emailOtp } from "better-auth/plugins";

emailOtp({
  sendVerificationOtp: async ({ email, otp, type }) => {
    await sendAuthEmail({
      to: email,
      subject: type === "sign-in" ? "Your sign-in code" : "Your verification code",
      html: `<p>Your OTP: <strong>${otp}</strong> — valid for 10 minutes.</p>`,
    });
  },
  expiresIn: 600,  // 10 minutes
}),
```

---

### 5. `deviceAuthorization` Plugin

**Why:** OAuth 2.0 Device Authorization Grant (RFC 8628). Required for CLI tools, IoT devices, and smart TVs that can't open a browser. Agents registering from headless environments use this flow.

**Install:** Already in `better-auth`.

```typescript
import { deviceAuthorization } from "better-auth/plugins";

deviceAuthorization({
  deviceCodeExpiresIn: 300,   // 5 minutes
  pollingInterval: 5,          // seconds between poll attempts
}),
```

**Required page:** Create `src/app/[locale]/auth/device/page.tsx` — the user goes to this page on their phone/browser to approve the device:

```typescript
import { auth } from "@/modules/server/auth-provider/auth";
import { headers } from "next/headers";

async function DeviceAuthPage({ searchParams }: { searchParams: { user_code?: string } }) {
  // Show the user_code and ask them to approve/deny
  // On approve: call auth.api.approveDeviceRequest
  // On deny: call auth.api.denyDeviceRequest
  return (
    <div>
      <h1>Authorize Device</h1>
      <p>Code: {searchParams.user_code}</p>
      {/* Approve / Deny buttons */}
    </div>
  );
}
```

---

## Medium Priority — Add Next Sprint

### 6. `passkey` Plugin (WebAuthn)

**Why:** Passwordless authentication via FIDO2/WebAuthn. Modern enterprise standard. Eliminates phishing risk.

**Install:** Already in `better-auth`.

```typescript
import { passkey } from "better-auth/plugins";

passkey({
  rpName: "DrGodly IAM",
  rpId: "drgodly.com",
  origin: process.env.BETTER_AUTH_URL!,
}),
```

**Client setup:** Add passkey UI to the sign-in page:
```typescript
import { passkeyClient } from "better-auth/client/plugins";

const authClient = createAuthClient({
  plugins: [passkeyClient()],
});

// Sign in with passkey:
await authClient.signIn.passkey();

// Register passkey (from settings page):
await authClient.passkey.addPasskey();
```

**Admin UI:** Add passkey management to the user settings page (list registered passkeys, revoke individual passkeys).

---

### 7. `phoneNumber` Plugin

**Why:** SMS-based authentication. Required for mobile-first flows and as a 2FA backup method.

**Install:** Already in `better-auth`.

```typescript
import { phoneNumber } from "better-auth/plugins";

phoneNumber({
  sendOTP: async ({ phoneNumber, otp }) => {
    // Integrate with Twilio, AWS SNS, or similar
    await smsProvider.send(phoneNumber, `Your verification code: ${otp}`);
  },
  signInWithPhoneNumber: true,
}),
```

---

### 8. `mcp` Plugin

**Why:** Exposes this IAM server as an MCP (Model Context Protocol) server. AI clients (like Claude Desktop) can discover and call auth operations through MCP instead of REST.

**Install:** Already in `better-auth`.

```typescript
import { mcp } from "better-auth/plugins";

mcp({
  loginPage: process.env.LOGIN_PAGE!,
}),
```

**What this enables:** MCP clients can authenticate to this IAM server and get auth context for all downstream operations. Particularly useful when this IAM is the auth layer for an MCP-enabled FHIR server.

---

### 9. `captcha` Plugin

**Why:** Bot protection for auth endpoints. Prevents automated account creation and credential stuffing.

**Install:** Already in `better-auth`.

```typescript
import { captcha } from "better-auth/plugins";

captcha({
  provider: "cloudflare-turnstile",
  secretKey: process.env.TURNSTILE_SECRET_KEY!,
  endpoints: ["/sign-up/email", "/sign-in/email", "/forget-password"],
}),
```

**Client setup:** Add Turnstile widget to sign-in and sign-up forms (or use invisible mode).

---

### 10. `oneTap` Plugin (Google One Tap)

**Why:** Frictionless Google sign-in. Users already on a Google session can sign in with one click without leaving the page.

**Install:** Already in `better-auth`.

```typescript
import { oneTap } from "better-auth/plugins";

oneTap(),
```

**Client setup:** Add One Tap to the sign-in page:
```typescript
import { oneTapClient } from "better-auth/client/plugins";
// Renders the Google One Tap prompt automatically
```

---

## Low Priority — Enterprise Additions

### 11. `sso` Plugin (SAML/SSO)

When enterprise clients (hospitals, clinics) require SAML-based SSO from their identity providers (Okta, Azure AD, etc.).

```typescript
import { sso } from "better-auth/plugins";

sso(),
// Then configure SSO providers through the admin API
```

---

### 12. `scim` Plugin

For directory synchronization with enterprise IdPs:

```typescript
import { scim } from "better-auth/plugins";

scim({
  path: "/scim/v2",
}),
```

---

### 13. `anonymousUser` Plugin

Allow users to start interacting with the app before creating an account, then upgrade to a full account:

```typescript
import { anonymous } from "better-auth/plugins";

anonymous({
  onLinkAccount: async ({ anonymousUser, newUser }) => {
    // Migrate anonymous user's data to the new account
  },
}),
```

---

### 14. `genericOAuth` Plugin

Connect any OAuth 2.0 provider not built into Better Auth:

```typescript
import { genericOAuth } from "better-auth/plugins";

genericOAuth({
  config: [
    {
      providerId: "keycloak",
      clientId: process.env.KEYCLOAK_CLIENT_ID!,
      clientSecret: process.env.KEYCLOAK_CLIENT_SECRET!,
      authorizationUrl: "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/auth",
      tokenUrl: "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/token",
      userInfoUrl: "https://keycloak.example.com/realms/myrealm/protocol/openid-connect/userinfo",
      scopes: ["openid", "profile", "email"],
    },
  ],
}),
```

---

## Existing Plugin Improvements

### `twoFactor` — Add TOTP Support

Currently only email OTP is configured. TOTP (Google Authenticator, Authy) is more secure:

```typescript
twoFactor({
  skipVerificationOnEnable: true,
  totpOptions: {
    issuer: "DrGodly IAM",
    // period: 30,  // default
    // digits: 6,   // default
  },
  otpOptions: {
    sendOTP: async ({ user, otp }) => {
      await sendAuthEmail({ to: user.email, subject: "2FA OTP", html: `Your OTP: ${otp}` });
    },
  },
}),
```

**Client setup:** Display QR code during TOTP setup:
```typescript
const { data } = await authClient.twoFactor.getTotpUri({ password: "user-password" });
// Render data.totpURI as a QR code
```

---

### `apiKey` — Add Organization Keys and Permissions

The `apiKey` plugin supports organization-scoped keys and permission strings. Currently using minimal config:

```typescript
apiKey({
  defaultPrefix: "drgodly_",
  defaultRateLimitMax: 1000,
  defaultRateLimitTimeWindow: 24 * 60 * 60 * 1000,  // 24h in ms
  enableMetadata: true,
  // Organization-scoped keys:
  keyExpiration: {
    defaultExpiresIn: null,  // no default expiry
    maxExpiresIn: 365 * 24 * 60 * 60,  // max 1 year
    disableExpiration: false,
  },
}),
```

**Admin UI:** The existing API keys admin page (`/admin/api-keys`) already has CRUD. Extend it to show:
- Rate limit usage per key
- Last used timestamp
- Permission strings
- Expiry status

---

### `organization` — Add Custom Roles

Currently organizations use the default role strings. The codebase has `OrganizationRole` model suggesting custom roles are intended. Wire up Better Auth's `dynamicAccessControl`:

```typescript
organization({
  allowUserToCreateOrganization: async (user) => user.role === "superadmin",
  teams: { enabled: true, allowRemovingAllTeams: true },
  ac,
  dynamicAccessControl: {
    enabled: true,
    async getPermissions({ userId, organizationId }) {
      // Return permissions from OrganizationRole table
      return getUserPermissions(userId, organizationId);
    },
  },
}),
```

This is partially done — `getUserPermissions` exists and is called in `buildUserContext`. The dynamic access control hook should use it.

---

## Plugin Addition Checklist

When adding any Better Auth plugin:

```
□ Add to plugins array in auth.config.ts
□ Run `pnpm auth:generate` to update Prisma schema if the plugin adds tables
□ Run `pnpm db:push` or `pnpm db:migrate` to apply schema changes
□ Add client plugin to Better Auth client config (if plugin has client side)
□ Update admin UI if plugin exposes admin operations
□ Update CLAUDE.md plugin table with new entry
□ Test: sign-in flow still works after adding plugin
□ Test: existing sessions not invalidated
```
