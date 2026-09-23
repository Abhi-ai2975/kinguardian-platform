/**
 * updateIntake controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 */

import { UpdateIntakeValidationSchema, type TIntakeResponse } from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { updateIntakeUseCase } from "../../application/usecases/updateIntake.usecase";

function presenter(data: TIntakeResponse) {
  return data;
}

export type TUpdateIntakeControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw update payload (id, conversation, optional report).
 * @returns Updated Intake record.
 */
export async function updateIntakeController(
  input: unknown,
): Promise<TUpdateIntakeControllerOutput> {
  const parsed = await UpdateIntakeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await updateIntakeUseCase(parsed.data));
}
