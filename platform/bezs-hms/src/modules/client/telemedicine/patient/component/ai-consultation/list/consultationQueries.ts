/**
 * AI Consultation query keys and fetcher.
 *
 * Layer: client / telemedicine / patient / ai-consultation / list
 *
 * Centralises TanStack Query keys for the patient-scoped AI Consultation list
 * so that mutations can invalidate exactly the right cache entries.
 */

import type { TPaginatedConsultationResponse } from "@/modules/entities/schemas/consultation";
import { listConsultationsAction } from "@/modules/server/presentation/actions/consultation/core.actions";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for the patient AI Consultation list.
 *
 * Hierarchy:
 *   all           → invalidates every patient-consultation query
 *   lists()       → invalidates every list query
 *   list(params)  → one specific paginated page
 */
export const patientConsultationKeys = {
  /** Root key — invalidate after any consultation mutation. */
  all: ["patient-consultations"] as const,

  /** Parent key for all list queries. */
  lists: () => [...patientConsultationKeys.all, "list"] as const,

  /**
   * Key for one paginated page, scoped to the current user.
   *
   * @param params - Pagination + filter params used in this fetch.
   */
  list: (params: {
    pageIndex: number;
    pageSize: number;
    userId: string | null;
    status?: string;
  }) => [...patientConsultationKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of AI Consultation records for the logged-in patient.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination and filter params forwarded to the list action.
 * @returns Paginated consultation response (lightweight list items, no JSON blobs).
 * @throws Error with the server action error message on failure.
 */
export async function fetchPatientConsultations(params: {
  pageIndex: number;
  pageSize: number;
  userId: string | null;
  /** Consultation status to filter by — undefined means "all statuses". */
  status?: string;
}): Promise<TPaginatedConsultationResponse> {
  const [data, err] = await listConsultationsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      ...(params.userId ? { user_id: params.userId } : {}),
      ...(params.status
        ? {
            status: params.status as
              | "WAITING"
              | "ACTIVE"
              | "COMPLETED"
              | "ABANDONED",
          }
        : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load consultation records");
  return data!;
}
