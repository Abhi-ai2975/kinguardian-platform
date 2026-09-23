/**
 * createPractitionerController — validates input and invokes the create use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreatePractitionerValidationSchema,
  type TPractitionerResponse,
} from "@/modules/entities/schemas/practitioner";
import { createPractitionerUseCase } from "../../application/usecases/createPractitioner.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPractitionerResponse) {
  return data;
}

export type TCreatePractitionerControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createPractitionerUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created Practitioner resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createPractitionerController(
  input: unknown,
): Promise<TCreatePractitionerControllerOutput> {
  const parsed = await CreatePractitionerValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createPractitionerUseCase(parsed.data);
  return presenter(data);
}
