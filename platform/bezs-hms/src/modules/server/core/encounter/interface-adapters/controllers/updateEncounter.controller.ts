/**
 * updateEncounterController — validates input and invokes the update use case.
 *
 * Layer: server / core / encounter / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  UpdateEncounterValidationSchema,
  type TEncounterResponse,
} from "@/modules/entities/schemas/encounter";
import { updateEncounterUseCase } from "../../application/usecases/updateEncounter.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TEncounterResponse) {
  return data;
}

export type TUpdateEncounterControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, strips `id` into a separate arg, and delegates to updateEncounterUseCase.
 *
 * @param input - Raw unknown value from the server action (id + scalar patch fields).
 * @returns The updated Encounter resource.
 * @throws InputParseError on schema validation failure.
 */
export async function updateEncounterController(
  input: unknown,
): Promise<TUpdateEncounterControllerOutput> {
  const parsed = await UpdateEncounterValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const { id, ...dto } = parsed.data;
  const data = await updateEncounterUseCase(id, dto);
  return presenter(data);
}
