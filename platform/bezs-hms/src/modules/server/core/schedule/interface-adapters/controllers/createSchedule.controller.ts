/**
 * createScheduleController — interface adapter for creating a Schedule.
 *
 * Layer: interface-adapters / controllers
 * Operation: create
 *
 * Validates the raw input against CreateScheduleValidationSchema, calls the
 * use case, and passes the result through the presenter. Throws
 * InputParseError on invalid input.
 */

import {
  CreateScheduleValidationSchema,
  TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createScheduleUseCase } from "../../application/usecases/createSchedule.usecase";

/** Pass-through presenter — returns the schedule record as-is for now. */
function presenter(data: TScheduleResponse) {
  return data;
}

export type TCreateScheduleControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates and executes a schedule creation.
 *
 * @param input - Raw (unknown) payload from the server action.
 * @returns The created schedule record.
 * @throws InputParseError on Zod validation failure.
 */
export async function createScheduleController(
  input: unknown
): Promise<TCreateScheduleControllerOutput> {
  const parsed = await CreateScheduleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createScheduleUseCase(parsed.data);
  return presenter(data);
}
