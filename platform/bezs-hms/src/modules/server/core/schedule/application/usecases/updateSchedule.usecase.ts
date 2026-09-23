/**
 * updateScheduleUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: partially update a Schedule (PATCH — scalar fields only)
 */

import {
  TScheduleResponse,
  TPatchScheduleDto,
} from "@/modules/entities/schemas/schedule";
import { getInjection } from "@/modules/server/di/container";

/**
 * Partially updates a schedule with the given patchable fields.
 *
 * @param id  - The fhir-gql primary key.
 * @param dto - Fields to patch (at least one required).
 * @returns The updated schedule record.
 * @throws ValidationError | NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function updateScheduleUseCase(
  id: number,
  dto: TPatchScheduleDto
): Promise<TScheduleResponse> {
  const service = getInjection("ISchedulesService");
  return service.update(id, dto);
}
