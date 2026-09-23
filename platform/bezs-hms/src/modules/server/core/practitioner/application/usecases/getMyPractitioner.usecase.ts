/**
 * getMyPractitionerUseCase — resolves the Practitioner linked to the caller's user ID.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 * The service implementation handles the list-then-fetch strategy.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Fetches the Practitioner record for the authenticated caller via JWT sub.
 *
 * @returns The caller's Practitioner resource.
 * @throws NotFoundError when no Practitioner is linked to the caller's JWT.
 */
export async function getMyPractitionerUseCase(): Promise<TPractitionerResponse> {
  const service = getInjection("IPractitionersService");
  return service.getMe();
}
