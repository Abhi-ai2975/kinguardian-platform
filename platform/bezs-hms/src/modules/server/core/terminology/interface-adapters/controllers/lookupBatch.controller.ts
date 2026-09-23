/**
 * lookupBatchController — validates input and delegates to the lookupBatch use case.
 *
 * Layer: server / core / terminology / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  LookupBatchValidationSchema,
  TLookupBatchResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { lookupBatchUseCase } from "../../application/usecases/lookupBatch.usecase";

function presenter(data: TLookupBatchResponse) {
  return data;
}

/** Controller output type — inferred from presenter. */
export type TLookupBatchControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the raw action payload and performs a bulk concept lookup.
 *
 * @param input - Unknown input from the ZSA action (validated here).
 * @returns One LookupResult per input item, in input order.
 * @throws InputParseError if the payload fails Zod validation.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function lookupBatchController(
  input: unknown,
): Promise<TLookupBatchControllerOutput> {
  const parsed = await LookupBatchValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await lookupBatchUseCase(parsed.data);
  return presenter(data);
}
