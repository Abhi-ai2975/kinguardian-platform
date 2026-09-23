/**
 * updateLocationUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: partially update a Location (PATCH — scalar fields only)
 */

import {
  TLocationResponse,
  TPatchLocationDto,
} from "@/modules/entities/schemas/location";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates a location with the given patchable fields.
 *
 * @param id  - The fhir-gql primary key.
 * @param dto - Fields to patch (at least one required).
 * @returns The updated location record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateLocationUseCase(
  id: number,
  dto: TPatchLocationDto
): Promise<TLocationResponse> {
  const service = getInjection("ILocationsService");
  return service.update(id, dto);
}
