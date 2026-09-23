/**
 * deletePractitionerIdentifierController — validates input and invokes the delete-identifier use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerIdentifierUseCase } from "../../application/usecases/deletePractitionerIdentifier.usecase";

/**
 * Parses { practitionerId, itemId } and removes the identifier record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerIdentifierController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerIdentifierUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
