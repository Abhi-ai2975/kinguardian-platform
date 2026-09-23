/**
 * POST /api/workflow
 *
 * Layer: app / api / workflow
 *
 * Entry point for the workflow system. Supports two trigger modes:
 *
 *   Agent mode   — { message: string }
 *     Forwards the user's message to the external AI agent, which selects the
 *     appropriate workflow and returns its definition as JSON. The permitted
 *     workflow IDs are injected into the request so the agent can only suggest
 *     workflows the caller is allowed to run.
 *
 *   Direct mode  — { workflow_id: string }
 *     Bypasses the agent entirely. The workflow is looked up by ID in the local
 *     registry. Used by the launcher UI when the user clicks a workflow card.
 *
 * Both modes converge at the same permission check, step resolution, and
 * context resolver execution before returning the first step to the client.
 *
 * Authorization:
 *   - Requires an authenticated Better Auth session (401 if absent).
 *   - Checks that the resolved workflow's required_permissions[] are all
 *     present in session.session.permissions (403 if any are missing).
 *
 * Flow:
 *   1. Validate session — reject unauthenticated callers immediately.
 *   2. Resolve workflow — via agent (message) or registry (workflow_id).
 *   3. Obtain a short-lived JWT from Better Auth for downstream FHIR calls.
 *   4. Check that the caller holds all required_permissions for the workflow.
 *   5. Sort workflow_steps by sequence_number and take step[0].
 *   6. If the first step declares a context_resolver / context_resolvers, run
 *      them now so the client receives pre-fetched FHIR data with the step.
 *   7. Return the full workflow object + first step to the client.
 *
 * No server-side workflow state is kept — the full workflow JSON travels back
 * to the client and is re-sent with each subsequent /step and /submit call.
 *
 * Request body:  { message?: string, workflow_id?: string, sessionContext?: Record<string, unknown> }
 * Response:      { type: "workflow_step", workflow, stepIndex, step, stepData, sessionContext }
 *             or { type: "error", message: string, missing_permissions?: string[] }
 */

import type { WorkflowDefinition } from "@/types/workflow";
import {
  getJWTToken,
  sortedSteps,
  runContextResolver,
  runContextResolvers,
  extractOutputs,
} from "./_lib";
import { getServerSession } from "@/modules/server/auth/get-session";
import { checkWorkflowPermission } from "@/modules/server/shared/auth/checkWorkflowPermission";
import { WORKFLOW_REGISTRY, WORKFLOW_ENTRIES } from "./_registry";

const AGENT_API_URL = process.env.AGENT_API_URL!;

/**
 * Builds the merged session context seeded with identity values and the FHIR
 * base URL so workflow steps can interpolate them without asking the user.
 *
 * @param base - Caller-supplied sessionContext from the request body.
 * @param authSession - Authenticated Better Auth session.
 * @returns Merged context object ready for step data resolution.
 */
function buildBaseContext(
  base: Record<string, unknown>,
  authSession: NonNullable<Awaited<ReturnType<typeof getServerSession>>>,
): Record<string, unknown> {
  return {
    ...base,
    ...(authSession.user?.id ? { user_id: authSession.user.id } : {}),
    ...(authSession.session?.activeOrganizationId
      ? { org_id: authSession.session.activeOrganizationId }
      : {}),
    fhir_gql_url: (process.env.FHIR_GQL_URL ?? "").replace(/\/$/, ""),
  };
}

/**
 * Starts a new workflow session.
 *
 * @param req - POST request with { message?, workflow_id?, sessionContext? } body.
 * @returns First workflow step with pre-fetched context data, or an error response.
 */
export async function POST(req: Request) {
  const {
    message,
    workflow_id,
    sessionContext = {},
  }: {
    message?: string;
    workflow_id?: string;
    sessionContext?: Record<string, unknown>;
  } = await req.json();

  const hasMessage = Boolean(message?.trim());
  const hasWorkflowId = Boolean(workflow_id?.trim());

  if (!hasMessage && !hasWorkflowId) {
    return Response.json(
      { type: "error", message: "Provide either message or workflow_id" },
      { status: 400 },
    );
  }

  // Require an authenticated session before doing any work.
  const authSession = await getServerSession();
  if (!authSession?.user) {
    return Response.json(
      { type: "error", message: "Unauthorized" },
      { status: 401 },
    );
  }

  try {
    // JWT is needed for agent calls (auth header) and context resolver FHIR
    // calls — fetch once upfront so both paths share the same token.
    const token = await getJWTToken();

    let workflow: WorkflowDefinition;

    if (hasWorkflowId) {
      // ── Direct mode: look up workflow in local registry ───────────────────
      const entry = WORKFLOW_REGISTRY.get(workflow_id!.trim());
      if (!entry) {
        return Response.json(
          { type: "error", message: `Unknown workflow: ${workflow_id}` },
          { status: 404 },
        );
      }
      workflow = entry.workflow;
    } else {
      // ── Agent mode: forward message to AI agent ───────────────────────────
      // Compute the permitted workflow IDs for this caller so the agent can
      // filter its suggestions to only workflows the user is allowed to run.
      const permittedIds = WORKFLOW_ENTRIES
        .filter(({ workflow: w }) => checkWorkflowPermission(authSession, w).allowed)
        .map(({ workflow: w }) => w.id);

      const agentRes = await fetch(AGENT_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          query: message,
          session_id:
            (sessionContext.session_id as string | undefined) ??
            crypto.randomUUID(),
          // Permitted workflow IDs injected so the agent only recommends
          // workflows this user is authorised to run (defense in depth).
          permitted_workflow_ids: permittedIds,
        }),
        cache: "no-store",
      });

      if (!agentRes.ok) throw new Error(`Agent API error: ${agentRes.status}`);
      workflow = await agentRes.json();
    }

    // ── Permission check (both modes) ────────────────────────────────────────
    // Re-check even in direct mode: the registry lookup above only finds the
    // workflow; the permission gate ensures the caller holds the required grants.
    const permCheck = checkWorkflowPermission(authSession, workflow);
    if (!permCheck.allowed) {
      return Response.json(
        {
          type: "error",
          message: "You do not have permission to run this workflow.",
          missing_permissions: permCheck.missing,
        },
        { status: 403 },
      );
    }

    // ── Step resolution ───────────────────────────────────────────────────────
    const resolverToken = token;

    const steps = sortedSteps(workflow.workflow_steps);
    const firstStep = steps[0];

    if (!firstStep) {
      return Response.json(
        { type: "error", message: "Workflow has no steps" },
        { status: 500 },
      );
    }

    let stepData: Record<string, unknown> = {};
    let mergedContext = buildBaseContext(sessionContext, authSession);

    if (firstStep.context_resolvers?.length) {
      stepData = await runContextResolvers(
        firstStep.context_resolvers,
        mergedContext,
        resolverToken,
      );
      const extracted = firstStep.context?.outputs
        ? extractOutputs(firstStep.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    } else if (firstStep.context_resolver) {
      stepData = await runContextResolver(
        firstStep.context_resolver,
        mergedContext,
        resolverToken,
      );
      const extracted = firstStep.context?.outputs
        ? extractOutputs(firstStep.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    }

    return Response.json({
      type: "workflow_step",
      workflow, // full definition — client caches this for the whole session
      stepIndex: 0,
      step: firstStep,
      stepData, // pre-fetched FHIR data for the first step, if any
      sessionContext: mergedContext,
    });
  } catch (error) {
    console.error("[workflow] Failed to start workflow:", error);
    return Response.json(
      { type: "error", message: "Failed to start workflow" },
      { status: 500 },
    );
  }
}
