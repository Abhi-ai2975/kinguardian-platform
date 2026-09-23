/**
 * getMedicationRequestById use case.
 *
 * Layer: server / core / medication-request / application / usecases
 *
 * Resolves IMedicationRequestService from DI and fetches a single resource by ID.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TMedicationRequestResponse } from "@/modules/entities/schemas/medication-request";

/**
 * Fetches a single MedicationRequest by numeric database ID.
 *
 * @param id - fhir-gql database ID.
 * @returns The MedicationRequest resource.
 * @throws NotFoundError if the ID does not exist.
 */
export async function getMedicationRequestByIdUseCase(
  id: number,
): Promise<TMedicationRequestResponse> {
  const service = getInjection("IMedicationRequestService");
  return service.getById(id);
}
