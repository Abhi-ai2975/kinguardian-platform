/**
 * addPractitionerAddressUseCase — adds an Address sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TAddPractitionerAddress,
  type TPractitionerAddressResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Adds an address record to a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param dto - Address fields.
 * @returns The created address record.
 */
export async function addPractitionerAddressUseCase(
  practitionerId: number,
  dto: TAddPractitionerAddress,
): Promise<TPractitionerAddressResponse> {
  const service = getInjection("IPractitionersService");
  return service.addAddress(practitionerId, dto);
}
