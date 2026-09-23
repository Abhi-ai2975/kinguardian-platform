/**
 * deletePractitionerUseCase — deletes a Practitioner and all related sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a Practitioner record and all sub-resources (names, identifiers, etc.).
 *
 * @param id - Practitioner database id.
 */
export async function deletePractitionerUseCase(id: number): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.delete(id);
}
