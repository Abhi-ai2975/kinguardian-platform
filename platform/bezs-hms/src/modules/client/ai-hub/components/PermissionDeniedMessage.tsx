/**
 * PermissionDeniedMessage.tsx
 *
 * Layer: client / ai-hub / components
 *
 * Renders a permission-denied error card inside the A2UI chat message list.
 * Shown when the server returns a 403 because the user's session is missing one
 * or more of the permissions required by the requested workflow.
 *
 * Receives the error message and the list of missing permission strings from
 * the 403 response body and formats them into a readable card using shadcn
 * styling tokens.
 */

import { ShieldX } from "lucide-react";

interface PermissionDeniedMessageProps {
  /** Human-readable error message from the server. */
  message: string;
  /** The permission strings the user is missing, e.g. ["patient:create"]. */
  missingPermissions: string[];
}

/**
 * Converts a raw permission string like "patient:create" into a readable
 * label like "Patient: Create" for display in the UI.
 *
 * @param permission - Raw permission string in resource:action format.
 * @returns Formatted label string.
 */
function formatPermission(permission: string): string {
  const [resource, action] = permission.split(":");
  if (!resource) return permission;
  const resourceLabel =
    resource.charAt(0).toUpperCase() + resource.slice(1).replace(/_/g, " ");
  const actionLabel = action
    ? action.charAt(0).toUpperCase() + action.slice(1).replace(/_/g, " ")
    : "";
  return actionLabel ? `${resourceLabel}: ${actionLabel}` : resourceLabel;
}

/**
 * Inline chat card shown when the server rejects a workflow request with 403.
 *
 * @param message - Server-provided error message.
 * @param missingPermissions - Array of permission strings the user lacks.
 */
export function PermissionDeniedMessage({
  message,
  missingPermissions,
}: PermissionDeniedMessageProps) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm max-w-sm">
      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <ShieldX className="size-4 text-destructive shrink-0" />
        <span className="font-semibold text-destructive">Permission Denied</span>
      </div>

      {/* Message */}
      <p className="text-muted-foreground mb-3">{message}</p>

      {/* Missing permissions list */}
      {missingPermissions.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground mb-1.5">
            Missing permissions:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {missingPermissions.map((perm) => (
              <span
                key={perm}
                className="inline-flex items-center rounded-md border border-destructive/30 bg-destructive/10 px-2 py-0.5 text-xs font-mono text-destructive"
              >
                {formatPermission(perm)}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
