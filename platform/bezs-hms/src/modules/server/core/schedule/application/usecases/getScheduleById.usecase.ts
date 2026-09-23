/**
 * getScheduleByIdUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: fetch a single Schedule by its numeric ID
 */

import { TScheduleResponse } from "@/modules/entities/schemas/schedule";
import { getInjection } from "@/modules/server/di/container";

/**
 * Fetches a single schedule by its fhir-gql primary key.
 *
 * @param id - The fhir-gql primary key for this schedule.
 * @returns The matching schedule record.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function getScheduleByIdUseCase(
  id: number
): Promise<TScheduleResponse> {
  const service = getInjection("ISchedulesService");
  return service.getById(id);
}
