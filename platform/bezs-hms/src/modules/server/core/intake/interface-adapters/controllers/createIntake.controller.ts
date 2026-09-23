/**
 * createIntake controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 */

import {
  CreateIntakeValidationSchema,
  type TIntakeResponse,
} from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { createIntakeUseCase } from "../../application/usecases/createIntake.usecase";

function presenter(data: TIntakeResponse) {
  return data;
}

export type TCreateIntakeControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the create-intake payload and delegates to the use case.
 *
 * @param input - Raw create payload (userId injected by action).
 * @returns Created Intake record.
 * @throws InputParseError on validation failure.
 */
export async function createIntakeController(
  input: unknown,
): Promise<TCreateIntakeControllerOutput> {
  const parsed = await CreateIntakeValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await createIntakeUseCase(parsed.data));
}
