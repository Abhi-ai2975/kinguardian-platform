/**
 * listLocationsUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: list locations with optional server-side filters and pagination
 *
 * Delegates to ILocationsService via the DI container.
 */

import {
  TListLocationsQuery,
  TPaginatedLocationResponse,
} from "@/modules/entities/schemas/location";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists locations with optional filtering and pagination.
 *
 * @param query - Optional: org_id, status, limit, offset.
 * @returns Paginated result: { total, limit, offset, data }.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listLocationsUseCase(
  query?: TListLocationsQuery
): Promise<TPaginatedLocationResponse> {
  const service = getInjection("ILocationsService");
  return service.list(query);
}
