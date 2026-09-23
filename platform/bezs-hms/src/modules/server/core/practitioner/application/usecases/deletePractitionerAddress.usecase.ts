/**
 * deletePractitionerAddressUseCase — removes an Address sub-resource.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes an address record from a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @param addressId - Address record id.
 */
export async function deletePractitionerAddressUseCase(
  practitionerId: number,
  addressId: number,
): Promise<void> {
  const service = getInjection("IPractitionersService");
  return service.deleteAddress(practitionerId, addressId);
}
