/**
 * createLocationUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: create a new Location
 *
 * Delegates to ILocationsService via the DI container.
 * Contains no business logic — validation is the controller's responsibility.
 */

import {
  TCreateLocation,
  TLocationResponse,
} from "@/modules/entities/schemas/location";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new location via the injected LocationService.
 *
 * @param dto - Validated creation payload (user_id, org_id, and optional FHIR fields).
 * @returns The newly created location record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createLocationUseCase(
  dto: TCreateLocation
): Promise<TLocationResponse> {
  const service = getInjection("ILocationsService");
  return service.create(dto);
}
