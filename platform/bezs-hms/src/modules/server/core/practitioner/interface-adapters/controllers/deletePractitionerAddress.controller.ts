/**
 * deletePractitionerAddressController — validates input and invokes the delete-address use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerAddressUseCase } from "../../application/usecases/deletePractitionerAddress.usecase";

/**
 * Parses { practitionerId, itemId } and removes the address record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerAddressController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerAddressUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
