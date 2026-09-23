/**
 * patchPractitionerPhotoUseCase — patches a photo Attachment sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerPhotoDto,
  type TPractitionerPhotoResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches a photo record on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param photoId - Photo record id.
 * @param dto - Fields to update.
 * @returns The updated photo record.
 */
export async function patchPractitionerPhotoUseCase(
  practitionerId: number,
  photoId: number,
  dto: TPatchPractitionerPhotoDto,
): Promise<TPractitionerPhotoResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchPhoto(practitionerId, photoId, dto);
}
