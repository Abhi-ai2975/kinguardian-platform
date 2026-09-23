/**
 * createPractitionerUseCase — creates a new Practitioner resource.
 *
 * Layer: server / core / practitioner / application / usecases
 *
 * Delegates to IPractitionersService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreatePractitioner,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";

/**
 * Creates a new Practitioner by delegating to the injected service.
 *
 * @param dto - Creation payload validated by CreatePractitionerValidationSchema.
 * @returns The created Practitioner resource.
 */
export async function createPractitionerUseCase(
  dto: TCreatePractitioner,
): Promise<TPractitionerResponse> {
  const service = getInjection("IPractitionersService");
  return service.create(dto);
}
