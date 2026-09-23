/**
 * addPractitionerIdentifierUseCase — adds a business identifier sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerIdentifier,
  type TPractitionerIdentifierResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds an identifier (NPI, DEA, license number, etc.) to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Identifier fields. value is required.
 * @returns The created identifier record.
 */
export async function addPractitionerIdentifierUseCase(
  practitionerId: number,
  dto: TAddPractitionerIdentifier,
): Promise<TPractitionerIdentifierResponse> {
  const service = getInjection("IPractitionersService");
  return service.addIdentifier(practitionerId, dto);
}
