/**
 * listSchedulesController — interface adapter for listing Schedules.
 *
 * Layer: interface-adapters / controllers
 * Operation: list (paginated, filterable)
 *
 * Accepts optional query parameters. When no input is provided (undefined/null),
 * the use case is called with no filters and the server defaults apply.
 */

import {
  ListSchedulesValidationSchema,
  TPaginatedScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listSchedulesUseCase } from "../../application/usecases/listSchedules.usecase";

/** Pass-through presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedScheduleResponse) {
  return data;
}

export type TListSchedulesControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates optional query params and lists schedules.
 *
 * @param input - Optional raw query params (active, limit, offset).
 * @returns Paginated schedule list.
 * @throws InputParseError on Zod validation failure.
 */
export async function listSchedulesController(
  input?: unknown
): Promise<TListSchedulesControllerOutput> {
  // Allow calling with no args — just fetch with server defaults
  if (input === undefined || input === null) {
    const data = await listSchedulesUseCase();
    return presenter(data);
  }
  const parsed = await ListSchedulesValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listSchedulesUseCase(parsed.data);
  return presenter(data);
}
