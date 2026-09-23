/**
 * listPractitionerQualificationsUseCase — lists all Qualification sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerQualificationListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all qualification records on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response.
 */
export async function listPractitionerQualificationsUseCase(
  practitionerId: number,
): Promise<TPractitionerQualificationListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listQualifications(practitionerId);
}
