/**
 * validateController — validates input and delegates to the validate use case.
 *
 * Layer: server / core / terminology / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ValidateValidationSchema,
  TValidateResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { validateUseCase } from "../../application/usecases/validate.usecase";

function presenter(data: TValidateResponse) {
  return data;
}

/** Controller output type — inferred from presenter. */
export type TValidateControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the raw action payload and checks a code against a field binding.
 *
 * @param input - Unknown input from the ZSA action (validated here).
 * @returns Validation result: valid flag, in_value_set flag, and explanatory message.
 * @throws InputParseError if the payload fails Zod validation.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | NotFoundError | BadGatewayError
 */
export async function validateController(
  input: unknown,
): Promise<TValidateControllerOutput> {
  const parsed = await ValidateValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await validateUseCase(parsed.data);
  return presenter(data);
}
