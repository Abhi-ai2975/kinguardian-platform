/**
 * GET /api/workflow/permitted
 *
 * Layer: app / api / workflow / permitted
 *
 * Returns the subset of registered workflows the current session user is
 * allowed to run, filtered by required_permissions against the Better Auth
 * session's permissions array.
 *
 * This endpoint is consumed by the WorkflowLauncher client component to build
 * the quick-launch grid shown in the "Workflows" tab of the EMR panel.
 * Only lean metadata is returned — no step definitions, resolver configs, or
 * full workflow JSON — so the response stays small regardless of workflow size.
 *
 * Authorization:
 *   - Requires an authenticated Better Auth session (401 if absent).
 *
 * Response: { workflows: PermittedWorkflow[] }
 */

import { getServerSession } from "@/modules/server/auth/get-session";
import { checkWorkflowPermission } from "@/modules/server/shared/auth/checkWorkflowPermission";
import { WORKFLOW_ENTRIES } from "../_registry";

/** Lean workflow metadata returned to the launcher UI. */
export interface PermittedWorkflow {
  /** Stable identifier — sent back to POST /api/workflow as workflow_id. */
  id: string;
  name: string;
  description: string;
  tags: string[];
  /** Display category derived from the workflow file's folder. */
  category: string;
  required_permissions: string[];
}

/**
 * Returns the list of workflows the authenticated user is permitted to run.
 *
 * @returns JSON body { workflows: PermittedWorkflow[] }, or 401 if unauthenticated.
 */
export async function GET() {
  const authSession = await getServerSession();
  if (!authSession?.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const workflows: PermittedWorkflow[] = WORKFLOW_ENTRIES
    .filter(({ workflow }) => checkWorkflowPermission(authSession, workflow).allowed)
    .map(({ workflow, category }) => ({
      id: workflow.id,
      name: workflow.name,
      description: workflow.description,
      tags: workflow.tags ?? [],
      category,
      required_permissions: workflow.required_permissions ?? [],
    }));

  return Response.json({ workflows });
}
