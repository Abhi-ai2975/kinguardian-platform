/**
 * listEncountersController — validates input and invokes the list use case.
 *
 * Layer: server / core / encounter / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  ListEncountersValidationSchema,
  type TPaginatedEncounterResponse,
} from "@/modules/entities/schemas/encounter";
import { listEncountersUseCase } from "../../application/usecases/listEncounters.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TPaginatedEncounterResponse) {
  return data;
}

export type TListEncountersControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw query input, delegates to listEncountersUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (all fields optional).
 * @returns Paginated encounter list.
 * @throws InputParseError on schema validation failure.
 */
export async function listEncountersController(
  input: unknown,
): Promise<TListEncountersControllerOutput> {
  const parsed = await ListEncountersValidationSchema.safeParseAsync(input ?? {});
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await listEncountersUseCase(parsed.data);
  return presenter(data);
}
