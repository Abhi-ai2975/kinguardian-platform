/**
 * addPractitionerCommunicationUseCase — adds a language preference sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerCommunication,
  type TPractitionerCommunicationResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds a communication (language preference) record to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Communication fields. language_code is required.
 * @returns The created communication record.
 */
export async function addPractitionerCommunicationUseCase(
  practitionerId: number,
  dto: TAddPractitionerCommunication,
): Promise<TPractitionerCommunicationResponse> {
  const service = getInjection("IPractitionersService");
  return service.addCommunication(practitionerId, dto);
}
