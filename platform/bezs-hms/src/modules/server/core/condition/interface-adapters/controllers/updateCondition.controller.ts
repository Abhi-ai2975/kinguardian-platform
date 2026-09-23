/**
 * updateConditionController — validates input and invokes the update use case.
 *
 * Layer: server / core / condition / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateConditionValidationSchema,
  type TConditionResponse,
} from "@/modules/entities/schemas/condition";
import { updateConditionUseCase } from "../../application/usecases/updateCondition.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TConditionResponse) {
  return data;
}

export type TUpdateConditionControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, strips `id` into a separate arg, and delegates to updateConditionUseCase.
 *
 * @param input - Raw unknown value from the server action (id + scalar patch fields).
 * @returns The updated Condition resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateConditionController(
  input: unknown,
): Promise<TUpdateConditionControllerOutput> {
  const parsed = await UpdateConditionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateConditionUseCase(id, dto);
  return presenter(data);
}
