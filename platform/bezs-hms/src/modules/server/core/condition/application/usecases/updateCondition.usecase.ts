/**
 * updateCondition use case.
 *
 * Layer: server / core / condition / application / usecases
 *
 * Resolves IConditionService from DI and delegates the patch call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TUpdateConditionDto,
  type TConditionResponse,
} from "@/modules/entities/schemas/condition";

/**
 * Patches scalar fields on an existing Condition.
 *
 * @param id - fhir-gql database ID of the resource to update.
 * @param dto - Scalar patch payload (all fields optional).
 * @returns The updated Condition resource.
 */
export async function updateConditionUseCase(
  id: number,
  dto: TUpdateConditionDto,
): Promise<TConditionResponse> {
  const service = getInjection("IConditionService");
  return service.update(id, dto);
}
