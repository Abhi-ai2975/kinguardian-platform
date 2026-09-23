/**
 * addPractitionerPhotoUseCase — adds a photo Attachment sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerPhoto,
  type TPractitionerPhotoResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds a photo (Attachment) record to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Photo fields (url or base-64 data).
 * @returns The created photo record.
 */
export async function addPractitionerPhotoUseCase(
  practitionerId: number,
  dto: TAddPractitionerPhoto,
): Promise<TPractitionerPhotoResponse> {
  const service = getInjection("IPractitionersService");
  return service.addPhoto(practitionerId, dto);
}
