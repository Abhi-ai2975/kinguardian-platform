/**
 * listPractitionerCommunicationsUseCase — lists all language preference sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerCommunicationListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all communication records on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response.
 */
export async function listPractitionerCommunicationsUseCase(
  practitionerId: number,
): Promise<TPractitionerCommunicationListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listCommunications(practitionerId);
}
