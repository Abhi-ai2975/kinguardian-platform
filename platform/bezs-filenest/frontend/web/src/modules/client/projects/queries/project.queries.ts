/**
 * project.queries — TanStack Query key factory for the projects list.
 *
 * Centralises cache keys so mutations (create, delete) can invalidate exactly
 * the right entries with projectKeys.lists() without scattering string literals.
 *
 * The actual data fetching is done via useServerActionQuery(listProjectsAction)
 * — no manual fetcher needed with the ZSA React Query integration.
 *
 * @module
 */
import type { TListProjectsParams } from "@/modules/entities/schemas/project";

// ── Query key factory ──────────────────────────────────────────────────────────

/**
 * Hierarchical key factory for the project list cache.
 *
 *   projectKeys.all          → invalidates every project query
 *   projectKeys.lists()      → invalidates every list query
 *   projectKeys.list(params) → one specific page + filter combination
 */
export const projectKeys = {
  all: ["projects"] as const,
  lists: () => [...projectKeys.all, "list"] as const,
  list: (params: TListProjectsParams) =>
    [...projectKeys.lists(), params] as const,
};
