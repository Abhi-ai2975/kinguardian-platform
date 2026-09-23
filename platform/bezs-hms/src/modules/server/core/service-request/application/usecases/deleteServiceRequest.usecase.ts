/**
 * deleteServiceRequest use case.
 *
 * Layer: server / core / service-request / application / usecases
 *
 * Resolves IServiceRequestService from DI and delegates the delete call.
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Permanently removes a ServiceRequest by ID.
 *
 * @param id - fhir-gql database ID of the resource to delete.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteServiceRequestUseCase(id: number): Promise<void> {
  const service = getInjection("IServiceRequestService");
  return service.delete(id);
}
