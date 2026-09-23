/**
 * Patient appointment query keys and fetcher.
 *
 * Layer: client / telemedicine / patient / appointments / list
 *
 * Centralises TanStack Query keys for the patient's own appointment list so
 * that mutations can invalidate exactly the right cache entries without
 * scattering string literals across files.
 */

import { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { getMyAppointmentsAction } from "@/modules/server/presentation/actions/appointment";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for the patient appointment list.
 *
 * Hierarchy:
 *   all           → invalidates every patient-appointment query
 *   lists()       → invalidates every list query
 *   list(params)  → invalidates one specific paginated page + filter combo
 */
export const patientAppointmentKeys = {
  /** Root key — invalidate this after any appointment mutation. */
  all: ["patient-appointments"] as const,

  /** Parent key for all list queries. */
  lists: () => [...patientAppointmentKeys.all, "list"] as const,

  /**
   * Key for one paginated page with active filters.
   * Including `status` means the cache is scoped per filter value — changing
   * the status filter triggers a fresh fetch rather than reusing stale data.
   *
   * @param params - Pagination + filter params used in this fetch.
   */
  list: (params: { pageIndex: number; pageSize: number; status?: string }) =>
    [...patientAppointmentKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of the authenticated patient's own appointments.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination and filter params forwarded to the list action.
 * @returns Paginated appointment response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchMyAppointments(params: {
  pageIndex: number;
  pageSize: number;
  /** FHIR status code to filter by — undefined means "all statuses". */
  status?: string;
}): Promise<TPaginatedAppointmentResponse> {
  const [data, err] = await getMyAppointmentsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      // Only include status when a filter is active
      ...(params.status ? { status: params.status as never } : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load appointments");
  return data!;
}
