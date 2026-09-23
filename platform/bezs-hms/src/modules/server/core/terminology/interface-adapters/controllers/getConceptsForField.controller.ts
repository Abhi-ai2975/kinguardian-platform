/**
 * getConceptsForFieldController — validates input and delegates to the use case.
 *
 * Layer: server / core / terminology / interface-adapters / controllers
 *
 * Follows the single-responsibility controller pattern: parse input with Zod,
 * call the use case, return the presenter output. No business logic here.
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetConceptsForFieldValidationSchema,
  TConceptsForFieldResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { getConceptsForFieldUseCase } from "../../application/usecases/getConceptsForField.usecase";

/**
 * Passes the concepts response through unchanged — callers receive the full shape.
 *
 * @param data - Raw use case output.
 * @returns The concepts response as-is.
 */
function presenter(data: TConceptsForFieldResponse) {
  return data;
}

/** Controller output type — inferred from the presenter so it stays in sync. */
export type TGetConceptsForFieldControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the raw action payload and fetches concepts for the requested field.
 *
 * @param input - Unknown input from the ZSA action (validated here).
 * @returns Paginated concepts for the requested FHIR resource field.
 * @throws InputParseError if the payload fails Zod validation.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
 */
export async function getConceptsForFieldController(
  input: unknown,
): Promise<TGetConceptsForFieldControllerOutput> {
  const parsed = await GetConceptsForFieldValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await getConceptsForFieldUseCase(parsed.data);
  return presenter(data);
}
