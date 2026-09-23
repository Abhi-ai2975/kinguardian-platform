/**
 * listIntakes controller.
 *
 * Layer: server / core / intake / interface-adapters / controllers
 *
 * Validates the list query, delegates to listIntakesUseCase, and passes
 * the paginated result through the presenter unchanged.
 */

import {
  ListIntakesValidationSchema,
  type TPaginatedIntakeResponse,
} from "@/modules/entities/schemas/intake";
import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { listIntakesUseCase } from "../../application/usecases/listIntakes.usecase";

/** @private Presenter — returns the paginated result as-is. */
function presenter(data: TPaginatedIntakeResponse) {
  return data;
}

/** Return type inferred from presenter for use in the ZSA action handler type. */
export type TListIntakesControllerOutput = ReturnType<typeof presenter>;

/**
 * Validates the list query and returns a paginated intake list.
 *
 * @param input - Raw filter/pagination payload.
 * @returns Paginated intake response.
 * @throws InputParseError if the query is malformed.
 */
export async function listIntakesController(
  input: unknown,
): Promise<TListIntakesControllerOutput> {
  const parsed = await ListIntakesValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  return presenter(await listIntakesUseCase(parsed.data));
}
