/**
 * POST /api/workflow/step
 *
 * Layer: app / api / workflow / step
 *
 * Loads a specific step within an in-progress workflow session. Called by the
 * client after a successful form submission to advance to the next step, or
 * when the user skips an optional step.
 *
 * Authorization:
 *   - Requires an authenticated Better Auth session (401 if absent).
 *   - Re-validates that the caller still holds all required_permissions for the
 *     workflow (403 if missing). The workflow definition is re-sent by the client
 *     on every call, so this check is repeated here as a defense-in-depth measure.
 *
 * No server-side workflow state is kept — the client re-sends the full
 * WorkflowDefinition JSON along with the target stepIndex and accumulated
 * sessionContext on every call.
 *
 * Flow:
 *   1. Validate session — reject unauthenticated callers immediately.
 *   2. Check required_permissions on the re-sent workflow.
 *   3. Sort steps by sequence_number and look up the requested index.
 *   4. Obtain a fresh JWT from Better Auth.
 *   5. If the step declares context_resolvers or a context_resolver, execute
 *      them to hydrate the latest resource state — each resolver's own `type`
 *      picks REST (fetch against FHIR_GQL_URL, the default) or GraphQL
 *      (request against FHIR_GRAPHQL_URL, resolver.type === "graphql"); see
 *      runContextResolver() in ../_lib for the branch. Pilot scope: only the
 *      create_patient workflow's "confirm patient exists" resolvers use GraphQL.
 *   6. Return the step definition + any fetched data.
 *
 * Request body:  { workflow: WorkflowDefinition, stepIndex: number, sessionContext?: Record<string, unknown> }
 * Response:      { type: "workflow_step", step, stepIndex, stepData, sessionContext }
 *             or { type: "error", message: string }
 */

import type { WorkflowDefinition } from "@/types/workflow";
import {
  getJWTToken,
  sortedSteps,
  runContextResolver,
  runContextResolvers,
  extractOutputs,
} from "../_lib";
import { WORKFLOW_REGISTRY } from "../_registry";
import { getServerSession } from "@/modules/server/auth/get-session";
import { checkWorkflowPermission } from "@/modules/server/shared/auth/checkWorkflowPermission";

/**
 * Advances the workflow to a specific step index and runs any context resolvers.
 *
 * @param req - POST request with { workflow, stepIndex, sessionContext? } body.
 * @returns The requested step with pre-fetched FHIR data and updated sessionContext.
 */
export async function POST(req: Request) {
  // Require an authenticated session before advancing any step.
  const authSession = await getServerSession();
  if (!authSession?.user) {
    return Response.json(
      { type: "error", message: "Unauthorized" },
      { status: 401 },
    );
  }

  const {
    workflow: clientWorkflow,
    stepIndex,
    sessionContext = {},
  }: {
    workflow: WorkflowDefinition;
    stepIndex: number;
    sessionContext?: Record<string, unknown>;
  } = await req.json();

  // Always prefer the server's current workflow definition over the client's
  // snapshot. The DB stores the definition at creation time, so any context
  // resolvers added after a workflow was started would be missing from the
  // client copy. The registry is the single source of truth.
  const workflow =
    WORKFLOW_REGISTRY.get(clientWorkflow.id)?.workflow ?? clientWorkflow;

  // Re-validate permissions on every step advance using the current definition.
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

  const steps = sortedSteps(workflow.workflow_steps);

  // Advance past any steps whose skip_unless condition is not met in sessionContext.
  // This lets the client always request stepIndex N+1 and the server resolves which
  // step is actually shown, returning effectiveStepIndex so the client stays in sync.
  let effectiveStepIndex = stepIndex;
  while (effectiveStepIndex < steps.length) {
    const candidate = steps[effectiveStepIndex];
    if (!candidate.skip_unless) break; // no condition — always show this step
    const val = sessionContext[candidate.skip_unless];
    const isTruthy =
      val === true || val === "true" || val === 1 || val === "1";
    if (isTruthy) break; // condition met — show this step
    effectiveStepIndex++; // condition not met — try next step
  }

  // All remaining steps were skipped — workflow is complete.
  if (effectiveStepIndex >= steps.length) {
    return Response.json({ type: "workflow_complete" });
  }

  const step = steps[effectiveStepIndex];

  if (!step) {
    return Response.json({ type: "error", message: "Step not found" }, { status: 404 });
  }

  try {
    const token = await getJWTToken();
    let stepData: Record<string, unknown> = {};
    // Re-inject fhir_gql_url so $fhir_gql_url resolves in UI schema strings
    // (e.g. DynamicSelect source.url) via mapDataToUI on the client.
    let mergedContext = {
      ...sessionContext,
      fhir_gql_url: (process.env.FHIR_GQL_URL ?? "").replace(/\/$/, ""),
    };

    if (step.context_resolvers?.length) {
      stepData = await runContextResolvers(step.context_resolvers, mergedContext, token);
      const extracted = step.context?.outputs
        ? extractOutputs(step.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    } else if (step.context_resolver) {
      stepData = await runContextResolver(step.context_resolver, mergedContext, token);
      const extracted = step.context?.outputs
        ? extractOutputs(step.context.outputs, stepData)
        : {};
      mergedContext = { ...mergedContext, ...stepData, ...extracted };
    }

    return Response.json({
      type: "workflow_step",
      step,
      stepIndex: effectiveStepIndex,
      effectiveStepIndex,
      stepData,                   // empty object if no context resolver was declared
      sessionContext: mergedContext,
    });
  } catch (error) {
    console.error(`[workflow/step] Failed to load step ${stepIndex}:`, error);
    return Response.json({ type: "error", message: "Failed to load step" }, { status: 500 });
  }
}
