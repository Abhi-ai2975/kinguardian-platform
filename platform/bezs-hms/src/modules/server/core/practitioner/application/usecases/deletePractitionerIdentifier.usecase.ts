/**
 * deletePractitionerIdentifierUseCase — removes a business identifier sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes an identifier record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param identifierId - Identifier record id.
 */
export async function deletePractitionerIdentifierUseCase(
  practitionerId: number,
  identifierId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deleteIdentifier(practitionerId, identifierId);
}
