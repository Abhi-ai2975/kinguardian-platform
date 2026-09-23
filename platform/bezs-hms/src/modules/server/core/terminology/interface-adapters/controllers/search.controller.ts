/**
 * searchController — validates input and delegates to the search use case.
 *
 * Layer: server / core / terminology / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  SearchValidationSchema,
  TSearchResponse,
} from "@/modules/entities/schemas/terminology/terminology.schema";
import { searchUseCase } from "../../application/usecases/search.usecase";

function presenter(data: TSearchResponse) {
  return data;
}

/** Controller output type — inferred from presenter. */
export type TSearchControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the raw action payload and performs a terminology concept search.
 *
 * @param input - Unknown input from the ZSA action (validated here).
 * @returns Paginated list of matching concepts.
 * @throws InputParseError if the payload fails Zod validation.
 * @throws ValidationError | UnauthorizedError | ForbiddenError | BadGatewayError
 */
export async function searchController(
  input: unknown,
): Promise<TSearchControllerOutput> {
  const parsed = await SearchValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);

  const data = await searchUseCase(parsed.data);
  return presenter(data);
}
