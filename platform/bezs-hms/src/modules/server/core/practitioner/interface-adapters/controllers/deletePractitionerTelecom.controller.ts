/**
 * deletePractitionerTelecomController — validates input and invokes the delete-telecom use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerTelecomUseCase } from "../../application/usecases/deletePractitionerTelecom.usecase";

/**
 * Parses { practitionerId, itemId } and removes the telecom record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerTelecomController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerTelecomUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
