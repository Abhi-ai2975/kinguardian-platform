/**
 * getServiceRequestById use case.
 *
 * Layer: server / core / service-request / application / usecases
 *
 * Resolves IServiceRequestService from DI and fetches a single resource by ID.
 */

import { getInjection } from "@/modules/server/di/container";
import { type TServiceRequestResponse } from "@/modules/entities/schemas/service-request";

/**
 * Fetches a single ServiceRequest by numeric database ID.
 *
 * @param id - fhir-gql database ID.
 * @returns The ServiceRequest resource.
 * @throws NotFoundError if the ID does not exist.
 */
export async function getServiceRequestByIdUseCase(
  id: number,
): Promise<TServiceRequestResponse> {
  const service = getInjection("IServiceRequestService");
  return service.getById(id);
}
