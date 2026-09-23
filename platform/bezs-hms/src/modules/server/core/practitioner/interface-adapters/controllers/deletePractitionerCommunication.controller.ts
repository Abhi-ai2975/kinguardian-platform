/**
 * deletePractitionerCommunicationController — validates input and invokes the delete-communication use case.
 *
 * Layer: server / core / practitioner / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeletePractitionerSubResourceValidationSchema } from "@/modules/entities/schemas/practitioner";
import { deletePractitionerCommunicationUseCase } from "../../application/usecases/deletePractitionerCommunication.usecase";

/**
 * Parses { practitionerId, itemId } and removes the communication record.
 *
 * @param input - Raw unknown value.
 * @throws InputParseError on schema validation failure.
 */
export async function deletePractitionerCommunicationController(input: unknown): Promise<void> {
  const parsed = await DeletePractitionerSubResourceValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deletePractitionerCommunicationUseCase(parsed.data.practitionerId, parsed.data.itemId);
}
