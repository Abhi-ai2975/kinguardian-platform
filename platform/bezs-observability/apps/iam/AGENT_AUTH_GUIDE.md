# Agent Auth Admin Guide

The `/admin/agent-auth` page manages AI agents and host configurations using the Better Auth `agent-auth` plugin.

---

## Concepts

| Concept | Description |
|---|---|
| **Host** | A service or application that runs AI agents. You create a host first, then use its ID to issue enrollment tokens. |
| **Agent** | An AI agent identity registered under a host. Agents authenticate using JWTs signed with their private key. |
| **Capability** | A named permission that controls what an agent can do. Agents must have grants for capabilities they want to call. |

---

## Page Overview

The page has two tabs:

### Agents Tab
Lists all agents registered under the admin's account.

| Column | Description |
|---|---|
| Name | Agent display name |
| Status | `active` / `pending` / `revoked` / `expired` / `rejected` / `claimed` |
| Mode | `delegated` (acts on behalf of user) or `autonomous` (own identity) |
| Host | The host this agent is registered under |
| Capabilities | Number of capability grants |

**Actions per agent:**
- **Grant Capability** — Add named capabilities to an agent (comma-separated, optional TTL in seconds)
- **Revoke** — Revoke an active agent (blocks authentication; reversible)
- **Reactivate** — Restore a revoked or expired agent

### Hosts Tab
Lists all hosts registered under the admin's account.

| Column | Description |
|---|---|
| Name | Host display name |
| Status | `active` / `pending` / `pending_enrollment` / `revoked` / `rejected` |
| Default Capabilities | Capabilities automatically granted to all agents under this host |
| Created | Creation date |

**Actions per host:**
- **Revoke Host** — Revokes the host and all agents registered under it (destructive, cannot be undone)

**Create Host** button in the top-right / empty state.

---

## Typical Workflow

### 1. Create a Host

Go to the **Hosts** tab and click **Create Host**.

| Field | Required | Description |
|---|---|---|
| Host Name | Yes | Human-readable name (e.g. `my-fhir-service`) |
| Default Capabilities | No | Comma-separated capabilities granted to all agents (e.g. `read_patient, write_observation`) |
| JWKS URL | No | Remote JWKS endpoint for key verification. Use this instead of registering a public key inline. |

After creation, a **Host ID** is shown — copy it. This ID is passed to agents so they can call `/host/enroll` or `/agent/register`.

### 2. Register an Agent (from the agent side)

Agents self-register by calling the API. From the admin panel you cannot create agents manually — this is by design.

**Option A — Direct registration** (agent knows the host ID):
```http
POST /api/auth/agent/register
Content-Type: application/json

{
  "name": "my-agent",
  "host_name": "<host name>",
  "capabilities": ["read_patient"],
  "mode": "autonomous"
}
```

**Option B — Host enrollment** (agent uses an enrollment token):
```http
POST /api/auth/host/enroll
Content-Type: application/json

{
  "token": "<enrollment token>",
  "public_key": { "kty": "OKP", "crv": "Ed25519", "x": "..." },
  "name": "my-agent"
}
```

### 3. Grant Capabilities to an Agent

Go to the **Agents** tab, click the **⋮** menu on an agent, and select **Grant Capability**.

| Field | Required | Description |
|---|---|---|
| Capabilities | Yes | Comma-separated capability names (e.g. `read_data, write_data`) |
| TTL (seconds) | No | Capability grant expiry. Leave blank for no expiry. |

### 4. Revoke / Reactivate

- **Revoke**: Blocks the agent from authenticating. The agent JWT will be rejected.
- **Reactivate**: Re-enables a previously revoked or expired agent.

---

## API Endpoints Reference

These endpoints are used by agents and hosts directly — not from the admin panel.

### Agent Lifecycle

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/agent-configuration` | Discover server capabilities |
| POST | `/api/auth/agent/register` | Register a new agent |
| GET | `/api/auth/agent/list` | List agents for the current user |
| GET | `/api/auth/agent/get?agent_id=` | Get a specific agent |
| POST | `/api/auth/agent/update` | Update agent name/metadata |
| POST | `/api/auth/agent/revoke` | Revoke an agent |
| POST | `/api/auth/agent/reactivate` | Reactivate a revoked/expired agent |
| POST | `/api/auth/agent/rotate-key` | Rotate the agent's signing key |
| GET | `/api/auth/agent/session` | Verify agent JWT, get agent session |
| POST | `/api/auth/agent/cleanup` | Remove expired agents |
| GET | `/api/auth/agent/status` | Get agent status |

### Capability Management

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/capability/list` | List available capabilities |
| GET | `/api/auth/capability/describe?name=` | Describe a capability |
| POST | `/api/auth/capability/execute` | Execute a capability (requires agent JWT) |
| POST | `/api/auth/capability/batch-execute` | Execute multiple capabilities in one request |
| POST | `/api/auth/agent/request-capability` | Agent requests capabilities (triggers user approval if needed) |
| POST | `/api/auth/agent/approve-capability` | Admin/user approves a capability request |
| POST | `/api/auth/agent/grant-capability` | Admin directly grants capabilities |

### Host Management

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/host/create` | Create a new host |
| POST | `/api/auth/host/enroll` | Enroll a host using an enrollment token |
| GET | `/api/auth/host/list` | List hosts for the current user |
| GET | `/api/auth/host/get?host_id=` | Get a specific host |
| POST | `/api/auth/host/revoke` | Revoke a host and all its agents |
| POST | `/api/auth/host/update` | Update host name/capabilities/JWKS URL |
| POST | `/api/auth/host/rotate-key` | Rotate the host signing key |
| POST | `/api/auth/host/switch-account` | Move a host to a different user |

### CIBA (Client-Initiated Backchannel Authentication)

| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/agent/ciba/authorize` | Agent requests async user approval |
| GET | `/api/auth/agent/ciba/pending` | List pending CIBA requests for the user |
| POST | `/api/auth/device/code` | Device code flow initiation |
| POST | `/api/auth/agent/claim` | Claim an agent after device code approval |

### Authentication

| Method | Path | Description |
|---|---|---|
| GET | `/api/auth/agent/session` | Verify agent JWT (returns session) |
| POST | `/api/auth/agent/introspect` | Introspect an agent token |

---

## Calling Capabilities from an Agent

Agents authenticate with a JWT signed by their private key, then call capabilities:

```typescript
// 1. Create a signed JWT (using your agent's private key)
const agentJwt = await signAgentJwt(privateKey, {
  iss: agentId,
  sub: agentId,
  aud: "https://your-iam-server.com",
  iat: Math.floor(Date.now() / 1000),
  exp: Math.floor(Date.now() / 1000) + 300, // 5 min
  jti: crypto.randomUUID(),
});

// 2. Execute a capability
const res = await fetch("/api/auth/capability/execute", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "Authorization": `AgentAuth ${agentJwt}`,
  },
  body: JSON.stringify({
    capability: "read_patient",
    arguments: { patient_id: "123" },
  }),
});
```

---

## Server-Side Capability Verification

In your API routes or server actions, verify the agent JWT:

```typescript
import { verifyAgentRequest } from "@better-auth/agent-auth";
import { auth } from "@/modules/server/auth-provider/auth";

export async function GET(request: Request) {
  const agentSession = await verifyAgentRequest(request, auth);
  if (!agentSession) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  // agentSession.agent — the agent record
  // agentSession.user  — the user who owns the agent (if delegated)
  return Response.json({ message: "Hello, agent!" });
}
```
