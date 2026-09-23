/**
 * getEncounterByIdController — validates input and invokes the getById use case.
 *
 * Layer: server / core / encounter / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  GetByIdEncounterValidationSchema,
  type TEncounterResponse,
} from "@/modules/entities/schemas/encounter";
import { getEncounterByIdUseCase } from "../../application/usecases/getEncounterById.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TEncounterResponse) {
  return data;
}

export type TGetEncounterByIdControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to getEncounterByIdUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @returns The Encounter resource.
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if the ID does not exist.
 */
export async function getEncounterByIdController(
  input: unknown,
): Promise<TGetEncounterByIdControllerOutput> {
  const parsed = await GetByIdEncounterValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await getEncounterByIdUseCase(parsed.data.id);
  return presenter(data);
}
