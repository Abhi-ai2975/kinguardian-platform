/**
 * listPractitionerTelecomUseCase — lists all ContactPoint sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerTelecomListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all telecom records on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response.
 */
export async function listPractitionerTelecomUseCase(
  practitionerId: number,
): Promise<TPractitionerTelecomListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listTelecom(practitionerId);
}
