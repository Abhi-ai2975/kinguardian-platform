/**
 * listPractitionerNamesUseCase — lists all HumanName sub-resources for a Practitioner.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerNameListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all name records attached to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response with data array and total count.
 */
export async function listPractitionerNamesUseCase(
  practitionerId: number,
): Promise<TPractitionerNameListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listNames(practitionerId);
}
