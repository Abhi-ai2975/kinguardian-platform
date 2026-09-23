/**
 * listObservationsController — validates input and invokes the list use case.
 *
 * Layer: server / core / observation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListObservationsValidationSchema,
  type TPaginatedObservationResponse,
} from "@/modules/entities/schemas/observation";
import { listObservationsUseCase } from "../../application/usecases/listObservations.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedObservationResponse) {
  return data;
}

export type TListObservationsControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input, delegates to listObservationsUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional).
 * @returns Paginated observation list.
 * @throws InputParseError on schema validation failure.
 */
export async function listObservationsController(
  input: unknown,
): Promise<TListObservationsControllerOutput> {
  const parsed = await ListObservationsValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listObservationsUseCase(parsed.data);
  return presenter(data);
}
