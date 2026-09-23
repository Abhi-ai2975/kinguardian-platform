/**
 * getIntakeById controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 */

import { GetIntakeByIdValidationSchema, type TIntakeResponse } from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { getIntakeByIdUseCase } from "../../application/usecases/getIntakeById.usecase";

function presenter(data: TIntakeResponse) {
  return data;
}

export type TGetIntakeByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * @param input - Raw payload ({ id }).
 * @returns The Intake record.
 */
export async function getIntakeByIdController(
  input: unknown,
): Promise<TGetIntakeByIdControllerOutput> {
  const parsed = await GetIntakeByIdValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await getIntakeByIdUseCase(parsed.data.id));
}
