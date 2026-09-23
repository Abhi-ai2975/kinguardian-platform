/**
 * patchPractitionerIdentifierUseCase — patches a business identifier sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerIdentifierDto,
  type TPractitionerIdentifierResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches an identifier record on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param identifierId - Identifier record id.
 * @param dto - Fields to update.
 * @returns The updated identifier record.
 */
export async function patchPractitionerIdentifierUseCase(
  practitionerId: number,
  identifierId: number,
  dto: TPatchPractitionerIdentifierDto,
): Promise<TPractitionerIdentifierResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchIdentifier(practitionerId, identifierId, dto);
}
