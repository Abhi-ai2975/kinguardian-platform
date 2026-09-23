/**
 * updatePractitionerRoleUseCase — patches scalar fields on a PractitionerRole.
 *
 * Layer: server / core / practitioner-role / application / usecases
 *
 * Delegates to IPractitionerRolesService resolved from the DI container.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TPractitionerRolePatchDto,
  type TPractitionerRoleResponse,
} from "@/modules/entities/schemas/practitioner-role";

/**
 * Patches scalar fields on an existing PractitionerRole.
 *
 * @param id - PractitionerRole DB id.
 * @param dto - Partial scalar fields validated by PractitionerRolePatchDtoSchema.
 * @returns The updated PractitionerRole resource.
 */
export async function updatePractitionerRoleUseCase(
  id: number,
  dto: TPractitionerRolePatchDto,
): Promise<TPractitionerRoleResponse> {
  return getInjection("IPractitionerRolesService").update(id, dto);
}
