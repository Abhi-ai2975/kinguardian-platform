/**
 * patchPractitionerCommunicationUseCase — patches a language preference sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerCommunicationDto,
  type TPractitionerCommunicationResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches a communication record on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param communicationId - Communication record id.
 * @param dto - Fields to update.
 * @returns The updated communication record.
 */
export async function patchPractitionerCommunicationUseCase(
  practitionerId: number,
  communicationId: number,
  dto: TPatchPractitionerCommunicationDto,
): Promise<TPractitionerCommunicationResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchCommunication(practitionerId, communicationId, dto);
}
