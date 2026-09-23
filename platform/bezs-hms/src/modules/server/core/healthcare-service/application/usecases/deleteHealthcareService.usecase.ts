/**
 * deleteHealthcareServiceUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: permanently delete a HealthcareService
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a healthcare service by its fhir-gql primary key (irreversible).
 *
 * @param id - The fhir-gql primary key.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteHealthcareServiceUseCase(id: number): Promise<void> {
  const service = getInjection("IHealthcareServicesService");
  return service.delete(id);
}
