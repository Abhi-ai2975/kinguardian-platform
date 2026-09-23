/**
 * abandonIntake controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 */

import { AbandonIntakeValidationSchema, type TIntakeResponse } from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { abandonIntakeUseCase } from "../../application/usecases/abandonIntake.usecase";

function presenter(data: TIntakeResponse) {
  return data;
}

export type TAbandonIntakeControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw abandon payload (id).
 * @returns Updated Intake record with status ABANDONED.
 */
export async function abandonIntakeController(
  input: unknown,
): Promise<TAbandonIntakeControllerOutput> {
  const parsed = await AbandonIntakeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await abandonIntakeUseCase(parsed.data));
}
