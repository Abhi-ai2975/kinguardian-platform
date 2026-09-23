/**
 * lookupController — validates input and delegates to the lookup use case.
 *
 * Layer: server / core / terminology / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  LookupValidationSchema,
  TLookupResult,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { lookupUseCase } from "../../application/usecases/lookup.usecase";

function presenter(data: TLookupResult) {
  return data;
}

/** Controller output type — inferred from presenter. */
export type TLookupControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the raw action payload and looks up a single concept.
 *
 * @param input - Unknown input from the ZSA action (validated here).
 * @returns Lookup result with found flag and optional concept details.
 * @throws InputParseError if the payload fails Zod validation.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function lookupController(
  input: unknown,
): Promise<TLookupControllerOutput> {
  const parsed = await LookupValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await lookupUseCase(parsed.data);
  return presenter(data);
}
