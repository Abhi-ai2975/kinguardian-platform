/**
 * Patient appointment query keys and fetcher — Clinical Records drill-down.
 *
 * Layer: client / telemedicine / doctor / component / clinical-records
 *
 * Pure server-side pagination via the same ZSA server action the doctor's org
 * appointment list uses (listAppointmentsAction). Every page turn, status pick
 * or date-range change is a real fetch — the table never holds more than one
 * page of rows in memory. Pattern mirrors appointmentQueries.ts on the doctor
 * appointments list; the only difference is the extra patient_id scope and the
 * start_from/start_to date-range params this screen also filters on.
 */

import type { TPaginatedAppointmentResponse } from "@/modules/entities/schemas/appointment";
import { listAppointmentsAction } from "@/modules/server/presentation/actions/appointment";

// ── Query key factory ─────────────────────────────────────────────────────────

/**
 * Hierarchical query key factory for one patient's appointment list.
 *
 * Hierarchy:
 *   all           → invalidates every patient-appointment query
 *   lists()       → invalidates every list query
 *   list(params)  → invalidates one specific paginated, filtered page
 */
export const patientAppointmentKeys = {
  /** Root key — invalidate this after any appointment mutation. */
  all: ["patient-appointments"] as const,

  /** Parent key for all list queries. */
  lists: () => [...patientAppointmentKeys.all, "list"] as const,

  /**
   * Key for one paginated, filtered page.
   *
   * @param params - Pagination, tenant scope and active filters for this fetch.
   */
  list: (params: {
    patientId: number;
    pageIndex: number;
    pageSize: number;
    orgId: string | null;
    practitionerId: number | null;
    status?: string;
    startFrom?: string;
    startTo?: string;
  }) => [...patientAppointmentKeys.lists(), params] as const,
};

// ── Fetcher ───────────────────────────────────────────────────────────────────

/**
 * Fetches one page of a patient's appointments with this practitioner.
 * Throws on error so TanStack Query can handle retries and error state.
 *
 * @param params - Pagination, tenant scope and active filters.
 * @returns Paginated appointment response.
 * @throws Error with the server action's error message on failure.
 */
export async function fetchPatientAppointments(params: {
  patientId: number;
  pageIndex: number;
  pageSize: number;
  orgId: string | null;
  practitionerId: number | null;
  /** FHIR status code to filter by — undefined means "all statuses". */
  status?: string;
  /** ISO datetime lower bound on Appointment.start. */
  startFrom?: string;
  /** ISO datetime upper bound on Appointment.start. */
  startTo?: string;
}): Promise<TPaginatedAppointmentResponse> {
  const [data, err] = await listAppointmentsAction({
    payload: {
      limit: params.pageSize,
      offset: params.pageIndex * params.pageSize,
      patient_id: params.patientId,
      practitioner_id: params.practitionerId ?? undefined,
      org_id: params.orgId ?? undefined,
      // Only include filters when active — an explicit undefined key would
      // still round-trip fine, but omitting it keeps the query key/payload
      // symmetry with the doctor-side fetcher this pattern mirrors.
      ...(params.status ? { status: params.status as never } : {}),
      ...(params.startFrom ? { start_from: params.startFrom } : {}),
      ...(params.startTo ? { start_to: params.startTo } : {}),
    },
  });

  if (err) throw new Error(err.message ?? "Failed to load appointments");
  return data!;
}
