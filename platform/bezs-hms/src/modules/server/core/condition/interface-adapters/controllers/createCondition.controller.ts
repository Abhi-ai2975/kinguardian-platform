/**
 * createConditionController — validates input and invokes the create use case.
 *
 * Layer: server / core / condition / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateConditionValidationSchema,
  type TConditionResponse,
} from "@/modules/entities/schemas/condition";
import { createConditionUseCase } from "../../application/usecases/createCondition.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TConditionResponse) {
  return data;
}

export type TCreateConditionControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createConditionUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional per FHIR spec).
 * @returns The created Condition resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createConditionController(
  input: unknown,
): Promise<TCreateConditionControllerOutput> {
  const parsed = await CreateConditionValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createConditionUseCase(parsed.data);
  return presenter(data);
}
