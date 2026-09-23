/**
 * deletePractitionerTelecomUseCase — removes a ContactPoint sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a telecom record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param telecomId - Telecom record id.
 */
export async function deletePractitionerTelecomUseCase(
  practitionerId: number,
  telecomId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deleteTelecom(practitionerId, telecomId);
}
