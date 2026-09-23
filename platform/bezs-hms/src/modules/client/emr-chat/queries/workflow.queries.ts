/**
 * workflow.queries — TanStack Query keys and hooks for the EMR workflow endpoints.
 *
 * Layer: client / emr-chat / queries
 *
 * Hooks:
 *   usePermittedWorkflows — fetches GET /api/workflow/permitted and returns the
 *                           list of workflows the current user is allowed to run,
 *                           filtered server-side by the user's session permissions.
 *
 * The permitted list is derived from the user's session so it only changes on
 * login / permission update — staleTime is set to 5 minutes to avoid redundant
 * round-trips when the user switches tabs or re-opens the Workflows panel.
 */

"use client";

import { useQuery } from "@tanstack/react-query";
import type { PermittedWorkflow } from "@/app/api/workflow/permitted/route";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Centralised query key factory for workflow endpoints.
 * Keeps cache invalidation predictable across the emr-chat module.
 */
export const workflowKeys = {
  /** Base key — invalidates all workflow queries. */
  all: ["workflow"] as const,
  /** Key for the permission-filtered workflow list. */
  permitted: () => [...workflowKeys.all, "permitted"] as const,
};

// ── Fetcher ────────────────────────────────────────────────────────────────────

/**
 * Fetches the list of workflows the current session user is permitted to run.
 * Throws on non-OK responses so TanStack Query can handle retries.
 *
 * @returns Array of permitted workflow metadata.
 * @throws Error with HTTP status when the request fails.
 */
async function fetchPermittedWorkflows(): Promise<PermittedWorkflow[]> {
  const res = await fetch("/api/workflow/permitted");
  if (!res.ok) {
    throw new Error(`Failed to load permitted workflows (${res.status})`);
  }
  const data = await res.json();
  return data.workflows ?? [];
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Returns the list of workflows the authenticated user is allowed to run,
 * matched against their session permissions on the server.
 *
 * Caching behaviour:
 *   staleTime — 5 minutes: permissions don't change during a normal session.
 *   gcTime    — inherits the global 5-minute default from QueryProvider.
 *   retry     — inherits the global 1-retry default from QueryProvider.
 *
 * @returns TanStack Query result containing `data: PermittedWorkflow[] | undefined`.
 */
export function usePermittedWorkflows() {
  return useQuery({
    queryKey: workflowKeys.permitted(),
    queryFn: fetchPermittedWorkflows,
    staleTime: 5 * 60_000,
  });
}
