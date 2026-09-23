/**
 * getHealthcareServiceByIdUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: fetch a single HealthcareService by its numeric ID
 */

import { THealthcareServiceResponse } from "@/modules/entities/schemas/healthcare-service";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single healthcare service by its fhir-gql primary key.
 *
 * @param id - The fhir-gql primary key for this healthcare service.
 * @returns The matching healthcare service record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getHealthcareServiceByIdUseCase(
  id: number
): Promise<THealthcareServiceResponse> {
  const service = getInjection("IHealthcareServicesService");
  return service.getById(id);
}
