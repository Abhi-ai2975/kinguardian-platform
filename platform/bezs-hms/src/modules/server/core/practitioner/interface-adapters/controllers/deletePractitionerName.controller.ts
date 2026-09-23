/**
 * deletePractitionerNameController — validates input and invokes the delete-name use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerNameUseCase } from "../../application/usecases/deletePractitionerName.usecase";

/**
 * Parses { practitionerId, itemId } and removes the name record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerNameController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerNameUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
