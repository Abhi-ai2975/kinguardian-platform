/**
 * deleteEncounterController — validates input and invokes the delete use case.
 *
 * Layer: server / core / encounter / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteEncounterValidationSchema } from "@/modules/entities/schemas/encounter";
import { deleteEncounterUseCase } from "../../application/usecases/deleteEncounter.usecase";

/**
 * Parses the raw input and delegates to deleteEncounterUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteEncounterController(input: unknown): Promise<void> {
  const parsed = await DeleteEncounterValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteEncounterUseCase(parsed.data.id);
}
