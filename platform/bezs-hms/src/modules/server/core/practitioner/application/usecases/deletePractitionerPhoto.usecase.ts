/**
 * deletePractitionerPhotoUseCase — removes a photo Attachment sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a photo record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param photoId - Photo record id.
 */
export async function deletePractitionerPhotoUseCase(
  practitionerId: number,
  photoId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deletePhoto(practitionerId, photoId);
}
