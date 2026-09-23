/**
 * getConditionById use case.
 *
 * Layer: server / core / condition / application / usecases
 *
 * Resolves IConditionService from DI and fetches a single resource by ID.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TConditionResponse } from "@/modules/entities/schemas/condition";

/**
 * Fetches a single Condition by numeric database ID.
 *
 * @param id - fhir-gql database ID.
 * @returns The Condition resource.
 * @throws NotFoundError if the ID does not exist.
 */
export async function getConditionByIdUseCase(
  id: number,
): Promise<TConditionResponse> {
  const service = getInjection("IConditionService");
  return service.getById(id);
}
