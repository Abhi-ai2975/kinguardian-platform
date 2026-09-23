/**
 * deleteLocationUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: permanently delete a Location
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a location by its fhir-gql primary key (irreversible).
 *
 * @param id - The fhir-gql primary key.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteLocationUseCase(id: number): Promise<void> {
  const service = getInjection("ILocationsService");
  return service.delete(id);
}
