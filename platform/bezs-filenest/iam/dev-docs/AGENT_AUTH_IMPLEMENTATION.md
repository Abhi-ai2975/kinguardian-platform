# Agent Auth Protocol — Complete Implementation Guide

> Reference: https://agentauthprotocol.com/docs | Better Auth `@better-auth/agent-auth@0.4.3`

This document is the complete A-to-Z implementation plan for getting Agent Auth Protocol fully operational in this IAM server.

---

## Table of Contents

1. [Protocol Concepts](#protocol-concepts)
2. [Current State](#current-state)
3. [Step 1 — Enable the Plugin](#step-1--enable-the-plugin)
4. [Step 2 — Fix Host Enrollment Token Display](#step-2--fix-host-enrollment-token-display)
5. [Step 3 — Implement Capability Handlers](#step-3--implement-capability-handlers)
6. [Step 4 — Protect API Routes with verifyAgentRequest](#step-4--protect-api-routes-with-verifyagentrequest)
7. [Step 5 — Missing Admin UI Features](#step-5--missing-admin-ui-features)
8. [Step 6 — Device Code Flow Page](#step-6--device-code-flow-page)
9. [Step 7 — FHIR OpenAPI Integration](#step-7--fhir-openapi-integration)
10. [Full API Endpoint Map](#full-api-endpoint-map)
11. [Agent Client SDK Usage](#agent-client-sdk-usage)

---

## Protocol Concepts

### Principal Hierarchy

```
IAM Server (this app)
  └── Host (a service that runs agents, e.g. "fhir-service")
        └── Agent (an individual AI agent with its own Ed25519 keypair)
              └── Capability Grants (what the agent is allowed to do)
```

### Authentication Flow

```
1. Agent/Host calls /.well-known/agent-configuration  →  discover server features
2. Admin creates Host via POST /api/auth/host/create  →  gets host_id + enrollment_token
3. Agent enrolls via POST /api/auth/host/enroll (with enrollment_token + public_key)
   OR registers directly via POST /api/auth/agent/register (if host allows it)
4. Admin approves agent (if approval required) and grants capabilities
5. Agent signs a short-lived JWT with Ed25519 private key
6. Agent calls capabilities via POST /api/auth/capability/execute
   with header: Authorization: AgentAuth <signed-jwt>
7. Server verifies JWT signature against registered public key, checks capabilities
8. For delegated agents: user can be prompted for CIBA approval before execution
```

### Agent Modes

| Mode | Description | Typical Use Case |
|---|---|---|
| `delegated` | Acts on behalf of a specific user | Patient portal agent reading their own records |
| `autonomous` | Has its own identity, no user proxy | Background data pipeline, monitoring agent |

### Capability States

| State | Description |
|---|---|
| `active` | Grant is valid and usable |
| `expired` | Grant TTL has passed |
| `denied` | Admin explicitly denied |

---

## Current State

```
Plugin enabled:        ❌ COMMENTED OUT
DB schema:             ✅ Agent, AgentHost, AgentCapabilityGrant, ApprovalRequest
Admin UI:              ✅ Agents, Hosts, Approvals tabs with full CRUD
Service layer:         ✅ agentauth.service.ts with all operations
Use cases:             ✅ all in src/.../usecases/agent-auth/
Controllers:           ✅ all in src/.../controllers/agent-auth/
Server actions:        ✅ in src/.../actions/admin/agentauth.action.ts (assumed)
Well-known endpoint:   ✅ /.well-known/agent-configuration (but fails — plugin disabled)
```

**Everything is wired except the plugin itself. Enabling it makes the entire stack functional.**

---

## Step 1 — Enable the Plugin

**File:** `src/modules/server/auth-provider/auth.config.ts`

### 1a. Uncomment the import

```typescript
// Change line 25 from:
// import { agentAuth } from "@better-auth/agent-auth";
// To:
import { agentAuth } from "@better-auth/agent-auth";
```

### 1b. Add to plugins array

Remove the entire commented block (lines ~692–759) and replace with:

```typescript
agentAuth({
  providerName: "DrGodly IAM",
  providerDescription: "Central authentication authority for the DrGodly healthcare platform",

  // Both modes — delegated for patient-facing agents, autonomous for backend pipelines
  modes: ["delegated", "autonomous"],

  capabilities: [
    // ── Identity & Profile ───────────────────────────────────────────────────
    {
      name: "profile:read",
      description: "Read the authenticated user's name, email, and profile data",
    },
    {
      name: "profile:write",
      description: "Update the authenticated user's profile information",
    },

    // ── Organization ─────────────────────────────────────────────────────────
    {
      name: "organizations:read",
      description: "List organizations the user belongs to",
    },

    // ── API Keys ──────────────────────────────────────────────────────────────
    {
      name: "api_keys:read",
      description: "List API keys for the authenticated user or organization",
    },
    {
      name: "api_keys:create",
      description: "Create API keys on behalf of the user",
    },
    {
      name: "api_keys:revoke",
      description: "Revoke API keys",
    },

    // ── FHIR (add when FHIR server is available) ──────────────────────────────
    // {
    //   name: "fhir:patient:read",
    //   description: "Read FHIR Patient resources",
    //   input: {
    //     type: "object",
    //     properties: { patient_id: { type: "string" } },
    //     required: ["patient_id"],
    //   },
    // },
  ],

  async onExecute({ capability, arguments: args, agentSession }) {
    switch (capability) {
      case "profile:read": {
        return {
          id: agentSession.user?.id,
          name: agentSession.user?.name,
          email: agentSession.user?.email,
        };
      }

      case "organizations:read": {
        // Import prisma at top of file or pass via context
        // const orgs = await prisma.member.findMany({...});
        return { organizations: [] }; // placeholder
      }

      default:
        throw new Error(`Capability '${capability}' is not implemented on this server`);
    }
  },
}),
```

### 1c. Verify the well-known endpoint works

After enabling, `GET /.well-known/agent-configuration` should return the server's capability list. Test with:

```bash
curl http://localhost:5000/.well-known/agent-configuration
```

---

## Step 2 — Fix Host Enrollment Token Display

When an admin creates a host, the response from `auth.api.createHost` includes an enrollment token. This token must be shown **once** to the admin so they can give it to the host operator.

### 2a. Update the Response Schema

**File:** `src/modules/entities/schemas/admin/agent-auth/agent-auth.schema.ts`

```typescript
export const CreateHostResponseDtoSchema = z.object({
  hostId: z.string(),
  default_capabilities: z.array(z.string()),
  status: z.string(),
  enrollmentToken: z.string().optional(),  // ← ADD THIS
});
```

### 2b. Update the Modal to Two-Phase

**File:** `src/modules/client/admin/modals/agent-auth/CreateHostModal.tsx`

Follow the same pattern as `CreateOAuthClientModal` (Phase D pattern from SKILL.md):

```typescript
const [createdHost, setCreatedHost] = useState<TCreateHostResponseDtoSchema | null>(null);

const { execute } = useServerAction(createHostAction, {
  onSuccess({ data }) {
    if (data) setCreatedHost(data);  // Switch to credential display phase
  },
  onError({ err }) {
    handleZSAError({ err, fallbackMessage: "Failed to create host" });
  },
});

// In JSX:
{createdHost ? (
  <>
    <DialogHeader>
      <DialogTitle>Host Created</DialogTitle>
      <DialogDescription>
        Copy the Host ID and Enrollment Token — the token is shown only once.
      </DialogDescription>
    </DialogHeader>
    <div className="space-y-3">
      <div>
        <label className="text-xs text-muted-foreground">Host ID</label>
        <div className="flex gap-2">
          <code className="flex-1 bg-muted p-2 rounded text-sm">{createdHost.hostId}</code>
          <Button size="sm" variant="outline" onClick={() => copy(createdHost.hostId)}>
            Copy
          </Button>
        </div>
      </div>
      {createdHost.enrollmentToken && (
        <div>
          <label className="text-xs text-muted-foreground">Enrollment Token (one-time)</label>
          <div className="flex gap-2">
            <code className="flex-1 bg-muted p-2 rounded text-sm break-all">
              {createdHost.enrollmentToken}
            </code>
            <Button size="sm" variant="outline" onClick={() => copy(createdHost.enrollmentToken!)}>
              Copy
            </Button>
          </div>
        </div>
      )}
    </div>
    <DialogFooter>
      <Button onClick={handleClose}>Done</Button>
    </DialogFooter>
  </>
) : (
  // Normal create form
)}
```

---

## Step 3 — Implement Capability Handlers

The `onExecute` callback in the `agentAuth` plugin is where capabilities are actually executed. Each capability name maps to server-side logic.

### Design Principles

1. Capabilities are named `<resource>:<action>` to be readable and scoped
2. Each capability should verify the agent has the grant before executing (the plugin handles this automatically)
3. For `delegated` agents, `agentSession.user` contains the proxied user
4. For `autonomous` agents, `agentSession.user` is null — the agent IS the principal

### Capability Executor Pattern

```typescript
// src/modules/server/agent-auth/capabilities/capability-executor.ts

import { prisma } from "@/prisma/db";

type CapabilityContext = {
  capability: string;
  arguments: Record<string, unknown>;
  agentSession: {
    agent: { id: string; name: string; mode: string };
    user?: { id: string; email: string; name: string } | null;
    capabilities: string[];
  };
};

export async function executeCapability({ capability, arguments: args, agentSession }: CapabilityContext) {
  switch (capability) {
    case "profile:read":
      return handleProfileRead(agentSession);

    case "organizations:read":
      return handleOrganizationsRead(agentSession);

    case "api_keys:read":
      return handleApiKeysRead(agentSession);

    default:
      throw new Error(`Capability '${capability}' not supported`);
  }
}

async function handleProfileRead(agentSession: CapabilityContext["agentSession"]) {
  if (!agentSession.user) {
    throw new Error("profile:read requires a delegated agent (user context needed)");
  }
  const user = await prisma.user.findUnique({
    where: { id: agentSession.user.id },
    select: { id: true, name: true, email: true, image: true, createdAt: true },
  });
  return user;
}

async function handleOrganizationsRead(agentSession: CapabilityContext["agentSession"]) {
  if (!agentSession.user) throw new Error("Requires delegated mode");
  const members = await prisma.member.findMany({
    where: { userId: agentSession.user.id },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  });
  return { organizations: members.map((m) => m.organization) };
}

async function handleApiKeysRead(agentSession: CapabilityContext["agentSession"]) {
  if (!agentSession.user) throw new Error("Requires delegated mode");
  // API key listing logic
  return { keys: [] };
}
```

---

## Step 4 — Protect API Routes with verifyAgentRequest

Any API route that should accept agent requests must verify the agent JWT.

### Pattern for Protected Routes

```typescript
// src/app/api/agent/[capability]/route.ts
import { verifyAgentRequest } from "@better-auth/agent-auth";
import { auth } from "@/modules/server/auth-provider/auth";

export async function POST(request: Request) {
  // Verify the agent JWT — returns null if invalid/missing
  const agentSession = await verifyAgentRequest(request, auth);

  if (!agentSession) {
    return Response.json({ error: "Unauthorized: invalid or missing agent JWT" }, { status: 401 });
  }

  // agentSession.agent      — the Agent record
  // agentSession.user       — the proxied user (null for autonomous agents)
  // agentSession.capabilities — array of granted capability names

  const body = await request.json();
  const { capability, arguments: args } = body;

  // Check the agent has the specific capability
  if (!agentSession.capabilities.includes(capability)) {
    return Response.json({ error: `Missing capability: ${capability}` }, { status: 403 });
  }

  try {
    const result = await executeCapability({ capability, arguments: args, agentSession });
    return Response.json({ result });
  } catch (err) {
    return Response.json({ error: (err as Error).message }, { status: 400 });
  }
}
```

### Auth Middleware Helper

Create a reusable helper:

```typescript
// src/modules/server/agent-auth/verifyAgent.ts
import { verifyAgentRequest } from "@better-auth/agent-auth";
import { auth } from "@/modules/server/auth-provider/auth";
import type { NextRequest } from "next/server";

export type AgentSession = Awaited<ReturnType<typeof verifyAgentRequest>>;

export async function requireAgentAuth(request: NextRequest | Request): Promise<AgentSession> {
  const session = await verifyAgentRequest(request, auth);
  if (!session) throw new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  return session;
}

export async function requireCapability(request: NextRequest | Request, capability: string): Promise<AgentSession> {
  const session = await requireAgentAuth(request);
  if (!session.capabilities.includes(capability)) {
    throw new Response(JSON.stringify({ error: `Missing capability: ${capability}` }), { status: 403 });
  }
  return session;
}
```

---

## Step 5 — Missing Admin UI Features

### 5a. Agent Rotate Key

**Add to `IAgentAuthService`:**
```typescript
rotateAgentKey(payload: { agent_id: string }): Promise<{ success: boolean }>;
```

**Add use case, controller, action** following the standard pattern.

**Add to `AgentAuthModalProvider`:** A `RotateAgentKeyModal` similar to `RotateSecretModal` for OAuth clients.

### 5b. Agent Detail Page

Create `src/app/[locale]/admin/agent-auth/agents/[agentId]/page.tsx`:
- Show agent full details (status, mode, host, created/used dates)
- List all capability grants with their status and expiry
- Show approval request history

**API:** `GET /api/auth/agent/get?agent_id=<id>` → `auth.api.getAgent({ query: { agent_id } })`

### 5c. Host Detail Page

Create `src/app/[locale]/admin/agent-auth/hosts/[hostId]/page.tsx`:
- Show host full details
- List all agents under this host
- Show last used time, enrollment status

**API:** `GET /api/auth/host/get?host_id=<id>` → `auth.api.getHost({ query: { host_id } })`

### 5d. Capability Catalog Page

Create `src/app/[locale]/admin/agent-auth/capabilities/page.tsx`:
- List all registered capabilities from `auth.api.listCapabilities`
- For each capability: name, description, input schema
- Show which agents have grants for each capability

### 5e. Generate Enrollment Token (Admin Action)

Allow admins to generate a new enrollment token for an existing host without recreating it:

**Add to service interface:**
```typescript
generateEnrollmentToken(payload: { host_id: string; ttl?: number }): Promise<{ enrollmentToken: string; expiresAt: Date }>;
```

---

## Step 6 — Device Code Flow Page

The Device Authorization Grant (`POST /api/auth/device/code`) lets agents and CLI tools initiate auth flows without a browser. The user goes to a URL and approves.

### Required Pages

1. **Device Authorization Page** — `src/app/[locale]/auth/device/page.tsx`
   - Takes `user_code` from URL params
   - Displays the binding message
   - Has Approve/Deny buttons
   - Calls `POST /api/auth/agent/claim`

2. **Device Success Page** — `src/app/[locale]/auth/device/success/page.tsx`
   - Simple "Device authorized" confirmation

### Admin Panel Integration

The existing **Approvals** tab in `/admin/agent-auth` shows pending CIBA requests. The `method` field distinguishes `"device_authorization"` from `"ciba"`. The UI should show both types distinctly:

```typescript
// In ApprovalsTableColumn.tsx — show method badge
{
  method === "device_authorization" ? "Device Code" : "CIBA"
}
```

---

## Step 7 — FHIR OpenAPI Integration

This is the end-state integration where the IAM server proxies FHIR capabilities using the actual FHIR server's OpenAPI spec.

**File:** `src/modules/server/auth-provider/auth.config.ts`

```typescript
import { createFromOpenAPI } from "@better-auth/agent-auth/openapi";
import { getJwtToken } from "better-auth/plugins/jwt";

// Fetch spec once at startup (with retry)
async function loadFhirSpec() {
  const response = await fetch(process.env.FHIR_OPENAPI_URL!);
  return response.json();
}

// In auth.config.ts, make authConfig async or use a factory:
const fhirSpec = await loadFhirSpec();

agentAuth({
  ...createFromOpenAPI(fhirSpec, {
    baseUrl: process.env.FHIR_SERVER_URL!,
    async resolveHeaders({ ctx }) {
      const token = await getJwtToken(ctx);
      return { Authorization: `Bearer ${token}` };
    },
  }),
  // Override or extend the generated capabilities list as needed
  modes: ["delegated", "autonomous"],
}),
```

**Note:** `authConfig` is currently a plain object literal (`export const authConfig = { ... }`). If `createFromOpenAPI` requires `await`, wrap in a factory function:

```typescript
export async function createAuthConfig(): Promise<BetterAuthOptions> {
  const spec = await loadFhirSpec();
  return {
    // ...everything currently in authConfig...
    plugins: [
      // ...existing plugins...
      agentAuth({
        ...createFromOpenAPI(spec, { ... }),
      }),
    ],
  };
}

// In auth.ts:
export const auth = betterAuth(await createAuthConfig());
```

---

## Full API Endpoint Map

All agent auth endpoints that this IAM server exposes once the plugin is enabled:

### Agent Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/auth/agent-configuration` | None | Discover server capabilities |
| POST | `/api/auth/agent/register` | Session cookie | Register new agent |
| GET | `/api/auth/agent/list` | Session cookie | List your agents |
| GET | `/api/auth/agent/get` | Session cookie | Get specific agent (`?agent_id=`) |
| POST | `/api/auth/agent/update` | Session cookie | Update agent name/metadata |
| POST | `/api/auth/agent/revoke` | Session cookie or admin | Revoke agent |
| POST | `/api/auth/agent/reactivate` | Session cookie or admin | Reactivate agent |
| POST | `/api/auth/agent/rotate-key` | Session cookie | Rotate agent signing key |
| GET | `/api/auth/agent/session` | AgentAuth JWT | Verify agent JWT, get session |
| POST | `/api/auth/agent/introspect` | Session cookie | Introspect agent token |
| POST | `/api/auth/agent/cleanup` | Admin session | Remove expired agents |
| GET | `/api/auth/agent/status` | Session cookie | Get agent status |

### Capability Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| GET | `/api/auth/capability/list` | Session cookie | List available capabilities |
| GET | `/api/auth/capability/describe` | Session cookie | Describe a capability (`?name=`) |
| POST | `/api/auth/capability/execute` | AgentAuth JWT | Execute a capability |
| POST | `/api/auth/capability/batch-execute` | AgentAuth JWT | Execute multiple capabilities |
| POST | `/api/auth/agent/request-capability` | AgentAuth JWT | Request new capabilities |
| POST | `/api/auth/agent/approve-capability` | Session cookie | Approve/deny capability request |
| POST | `/api/auth/agent/grant-capability` | Admin session | Admin grants capabilities |

### Host Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/host/create` | Session cookie | Create new host |
| POST | `/api/auth/host/enroll` | Enrollment token | Enroll using enrollment token |
| GET | `/api/auth/host/list` | Session cookie | List your hosts |
| GET | `/api/auth/host/get` | Session cookie | Get specific host (`?host_id=`) |
| POST | `/api/auth/host/revoke` | Session cookie | Revoke host (cascades to agents) |
| POST | `/api/auth/host/update` | Session cookie | Update host |
| POST | `/api/auth/host/rotate-key` | Session cookie | Rotate host signing key |
| POST | `/api/auth/host/switch-account` | Session cookie | Move host to different user |

### CIBA / Device Code Endpoints

| Method | Path | Auth Required | Description |
|---|---|---|---|
| POST | `/api/auth/agent/ciba/authorize` | AgentAuth JWT | Request async user approval |
| GET | `/api/auth/agent/ciba/pending` | Session cookie | List pending CIBA requests for user |
| POST | `/api/auth/device/code` | None | Initiate device code flow |
| POST | `/api/auth/agent/claim` | Session cookie | Claim agent after device approval |

### Well-Known Endpoints

| Method | Path | Description |
|---|---|---|
| GET | `/.well-known/agent-configuration` | Agent Auth discovery |
| GET | `/.well-known/oauth-authorization-server` | OAuth server metadata |
| GET | `/api/auth/.well-known/openid-configuration` | OIDC discovery |

---

## Agent Client SDK Usage

Example of how an AI agent connects to this IAM server:

### Node.js Agent (TypeScript)

```typescript
import { generateKeyPairSync, createSign } from "crypto";
import { createPrivateKey } from "crypto";
import * as jose from "jose";

const IAM_URL = "https://iam.drgodly.com";

// Step 1: Generate Ed25519 keypair (done once, persist private key securely)
const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const publicKeyJwk = publicKey.export({ format: "jwk" });
const privateKeyObject = createPrivateKey(privateKey);

// Step 2: Discover capabilities
const config = await fetch(`${IAM_URL}/.well-known/agent-configuration`).then(r => r.json());

// Step 3: Register with the IAM server (using host enrollment token)
const registration = await fetch(`${IAM_URL}/api/auth/host/enroll`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    token: process.env.HOST_ENROLLMENT_TOKEN,
    public_key: publicKeyJwk,
    name: "my-fhir-agent-v1",
  }),
});
const { agent_id } = await registration.json();

// Step 4: Create a signed agent JWT for each request
async function createAgentJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return new jose.SignJWT({
    iss: agent_id,
    sub: agent_id,
    aud: IAM_URL,
    iat: now,
    exp: now + 300,        // 5 min TTL — short-lived
    jti: crypto.randomUUID(),
  })
    .setProtectedHeader({ alg: "EdDSA" })
    .sign(await jose.importPKCS8(privateKey.export({ format: "pem", type: "pkcs8" }).toString(), "EdDSA"));
}

// Step 5: Execute a capability
async function readProfile() {
  const jwt = await createAgentJwt();
  const response = await fetch(`${IAM_URL}/api/auth/capability/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `AgentAuth ${jwt}`,
    },
    body: JSON.stringify({
      capability: "profile:read",
      arguments: {},
    }),
  });
  return response.json();
}
```

### MCP Tool Integration Pattern

If this IAM server has the `mcp` plugin enabled, agents (especially Claude) can discover and call capabilities through the MCP protocol:

```typescript
// MCP server that wraps IAM capabilities
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

const server = new McpServer({ name: "iam-capabilities", version: "1.0.0" });

server.tool("read_profile", "Read the user's profile", {}, async () => {
  // Use the agent JWT to call this IAM server
  const result = await callIAMCapability("profile:read", {});
  return { content: [{ type: "text", text: JSON.stringify(result) }] };
});
```

---

## Testing Checklist

After enabling the `agentAuth` plugin:

```
□ GET /.well-known/agent-configuration returns capability list
□ POST /api/auth/host/create returns hostId + enrollmentToken
□ POST /api/auth/host/enroll with enrollment token + public key returns agent_id
□ Admin Hosts tab shows the created host with status "active"
□ Admin can grant capabilities to an agent
□ Agent can sign a JWT and call /api/auth/capability/execute
□ /api/auth/agent/session verifies a valid agent JWT
□ Revoked agent JWT is rejected
□ Expired JWT (past exp claim) is rejected
□ Agent with no capability grant for X cannot execute X
□ CIBA pending approvals list shows up in Approvals tab
□ Admin can approve/deny from the Approvals tab
```
