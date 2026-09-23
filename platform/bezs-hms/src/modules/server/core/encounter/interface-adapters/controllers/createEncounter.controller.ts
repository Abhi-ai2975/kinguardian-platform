/**
 * createEncounterController — validates input and invokes the create use case.
 *
 * Layer: server / core / encounter / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateEncounterValidationSchema,
  type TEncounterResponse,
} from "@/modules/entities/schemas/encounter";
import { createEncounterUseCase } from "../../application/usecases/createEncounter.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TEncounterResponse) {
  return data;
}

export type TCreateEncounterControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createEncounterUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created Encounter resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createEncounterController(
  input: unknown,
): Promise<TCreateEncounterControllerOutput> {
  const parsed = await CreateEncounterValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createEncounterUseCase(parsed.data);
  return presenter(data);
}
