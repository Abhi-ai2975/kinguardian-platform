/**
 * listOrganizationsUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: list organizations with optional server-side filters and pagination
 *
 * Delegates to IOrganizationsService via the DI container.
 */

import {
  TListOrgsQuery,
  TPaginatedOrgResponse,
} from "@/modules/entities/schemas/organization";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists organizations with optional filtering and pagination.
 *
 * @param query - Optional: name substring, active flag, limit, offset.
 * @returns Paginated result: { total, limit, offset, data }.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listOrganizationsUseCase(
  query?: TListOrgsQuery
): Promise<TPaginatedOrgResponse> {
  const service = getInjection("IOrganizationsService");
  return service.list(query);
}
