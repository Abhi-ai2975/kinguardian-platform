/**
 * updateHealthcareServiceUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: partially update a HealthcareService (PATCH — scalar + photo fields only)
 */

import {
  THealthcareServiceResponse,
  TPatchHealthcareServiceDto,
} from "@/modules/entities/schemas/healthcare-service";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates a healthcare service with the given patchable fields.
 *
 * @param id  - The fhir-gql primary key.
 * @param dto - Fields to patch (at least one required).
 * @returns The updated healthcare service record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateHealthcareServiceUseCase(
  id: number,
  dto: TPatchHealthcareServiceDto
): Promise<THealthcareServiceResponse> {
  const service = getInjection("IHealthcareServicesService");
  return service.update(id, dto);
}
