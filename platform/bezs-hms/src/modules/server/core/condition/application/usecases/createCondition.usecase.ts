/**
 * createCondition use case.
 *
 * Layer: server / core / condition / application / usecases
 *
 * Resolves IConditionService from DI and delegates the create call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TCreateCondition,
  type TConditionResponse,
} from "@/modules/entities/schemas/condition";

/**
 * Creates a new Condition via the transport-agnostic IConditionService.
 *
 * @param dto - Validated create payload (all fields optional per FHIR spec).
 * @returns The created Condition resource.
 */
export async function createConditionUseCase(
  dto: TCreateCondition,
): Promise<TConditionResponse> {
  const service = getInjection("IConditionService");
  return service.create(dto);
}
