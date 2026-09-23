/**
 * POST /api/workflow/submit
 *
 * Layer: app / api / workflow / submit
 *
 * Executes the action for a workflow step — the form submission leg. Two
 * transports are supported per-action via WorkflowAction.type:
 *   - "http"    — calls the FHIR REST server directly using the URL declared
 *                 in the action definition, bypassing MCP entirely.
 *   - "graphql" — calls the fhir-gql GraphQL endpoint (FHIR_GRAPHQL_URL) via
 *                 runGraphQLResolverOrAction(), looking up the query/mutation
 *                 document by the action's graphql_document key. Pilot scope:
 *                 only the create_patient workflow's Patient actions use this
 *                 so far (see schemas/graphql/index.ts for the doc registry).
 *
 * Authorization:
 *   - Requires an authenticated Better Auth session (401 if absent).
 *   - Re-validates that the caller holds all required_permissions for the
 *     workflow (403 if missing). The workflow JSON is re-sent by the client on
 *     every submit, so forged requests are caught here before any FHIR call.
 *
 * Flow:
 *   1. Validate session — reject unauthenticated callers immediately.
 *   2. Check required_permissions on the re-sent workflow.
 *   3. Resolve the target step from the re-sent WorkflowDefinition.
 *   4. Match the submitted actionName to the step's actions[] array.
 *      Falls back to actions[0] if no exact match.
 *   3. Obtain a fresh JWT from Better Auth.
 *   4. Unpack formData — A2UI forms dispatch { formData: "<JSON string>" } so
 *      we JSON.parse if the formData key holds a string.
 *   5. Strip empty/null fields; for "http" actions interpolate the action URL
 *      with sessionContext.
 *   6. If the action declares a validation_schema, validate + transform with Zod.
 *   7. Call the FHIR endpoint (REST fetch or GraphQL request) with Bearer auth
 *      and the cleaned payload. For iterate_key steps, submit each array item
 *      individually.
 *   8. Map the response through the step's context.outputs to extract named values.
 *   9. Return success + merged sessionContext + nextStepIndex.
 *
 * Request body:
 *   {
 *     workflow:       WorkflowDefinition,
 *     stepIndex:      number,
 *     actionName:     string,              // matches WorkflowAction.tool_name
 *     formData:       Record<string, unknown>,
 *     sessionContext?: Record<string, unknown>
 *   }
 *
 * Response (success):
 *   { success: true, data, nextStepIndex: number | null, sessionContext }
 *
 * Response (failure):
 *   { success: false, error: string }
 */

import type { WorkflowDefinition } from "@/types/workflow";
import {
  getJWTToken,
  sortedSteps,
  resolveUrl,
  extractOutputs,
  cleanFormData,
  runGraphQLResolverOrAction,
} from "../_lib";
import { VALIDATION_SCHEMAS } from "@/modules/client/ai-hub/schemas/validation";
import { WORKFLOW_REGISTRY } from "../_registry";
import { getServerSession } from "@/modules/server/auth/get-session";
import { checkWorkflowPermission } from "@/modules/server/shared/auth/checkWorkflowPermission";

/**
 * Executes the action for a specific workflow step.
 *
 * @param req - POST request body containing workflow, step index, action name,
 *              form data, and accumulated session context.
 * @returns Success response with next step index, or failure response with error message.
 */
