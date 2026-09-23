/**
 * listHealthcareServicesUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: list healthcare services with optional server-side filters and pagination
 *
 * Delegates to IHealthcareServicesService via the DI container.
 */

import {
  TListHealthcareServicesQuery,
  TPaginatedHealthcareServiceResponse,
} from "@/modules/entities/schemas/healthcare-service";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists healthcare services with optional filtering and pagination.
 *
 * @param query - Optional: name substring, active flag, limit, offset.
 * @returns Paginated result: { total, limit, offset, data }.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listHealthcareServicesUseCase(
  query?: TListHealthcareServicesQuery
): Promise<TPaginatedHealthcareServiceResponse> {
  const service = getInjection("IHealthcareServicesService");
  return service.list(query);
}
