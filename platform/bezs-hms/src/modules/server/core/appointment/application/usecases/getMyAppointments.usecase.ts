/**
 * getMyAppointmentsUseCase — lists appointments for a specific user.
 *
 * Layer: server / core / appointment / application / usecases
 *
 * Calls GET /appointments/ with a user_id filter derived from the session
 * rather than the fhir-gql /me endpoint (which resolves to the service account).
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TGetMyAppointments,
  type TPaginatedAppointmentResponse,
} from "@/modules/entities/schemas/appointment";

/**
 * Fetches paginated appointments for the given user.
 * userId must be injected from the authenticated session, never supplied by the client.
 *
 * @param userId - The drgodly user ID whose appointments to fetch.
 * @param query - Optional filters (status, start_from, start_to, limit, offset).
 * @returns Paginated appointment list.
 */
export async function getMyAppointmentsUseCase(
  userId: string,
  query: Omit<TGetMyAppointments, "userId">,
): Promise<TPaginatedAppointmentResponse> {
  return getInjection("IAppointmentService").getMe(userId, query);
}
