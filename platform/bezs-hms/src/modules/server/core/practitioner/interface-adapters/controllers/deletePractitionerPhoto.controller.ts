/**
 * deletePractitionerPhotoController — validates input and invokes the delete-photo use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerPhotoUseCase } from "../../application/usecases/deletePractitionerPhoto.usecase";

/**
 * Parses { practitionerId, itemId } and removes the photo record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerPhotoController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerPhotoUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
