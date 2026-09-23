/**
 * deletePractitionerController — validates id input and invokes the delete use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerUseCase } from "../../application/usecases/deletePractitioner.usecase";

/**
 * Parses { id } and delegates to deletePractitionerUseCase.
 *
 * @param input - Raw unknown value containing { id: number }.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerUseCase(parsed.data.id);
}
