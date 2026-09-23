/**
 * getConditionByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / condition / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdConditionValidationSchema,
  type TConditionResponse,
} from "@/modules/entities/schemas/condition";
import { getConditionByIdUseCase } from "../../application/usecases/getConditionById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TConditionResponse) {
  return data;
}

export type TGetConditionByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getConditionByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The Condition resource.
 * @throws InputParseError on schema validation failure.
 */
export async function getConditionByIdController(
  input: unknown,
): Promise<TGetConditionByIdControllerOutput> {
  const parsed = await GetByIdConditionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getConditionByIdUseCase(parsed.data.id);
  return presenter(data);
}
