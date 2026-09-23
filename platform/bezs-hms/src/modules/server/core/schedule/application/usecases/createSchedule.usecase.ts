/**
 * createScheduleUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: create a new Schedule
 *
 * Delegates to ISchedulesService via the DI container.
 * Contains no business logic — validation is the controller's responsibility.
 */

import {
  TCreateSchedule,
  TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { getInjection } from "@/modules/server/di/container";

/**
 * Creates a new schedule via the injected SchedulesService.
 *
 * @param dto - Validated creation payload (user_id, org_id, and optional FHIR fields).
 * @returns The newly created schedule record.
 * @throws ValidationError | UnauthorizedError | BadGatewayError
 */
export async function createScheduleUseCase(
  dto: TCreateSchedule
): Promise<TScheduleResponse> {
  const service = getInjection("ISchedulesService");
  return service.create(dto);
}
