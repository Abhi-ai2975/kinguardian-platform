/**
 * listConditions use case.
 *
 * Layer: server / core / condition / application / usecases
 *
 * Resolves IConditionService from DI and delegates the list call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListConditionsQuery,
  type TPaginatedConditionResponse,
} from "@/modules/entities/schemas/condition";

/**
 * Returns a paginated list of Conditions with optional filters.
 *
 * @param query - Optional filter params (clinical_status, patient_id, recorded_from/to, etc.).
 * @returns Paginated Condition response.
 */
export async function listConditionsUseCase(
  query?: TListConditionsQuery,
): Promise<TPaginatedConditionResponse> {
  const service = getInjection("IConditionService");
  return service.list(query);
}
