/**
 * deleteObservation use case.
 *
 * Layer: server / core / observation / application / usecases
 *
 * Resolves IObservationService from DI and delegates the delete call.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently removes an Observation by ID.
 *
 * @param id - fhir-gql database ID of the resource to delete.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteObservationUseCase(id: number): Promise<void> {
  const service = getInjection("IObservationService");
  return service.delete(id);
}
