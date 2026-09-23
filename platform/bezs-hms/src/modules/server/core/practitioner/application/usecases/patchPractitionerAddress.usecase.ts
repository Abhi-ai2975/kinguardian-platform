/**
 * patchPractitionerAddressUseCase — patches an Address sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPatchPractitionerAddressDto,
  type TPractitionerAddressResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches an address record on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param addressId - Address record id.
 * @param dto - Fields to update.
 * @returns The updated address record.
 */
export async function patchPractitionerAddressUseCase(
  practitionerId: number,
  addressId: number,
  dto: TPatchPractitionerAddressDto,
): Promise<TPractitionerAddressResponse> {
  const service = getInjection("IPractitionersService");
  return service.patchAddress(practitionerId, addressId, dto);
}
