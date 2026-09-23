/**
 * listPractitionerPhotosUseCase — lists all photo Attachment sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerPhotoListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all photo records on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response.
 */
export async function listPractitionerPhotosUseCase(
  practitionerId: number,
): Promise<TPractitionerPhotoListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listPhotos(practitionerId);
}
