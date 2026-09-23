/**
 * AI Intake query keys and fetcher.
 *
 * Layer: client / telemedicine / patient / ai-intake / list
 *
 * Centralises TanStack Query keys for the patient-scoped AI Intake list so
 * that mutations can invalidate exactly the right cache entries.
 */

import type { TPaginatedIntakeResponse } from "@/modules/entities/schemas/intake";
import { listIntakesAction } from "@/modules/server/presentation/actions/intake";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for the patient AI Intake list.
 *
 * Hierarchy:
 *   all           → invalidates every patient-intake query
 *   lists()       → invalidates every list query
 *   list(params)  → one specific paginated page
 */
export const patientIntakeKeys = {
  /** Root key — invalidate after any intake mutation. */
  all: ["patient-intakes"] as const,

  /** Parent key for all list queries. */
  lists: () => [...patientIntakeKeys.all, "list"] as const,

  /**
   * Key for one paginated page, scoped to the current user so different
   * sessions never share a cache entry.
   *
   * @param params - Pagination + filter params used in this fetch.
   */
  list: (params: {
    pageIndex: number;
    pageSize: number;
    userId: string | null;
    status?: string;
    mode?: string;
  }) => [...patientIntakeKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of AI Intake records for the logged-in patient.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination and filter params forwarded to the list action.
 * @returns Paginated intake response.
 * @throws Error with the server action error message on failure.
 */
export async function fetchPatientIntakes(params: {
  pageIndex: number;
  pageSize: number;
  userId: string | null;
  /** Intake status to filter by — undefined means "all statuses". */
  status?: string;
  /** Intake mode to filter by (TEXT | VOICE) — undefined means "all modes". */
  mode?: string;
}): Promise<TPaginatedIntakeResponse> {
  const [data, err] = await listIntakesAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      ...(params.userId ? { user_id: params.userId } : {}),
      ...(params.status
        ? {
            status: params.status as
              | "IN_PROGRESS"
              | "COMPLETED"
              | "ABANDONED",
          }
        : {}),
      ...(params.mode
        ? { mode: params.mode as "TEXT" | "VOICE" }
        : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load intake records");
  return data!;
}
