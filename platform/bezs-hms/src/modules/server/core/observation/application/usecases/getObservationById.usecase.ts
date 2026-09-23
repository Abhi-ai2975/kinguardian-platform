/**
 * getObservationById use case.
 *
 * Layer: server / core / observation / application / usecases
 *
 * Resolves IObservationService from DI and fetches a single resource by ID.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TObservationResponse } from "@/modules/entities/schemas/observation";

/**
 * Fetches a single Observation by numeric database ID.
 *
 * @param id - fhir-gql database ID.
 * @returns The Observation resource.
 * @throws NotFoundError if the ID does not exist.
 */
export async function getObservationByIdUseCase(
  id: number,
): Promise<TObservationResponse> {
  const service = getInjection("IObservationService");
  return service.getById(id);
}
