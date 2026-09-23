/**
 * deleteObservationController — validates input and invokes the delete use case.
 *
 * Layer: server / core / observation / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteObservationValidationSchema } from "@/modules/entities/schemas/observation";
import { deleteObservationUseCase } from "../../application/usecases/deleteObservation.usecase";

/**
 * Parses the raw input and delegates to deleteObservationUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteObservationController(input: unknown): Promise<void> {
  const parsed = await DeleteObservationValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteObservationUseCase(parsed.data.id);
}
