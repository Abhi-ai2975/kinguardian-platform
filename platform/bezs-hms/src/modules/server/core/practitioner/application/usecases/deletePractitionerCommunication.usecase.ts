/**
 * deletePractitionerCommunicationUseCase — removes a language preference sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a communication record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param communicationId - Communication record id.
 */
export async function deletePractitionerCommunicationUseCase(
  practitionerId: number,
  communicationId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deleteCommunication(practitionerId, communicationId);
}
