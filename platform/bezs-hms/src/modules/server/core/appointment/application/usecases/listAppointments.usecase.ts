/**
 * listAppointmentsUseCase — paginated list of all Appointments.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Delegates to IAppointmentService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListAppointmentsQuery,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Returns a paginated list of Appointments with optional cross-tenant filters.
 *
 * @param query - Optional filters (status, patient_id, start_from, start_to, user_id, org_id, limit, offset).
 * @returns Paginated appointment list.
 */
export async function listAppointmentsUseCase(
  query?: TListAppointmentsQuery,
): Promise<TPaginatedAppointmentResponse> {
  return getInjection("IAppointmentService").list(query ?? {});
}
