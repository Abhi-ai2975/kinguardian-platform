/**
 * updatePractitionerUseCase — patches scalar fields on a Practitioner.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPractitionerPatchDto,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Patches a Practitioner record.
 *
 * @param id - Practitioner database id.
 * @param dto - Partial fields to update (validated by UpdatePractitionerValidationSchema).
 * @returns The updated Practitioner resource.
 */
export async function updatePractitionerUseCase(
  id: number,
  dto: TPractitionerPatchDto,
): Promise<TPractitionerResponse> {
  const service = getInjection("IPractitionersService");
  return service.update(id, dto);
}
