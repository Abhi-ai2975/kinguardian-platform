/**
 * @module agent-auth/require-agent-auth
 * @description Agent authentication guards for API routes.
 *              Use these in any route handler that accepts agent requests.
 *
 * **Functions:**
 * - `getAgentSession(request)` — verifies the `AgentAuth <jwt>` header
 *   and returns the agent session. Returns `null` for invalid/missing JWTs.
 * - `requireAgentCapability(session, capability)` — asserts the agent has
 *   an active grant for the named capability. Throws if not.
 * - `requireDelegatedAgent(session)` — asserts the session is delegated
 *   (linked to a real user). Throws for autonomous agents.
 *
 * **Usage in API routes:**
 * ```ts
 * const session = await getAgentSession(request);
 * if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });
 * requireAgentCapability(session, "profile:read");
 * // ... handler logic
 * ```
 * @category Agent Auth
 */

"server-only";

import type { AgentSession } from "@better-auth/agent-auth";
import { verifyAgentRequest } from "@better-auth/agent-auth";
import type { Auth } from "better-auth";
import { auth } from "../auth-provider/auth";

export async function getAgentSession(
  request: Request,
): Promise<AgentSession | null> {
  return verifyAgentRequest(request, auth as unknown as Auth) as Promise<AgentSession | null>;
}

export function requireAgentCapability(
  agentSession: AgentSession,
  capability: string,
): void {
  const grant = agentSession.agent.capabilityGrants.find(
    (g) => g.capability === capability && g.status === "active",
  );
  if (!grant) {
    throw new Error(
      `Agent '${agentSession.agent.id}' does not have an active grant for capability '${capability}'`,
    );
  }
}

export function requireDelegatedAgent(agentSession: AgentSession): void {
  if (agentSession.type !== "delegated" || !agentSession.user?.id) {
    throw new Error(
      "This endpoint requires a delegated agent session linked to a user",
    );
  }
}
