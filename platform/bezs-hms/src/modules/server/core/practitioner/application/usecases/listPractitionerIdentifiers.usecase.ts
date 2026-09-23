/**
 * listPractitionerIdentifiersUseCase — lists all identifier sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerIdentifierListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all identifier records on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response.
 */
export async function listPractitionerIdentifiersUseCase(
  practitionerId: number,
): Promise<TPractitionerIdentifierListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listIdentifiers(practitionerId);
}
