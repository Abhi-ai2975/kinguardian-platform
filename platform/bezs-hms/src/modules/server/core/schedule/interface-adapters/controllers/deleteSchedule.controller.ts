/**
 * deleteScheduleController — interface adapter for deleting a Schedule.
 *
 * Layer: interface-adapters / controllers
 * Operation: delete (irreversible — 204 No Content from fhir-gql, cascades to Slots)
 */

import { DeleteScheduleValidationSchema } from "@/modules/entities/schemas/schedule";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { deleteScheduleUseCase } from "../../application/usecases/deleteSchedule.usecase";

export type TDeleteScheduleControllerOutput = void;

/**
 * Validates the id and deletes the schedule.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function deleteScheduleController(
  input: unknown
): Promise<TDeleteScheduleControllerOutput> {
  const parsed = await DeleteScheduleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteScheduleUseCase(parsed.data.id);
}
