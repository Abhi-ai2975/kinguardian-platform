/**
 * deleteCondition use case.
 *
 * Layer: server / core / condition / application / usecases
 *
 * Resolves IConditionService from DI and delegates the delete call.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently removes a Condition by ID.
 *
 * @param id - fhir-gql database ID of the resource to delete.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteConditionUseCase(id: number): Promise<void> {
  const service = getInjection("IConditionService");
  return service.delete(id);
}
