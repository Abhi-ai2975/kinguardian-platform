/**
 * deletePractitionerRoleUseCase — deletes a PractitionerRole and all child records.
 *
 * Layer: server / core / practitioner-role / application / usecases
 *
 * Delegates to IPractitionerRolesService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently removes a PractitionerRole and all related child records (cascade).
 *
 * @param id - PractitionerRole DB id.
 */
export async function deletePractitionerRoleUseCase(id: number): Promise<void> {
  return getInjection("IPractitionerRolesService").delete(id);
}
