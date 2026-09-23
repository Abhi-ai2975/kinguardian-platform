/**
 * getScheduleByIdController — interface adapter for fetching a single Schedule.
 *
 * Layer: interface-adapters / controllers
 * Operation: getById
 */

import {
  GetScheduleByIdValidationSchema,
  TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getScheduleByIdUseCase } from "../../application/usecases/getScheduleById.usecase";

function presenter(data: TScheduleResponse) {
  return data;
}

export type TGetScheduleByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the id and fetches the matching schedule.
 *
 * @param input - Raw payload expected to contain `{ id: number }`.
 * @returns The schedule record.
 * @throws InputParseError | NotFoundError | UnauthorizedError
 */
export async function getScheduleByIdController(
  input: unknown
): Promise<TGetScheduleByIdControllerOutput> {
  const parsed = await GetScheduleByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getScheduleByIdUseCase(parsed.data.id);
  return presenter(data);
}
