/**
 * deleteMedicationRequest use case.
 *
 * Layer: server / core / medication-request / application / usecases
 *
 * Resolves IMedicationRequestService from DI and delegates the delete call.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently removes a MedicationRequest by ID.
 *
 * @param id - fhir-gql database ID of the resource to delete.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteMedicationRequestUseCase(id: number): Promise<void> {
  const service = getInjection("IMedicationRequestService");
  return service.delete(id);
}
