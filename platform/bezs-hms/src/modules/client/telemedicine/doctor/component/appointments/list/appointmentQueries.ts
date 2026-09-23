/**
 * Doctor appointment query keys and fetcher.
 *
 * Layer: client / telemedicine / doctor / appointments / list
 *
 * Centralises TanStack Query keys for the org-scoped appointment list so that
 * mutations can invalidate exactly the right cache entries.
 */

import { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for the doctor/practitioner appointment list.
 *
 * Hierarchy:
 *   all           → invalidates every doctor-appointment query
 *   lists()       → invalidates every list query
 *   list(params)  → invalidates one specific paginated page
 */
export const doctorAppointmentKeys = {
  /** Root key — invalidate this after any appointment mutation. */
  all: ["doctor-appointments"] as const,

  /** Parent key for all list queries. */
  lists: () => [...doctorAppointmentKeys.all, "list"] as const,

  /**
   * Key for one paginated page, scoped to the active org so different tenants
   * never share a cache entry.
   *
   * @param params - Pagination + tenant filter used in this fetch.
   */
  list: (params: { pageIndex: number; pageSize: number; orgId: string | null; practitionerId: number | null; status?: string }) =>
    [...doctorAppointmentKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of appointments for the active organisation.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination and tenant filter forwarded to the list action.
 * @returns Paginated appointment response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchDoctorAppointments(params: {
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
  practitionerId: number | null;
  /** FHIR status code to filter by — undefined means "all statuses". */
  status?: string;
}): Promise<TPaginatedAppointmentResponse> {
  const [data, err] = await listAppointmentsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      org_id: params.orgId ?? undefined,
      practitioner_id: params.practitionerId ?? undefined,
      // Only include status when a filter is active
      ...(params.status ? { status: params.status as never } : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load appointments");
  return data!;
}
