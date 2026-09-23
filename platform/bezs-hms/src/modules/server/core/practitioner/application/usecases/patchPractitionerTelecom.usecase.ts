/**
 * patchPractitionerTelecomUseCase — patches a ContactPoint sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerTelecomDto,
  type TPractitionerTelecomResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches a telecom record on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param telecomId - Telecom record id.
 * @param dto - Fields to update.
 * @returns The updated telecom record.
 */
export async function patchPractitionerTelecomUseCase(
  practitionerId: number,
  telecomId: number,
  dto: TPatchPractitionerTelecomDto,
): Promise<TPractitionerTelecomResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchTelecom(practitionerId, telecomId, dto);
}
