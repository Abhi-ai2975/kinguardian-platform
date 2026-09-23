/**
 * PermissionDeniedMessage.tsx — inline chat card for 403 workflow errors.
 *
 * Layer: client / emr-chat / components / emr-chat
 *
 * Rendered inside the MessageList when a ChatMessage has a `permissionDenied`
 * payload. Shows the error message and the list of missing permissions in a
 * readable, styled card so the user gets clear, actionable feedback.
 *
 * Copied into this module from ai-hub/components so the emr-chat feature is
 * self-contained.
 */

import { ShieldX } from "lucide-react";

interface PermissionDeniedMessageProps {
  /** Human-readable error message from the server. */
  message: string;
  /** Permission strings the current user is missing, e.g. ["patient:create"]. */
  missingPermissions: string[];
}

/**
 * Converts a raw permission string like "patient:create" into a readable
 * display label like "Patient: Create".
 *
 * @param permission - Raw permission string in resource:action format.
 * @returns Formatted label for display.
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
 * @param props.message - Server-provided error message.
 * @param props.missingPermissions - Array of permission strings the user lacks.
 */
export function PermissionDeniedMessage({
  message,
  missingPermissions,
}: PermissionDeniedMessageProps) {
  return (
    <div className="rounded-xl border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm max-w-sm">
      <div className="flex items-center gap-2 mb-2">
        <ShieldX className="size-4 text-destructive shrink-0" />
        <span className="font-semibold text-destructive">Permission Denied</span>
      </div>

      <p className="text-muted-foreground mb-3">{message}</p>

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
