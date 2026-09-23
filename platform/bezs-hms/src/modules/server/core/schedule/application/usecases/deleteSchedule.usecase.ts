/**
 * deleteScheduleUseCase — application layer use case.
 *
 * Layer: application / use cases
 * Operation: permanently delete a Schedule (cascades to its Slots)
 */

import { getInjection } from "@/modules/server/di/container";

/**
 * Deletes a schedule by its fhir-gql primary key (irreversible, cascades to Slots).
 *
 * @param id - The fhir-gql primary key.
 * @throws NotFoundError | UnauthorizedError | BadGatewayError
 */
export async function deleteScheduleUseCase(id: number): Promise<void> {
  const service = getInjection("ISchedulesService");
  return service.delete(id);
}
