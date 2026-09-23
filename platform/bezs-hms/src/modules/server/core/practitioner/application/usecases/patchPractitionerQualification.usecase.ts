/**
 * patchPractitionerQualificationUseCase — patches a Qualification sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerQualificationDto,
  type TPractitionerQualificationResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches a qualification record on a Practitioner.
 * If identifier array is provided it fully replaces the existing identifiers.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param qualificationId - Qualification record id.
 * @param dto - Fields to update.
 * @returns The updated qualification record.
 */
export async function patchPractitionerQualificationUseCase(
  practitionerId: number,
  qualificationId: number,
  dto: TPatchPractitionerQualificationDto,
): Promise<TPractitionerQualificationResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchQualification(practitionerId, qualificationId, dto);
}
