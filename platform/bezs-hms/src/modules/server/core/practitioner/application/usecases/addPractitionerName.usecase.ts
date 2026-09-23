/**
 * addPractitionerNameUseCase — adds a HumanName sub-resource to a Practitioner.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerName,
  type TPractitionerNameResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds a HumanName record to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Name fields validated by AddPractitionerNameSchema.
 * @returns The created name record.
 */
export async function addPractitionerNameUseCase(
  practitionerId: number,
  dto: TAddPractitionerName,
): Promise<TPractitionerNameResponse> {
  const service = getInjection("IPractitionersService");
  return service.addName(practitionerId, dto);
}
