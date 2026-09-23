/**
 * listPractitionerRolesForBookingUseCase — lists PractitionerRoles enriched for booking UIs.
 *
 * Layer: server / core / practitioner-role / application / usecases
 *
 * Delegates to IPractitionerRolesService resolved from the DI container.
 * Calls the /booking endpoint which joins Practitioner detail (name, photo, gender,
 * qualifications) for booking UI efficiency.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListPractitionerRolesForBookingQuery,
  type TPaginatedPractitionerRoleBookingResponse,
} from "@/modules/entities/schemas/practitioner-role";

/**
 * Lists PractitionerRoles with embedded Practitioner detail for booking screens.
 *
 * @param query - Optional specialty/day_of_week/active filter params.
 * @returns Paginated booking-enriched list.
 */
export async function listPractitionerRolesForBookingUseCase(
  query?: TListPractitionerRolesForBookingQuery,
): Promise<TPaginatedPractitionerRoleBookingResponse> {
  return getInjection("IPractitionerRolesService").listForBooking(query);
}
