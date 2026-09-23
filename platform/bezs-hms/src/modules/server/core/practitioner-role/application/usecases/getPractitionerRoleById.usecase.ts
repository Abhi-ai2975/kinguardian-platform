/**
 * getPractitionerRoleByIdUseCase — fetches a single PractitionerRole by numeric ID.
 *
 * Layer: server / core / practitioner-role / application / usecases
 *
 * Delegates to IPractitionerRolesService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerRoleResponse } from "@/modules/entities/schemas/practitioner-role";

/**
 * Fetches a single PractitionerRole by numeric ID.
 *
 * @param id - PractitionerRole DB id.
 * @returns The PractitionerRole resource with all embedded child arrays.
 * @throws NotFoundError when the id does not exist.
 */
export async function getPractitionerRoleByIdUseCase(
  id: number,
): Promise<TPractitionerRoleResponse> {
  return getInjection("IPractitionerRolesService").getById(id);
}
