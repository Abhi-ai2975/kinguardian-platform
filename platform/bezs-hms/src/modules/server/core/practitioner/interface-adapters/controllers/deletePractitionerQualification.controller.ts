/**
 * deletePractitionerQualificationController — validates input and invokes the delete-qualification use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerQualificationUseCase } from "../../application/usecases/deletePractitionerQualification.usecase";

/**
 * Parses { practitionerId, itemId } and removes the qualification record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerQualificationController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerQualificationUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
