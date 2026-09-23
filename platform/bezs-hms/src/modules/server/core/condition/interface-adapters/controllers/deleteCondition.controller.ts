/**
 * deleteConditionController — validates input and invokes the delete use case.
 *
 * Layer: server / core / condition / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteConditionValidationSchema } from "@/modules/entities/schemas/condition";
import { deleteConditionUseCase } from "../../application/usecases/deleteCondition.usecase";

/**
 * Parses the raw input and delegates to deleteConditionUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteConditionController(input: unknown): Promise<void> {
  const parsed = await DeleteConditionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteConditionUseCase(parsed.data.id);
}
