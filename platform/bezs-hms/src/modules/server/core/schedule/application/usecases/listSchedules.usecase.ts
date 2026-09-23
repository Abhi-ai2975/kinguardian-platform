/**
 * listSchedulesUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: list schedules with optional server-side filters and pagination
 *
 * Delegates to ISchedulesService via the DI container.
 */

import {
  TListSchedulesQuery,
  TPaginatedScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { getInjection } from "@/modules/server/di/container";

/**
 * Lists schedules with optional filtering and pagination.
 *
 * @param query - Optional: active, limit, offset.
 * @returns Paginated result: { total, limit, offset, data }.
 * @throws UnauthorizedError | BadGatewayError
 */
export async function listSchedulesUseCase(
  query?: TListSchedulesQuery
): Promise<TPaginatedScheduleResponse> {
  const service = getInjection("ISchedulesService");
  return service.list(query);
}
