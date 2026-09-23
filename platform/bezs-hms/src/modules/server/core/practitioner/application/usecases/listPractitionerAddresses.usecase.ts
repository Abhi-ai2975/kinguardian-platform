/**
 * listPractitionerAddressesUseCase — lists all Address sub-resources.
 *
 * Layer: server / core / practitioner / application / usecases
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerAddressListResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Lists all address records on a Practitioner.
 *
 * @param practitionerId - Parent Practitioner id.
 * @returns List response.
 */
export async function listPractitionerAddressesUseCase(
  practitionerId: number,
): Promise<TPractitionerAddressListResponse> {
  const service = getInjection("IPractitionersService");
  return service.listAddresses(practitionerId);
}
