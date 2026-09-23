/**
 * listPractitionerRolesUseCase — lists PractitionerRole resources.
 *
 * Layer: server / core / practitioner-role / application / usecases
 *
 * Delegates to IPractitionerRolesService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListPractitionerRolesQuery,
  type TPaginatedPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";

/**
 * Lists PractitionerRoles with optional filters and pagination.
 *
 * @param query - Optional filter/pagination params.
 * @returns Paginated list of PractitionerRoles.
 */
export async function listPractitionerRolesUseCase(
  query?: TListPractitionerRolesQuery,
): Promise<TPaginatedPractitionerRoleResponse> {
  return getInjection("IPractitionerRolesService").list(query);
}
