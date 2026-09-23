/**
 * patchPractitionerNameUseCase — patches a HumanName sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerNameDto,
  type TPractitionerNameResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches a name record on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param nameId - Name record id.
 * @param dto - Fields to update.
 * @returns The updated name record.
 */
export async function patchPractitionerNameUseCase(
  practitionerId: number,
  nameId: number,
  dto: TPatchPractitionerNameDto,
): Promise<TPractitionerNameResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchName(practitionerId, nameId, dto);
}
