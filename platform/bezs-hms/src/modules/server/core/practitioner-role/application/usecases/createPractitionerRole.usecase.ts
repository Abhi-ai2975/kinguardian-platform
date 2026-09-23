/**
 * createPractitionerRoleUseCase — creates a new PractitionerRole resource.
 *
 * Layer: server / core / practitioner-role / application / usecases
 *
 * Delegates to IPractitionerRolesService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreatePractitionerRole,
  type TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";

/**
 * Creates a new PractitionerRole with all inline sub-resources.
 *
 * @param dto - Creation payload validated by CreatePractitionerRoleValidationSchema.
 * @returns The created PractitionerRole resource.
 */
export async function createPractitionerRoleUseCase(
  dto: TCreatePractitionerRole,
): Promise<TPractitionerRoleResponse> {
  return getInjection("IPractitionerRolesService").create(dto);
}
