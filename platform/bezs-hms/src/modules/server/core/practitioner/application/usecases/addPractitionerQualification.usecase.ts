/**
 * addPractitionerQualificationUseCase — adds a Qualification sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerQualification,
  type TPractitionerQualificationResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds a qualification (certification, license, training) to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Qualification fields. May include nested identifier array.
 * @returns The created qualification record.
 */
export async function addPractitionerQualificationUseCase(
  practitionerId: number,
  dto: TAddPractitionerQualification,
): Promise<TPractitionerQualificationResponse> {
  const service = getInjection("IPractitionersService");
  return service.addQualification(practitionerId, dto);
}
