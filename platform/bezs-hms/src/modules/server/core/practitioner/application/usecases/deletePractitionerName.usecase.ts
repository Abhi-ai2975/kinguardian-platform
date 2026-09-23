/**
 * deletePractitionerNameUseCase — removes a HumanName sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a name record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param nameId - Name record id.
 */
export async function deletePractitionerNameUseCase(
  practitionerId: number,
  nameId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deleteName(practitionerId, nameId);
}
