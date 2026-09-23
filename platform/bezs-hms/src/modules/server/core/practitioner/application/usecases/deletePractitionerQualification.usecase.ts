/**
 * deletePractitionerQualificationUseCase — removes a Qualification sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a qualification record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param qualificationId - Qualification record id.
 */
export async function deletePractitionerQualificationUseCase(
  practitionerId: number,
  qualificationId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deleteQualification(practitionerId, qualificationId);
}
