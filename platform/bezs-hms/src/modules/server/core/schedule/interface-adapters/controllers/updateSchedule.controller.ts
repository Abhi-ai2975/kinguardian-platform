/**
 * updateScheduleController — interface adapter for partially updating a Schedule.
 *
 * Layer: interface-adapters / controllers
 * Operation: update (PATCH — scalar fields only, see PatchScheduleDtoSchema)
 *
 * Splits id from the dto before passing to the use case, matching the service
 * interface signature update(id, dto).
 */

import {
  PatchScheduleDtoSchema,
  PatchScheduleValidationSchema,
  TScheduleResponse,
} from "@/modules/entities/schemas/schedule";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateScheduleUseCase } from "../../application/usecases/updateSchedule.usecase";

function presenter(data: TScheduleResponse) {
  return data;
}

export type TUpdateScheduleControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the patch payload and applies the update.
 *
 * @param input - Raw payload: `{ id: number, ...patchable scalar fields }`.
 * @returns The updated schedule record.
 * @throws InputParseError | ValidationError | NotFoundError
 */
export async function updateScheduleController(
  input: unknown
): Promise<TUpdateScheduleControllerOutput> {
  const parsed = await PatchScheduleValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const { id, ...dto } = parsed.data;
  // Validate the dto portion independently so the error message is precise.
  const dtoParsed = await PatchScheduleDtoSchema.safeParseAsync(dto);
  if (!dtoParsed.success) throw new InputParseError(dtoParsed.error);

  const data = await updateScheduleUseCase(id, dtoParsed.data);
  return presenter(data);
}
