/**
 * listObservations use case.
 *
 * Layer: server / core / observation / application / usecases
 *
 * Resolves IObservationService from DI and delegates the list call.
 */

import { getInjection } from "@/modules/server/di/container";
import {
  type TListObservationsQuery,
  type TPaginatedObservationResponse,
} from "@/modules/entities/schemas/observation";

/**
 * Returns a paginated list of Observations with optional filters.
 *
 * @param query - Optional filter params (status, patient_id, effective_from/to, etc.).
 * @returns Paginated Observation response.
 */
export async function listObservationsUseCase(
  query?: TListObservationsQuery,
): Promise<TPaginatedObservationResponse> {
  const service = getInjection("IObservationService");
  return service.list(query);
}
