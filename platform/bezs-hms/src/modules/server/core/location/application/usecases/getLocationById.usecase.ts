/**
 * getLocationByIdUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: fetch a single Location by its numeric ID
 */

import { TLocationResponse } from "@/modules/entities/schemas/location";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single location by its fhir-gql primary key.
 *
 * @param id - The fhir-gql primary key for this location.
 * @returns The matching location record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getLocationByIdUseCase(
  id: number
): Promise<TLocationResponse> {
  const service = getInjection("ILocationsService");
  return service.getById(id);
}
