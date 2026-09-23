/**
 * checkWorkflowPermission.ts
 *
 * Layer: server / shared / auth
 *
 * Utility to enforce permission-based access control on A2UI workflows.
 * Compares the permission strings declared in a WorkflowDefinition against
 * the permissions array carried in the active Better Auth session.
 *
 * This is intentionally kept stateless — it reads only from the two arguments
 * passed in, so it is safe to call from any API route handler.
 */

import type { AuthResponse } from "@/modules/server/auth/types";
import type { WorkflowDefinition } from "@/types/workflow";

export interface WorkflowPermissionResult {
  /** True when the user holds every required permission for the workflow. */
  allowed: boolean;
  /** The permissions the user is missing. Empty when allowed is true. */
  missing: string[];
}

/**
 * Checks whether the authenticated user holds all permissions required by a
 * workflow definition.
 *
 * A workflow with no `required_permissions` field (or an empty array) is
 * accessible by any authenticated user.
 *
 * @param session - The resolved Better Auth session for the current request.
 * @param workflow - The WorkflowDefinition to check against.
 * @returns An object with `allowed` and `missing` fields.
 */
export function checkWorkflowPermission(
  session: AuthResponse,
  workflow: WorkflowDefinition,
): WorkflowPermissionResult {
  const required = workflow.required_permissions ?? [];

  // No restrictions declared — open to all authenticated users.
  if (required.length === 0) {
    return { allowed: true, missing: [] };
  }

  const userPermissions = new Set(session.session.permissions);
  const missing = required.filter((p) => !userPermissions.has(p));

  return {
    allowed: missing.length === 0,
    missing,
  };
}
