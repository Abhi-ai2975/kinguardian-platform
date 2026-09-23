/**
 * getPractitionerByIdUseCase — fetches a single Practitioner by numeric ID.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TPractitionerResponse } from "@/modules/entities/schemas/practitioner";

/**
 * Fetches a Practitioner resource by its numeric database ID.
 *
 * @param id - Practitioner database id.
 * @returns The Practitioner resource.
 * @throws NotFoundError when the id does not exist.
 */
export async function getPractitionerByIdUseCase(
  id: number,
): Promise<TPractitionerResponse> {
  const service = getInjection("IPractitionersService");
  return service.getById(id);
}