export async function POST(req: Request) {
  // Require an authenticated session before executing any FHIR action.
  const authSession = await getServerSession();
  if (!authSession?.user) {
    return Response.json(
      { success: false, error: "Unauthorized" },
      { status: 401 },
    );
  }

  const {
    workflow: clientWorkflow,
    stepIndex,
    actionName,
    formData,
    sessionContext = {},
  }: {
    workflow: WorkflowDefinition;
    stepIndex: number;
    actionName: string;
    formData: Record<string, unknown>;
    sessionContext?: Record<string, unknown>;
  } = await req.json();

  // Always prefer the server's current workflow definition over the client's
  // snapshot — the client may be replaying a workflow JSON it fetched before
  // a server-side edit (new steps, changed actions, migrated transport), same
  // rationale as step/route.ts. The registry is the single source of truth.
  const workflow =
    WORKFLOW_REGISTRY.get(clientWorkflow.id)?.workflow ?? clientWorkflow;

  // Re-validate permissions before executing the FHIR action. A forged request
  // could re-send any workflow JSON, so the server must verify every submission.
  const permCheck = checkWorkflowPermission(authSession, workflow);
  if (!permCheck.allowed) {
    return Response.json(
      {
        success: false,
        error: "You do not have permission to run this workflow.",
        missing_permissions: permCheck.missing,
      },
      { status: 403 },
    );
  }

  const steps = sortedSteps(workflow.workflow_steps);
  const step = steps[stepIndex];

  if (!step) {
    return Response.json({ success: false, error: "Step not found" }, { status: 404 });
  }

  // Prefer the action whose tool_name matches the dispatched actionName;
  // fall back to the first action for steps with a single action.
  const action =
    step.actions?.find((a) => a.tool_name === actionName) ?? step.actions?.[0];

  if (!action) {
    return Response.json(
      { success: false, error: "No action defined for this step" },
      { status: 400 },
    );
  }

  try {
    const token = await getJWTToken();

    // A2UI forms serialise their field values as a JSON string inside context.formData.
    const rawFields =
      typeof formData.formData === "string"
        ? (JSON.parse(formData.formData) as Record<string, unknown>)
        : formData;

    const cleaned = cleanFormData(rawFields);

    // Validate + transform the cleaned payload against the action's declared schema (if any).
    // Skip for iterate_key steps — validation happens per-item inside the loop below.
    // Merge sessionContext so multi-step schemas can reference values from earlier steps.
    let payload: Record<string, unknown> = cleaned;
    if (action.validation_schema && !action.iterate_key) {
      const schema = VALIDATION_SCHEMAS[action.validation_schema];
      if (schema) {
        const result = schema.safeParse({ ...sessionContext, ...cleaned });
        if (!result.success) {
          const message = result.error.issues.map((i) => i.message).join("; ");
          return Response.json({ success: false, error: message }, { status: 422 });
        }
        payload = result.data as Record<string, unknown>;
      }
    }

    // GraphQL actions have no URL to interpolate — the single FHIR_GRAPHQL_URL
    // endpoint plus the resolved document decide where the call goes.
    const url = action.url ? resolveUrl(action.url, { ...sessionContext, ...cleaned }) : undefined;

    // RepeatableGroup steps set iterate_key — loop and submit each item individually.
    if (action.iterate_key) {
      const items = Array.isArray(cleaned[action.iterate_key])
        ? (cleaned[action.iterate_key] as Record<string, unknown>[])
        : [];

      let lastData: Record<string, unknown> = {};
      for (const raw of items) {
        const item = cleanFormData(raw as Record<string, unknown>);
        if (Object.keys(item).length === 0) continue;

        let itemPayload: Record<string, unknown> = item;
        if (action.validation_schema) {
          const schema = VALIDATION_SCHEMAS[action.validation_schema];
          if (schema) {
            const result = schema.safeParse({ ...sessionContext, ...item });
            if (!result.success) {
              const message = result.error.issues.map((i) => i.message).join("; ");
              return Response.json({ success: false, error: message }, { status: 422 });
            }
            itemPayload = result.data as Record<string, unknown>;
          }
        }

        if (action.type === "graphql") {
          if (!action.graphql_document) {
            return Response.json(
              { success: false, error: `Action "${action.tool_name}" declares type "graphql" but no graphql_document.` },
              { status: 500 },
            );
          }
          lastData = await runGraphQLResolverOrAction(
            action.graphql_document,
            action.graphql_variables,
            action.graphql_input_fields,
            { ...sessionContext, ...itemPayload },
            token,
          );
          continue;
        }

        const itemRes = await fetch(url!, {
          method: action.method,
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
          body: JSON.stringify(itemPayload),
          cache: "no-store",
          signal: action.timeout_ms ? AbortSignal.timeout(action.timeout_ms) : undefined,
        });
        if (!itemRes.ok) {
          const errText = await itemRes.text();
          return Response.json({ success: false, error: errText || `HTTP ${itemRes.status}` });
        }
        lastData = await itemRes.json();
      }

      const outputs = step.context ? extractOutputs(step.context.outputs, lastData) : {};
      const updatedContext = { ...sessionContext, ...outputs };
      const nextStepIndex = stepIndex + 1 < steps.length ? stepIndex + 1 : null;
      return Response.json({
        success: true,
        data: lastData,
        nextStepIndex,
        sessionContext: updatedContext,
      });
    }

    let data: Record<string, unknown>;
    if (action.type === "graphql") {
      if (!action.graphql_document) {
        return Response.json(
          { success: false, error: `Action "${action.tool_name}" declares type "graphql" but no graphql_document.` },
          { status: 500 },
        );
      }
      data = await runGraphQLResolverOrAction(
        action.graphql_document,
        action.graphql_variables,
        action.graphql_input_fields,
        { ...sessionContext, ...payload },
        token,
      );
    } else {
      const res = await fetch(url!, {
        method: action.method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        // GET requests must not carry a body per HTTP spec.
        body: action.method !== "GET" ? JSON.stringify(payload) : undefined,
        cache: "no-store",
        signal: action.timeout_ms ? AbortSignal.timeout(action.timeout_ms) : undefined,
      });

      if (!res.ok) {
        const errText = await res.text();
        return Response.json({ success: false, error: errText || `HTTP ${res.status}` });
      }

      data = await res.json();
    }

    const outputs = step.context ? extractOutputs(step.context.outputs, data) : {};

    // If the step declares required_outputs, verify each listed key is present.
    // Uses the output spec's error_message for a workflow-configurable error.
    if (step.context?.required_outputs?.length) {
      for (const key of step.context.required_outputs) {
        if (outputs[key] === undefined || outputs[key] === null) {
          const spec = step.context.outputs[key];
          const msg =
            spec?.error_message ??
            `Required output '${key}' was not found. Please check your selection and try again.`;
          return Response.json({ success: false, error: msg }, { status: 422 });
        }
      }
    }

    const updatedContext = { ...sessionContext, ...cleaned, ...outputs };
    const nextStepIndex = stepIndex + 1 < steps.length ? stepIndex + 1 : null;

    return Response.json({ success: true, data, nextStepIndex, sessionContext: updatedContext });
  } catch (error) {
    console.error(
      `[workflow/submit] Step ${stepIndex} action "${actionName}" failed:`,
      error,
    );
    return Response.json(
      { success: false, error: error instanceof Error ? error.message : "Submission failed" },
      { status: 500 },
    );
  }
}
