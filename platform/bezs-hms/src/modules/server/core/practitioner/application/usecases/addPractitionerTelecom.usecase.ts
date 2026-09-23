/**
 * addPractitionerTelecomUseCase — adds a ContactPoint sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerTelecom,
  type TPractitionerTelecomResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds a telecom (phone, email, fax, etc.) record to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Telecom fields. system and value are required.
 * @returns The created telecom record.
 */
export async function addPractitionerTelecomUseCase(
  practitionerId: number,
  dto: TAddPractitionerTelecom,
): Promise<TPractitionerTelecomResponse> {
  const service = getInjection("IPractitionersService");
  return service.addTelecom(practitionerId, dto);
}
