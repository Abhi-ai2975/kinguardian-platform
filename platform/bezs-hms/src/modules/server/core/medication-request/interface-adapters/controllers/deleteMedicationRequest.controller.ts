/**
 * deleteMedicationRequestController — validates input and invokes the delete use case.
 *
 * Layer: server / core / medication-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import { DeleteMedicationRequestValidationSchema } from "@/modules/entities/schemas/medication-request";
import { deleteMedicationRequestUseCase } from "../../application/usecases/deleteMedicationRequest.usecase";

/**
 * Parses the raw input and delegates to deleteMedicationRequestUseCase.
 *
 * @param input - Raw unknown value from the server action (must contain { id: number }).
 * @throws InputParseError on schema validation failure.
 * @throws NotFoundError if the ID does not exist.
 */
export async function deleteMedicationRequestController(input: unknown): Promise<void> {
  const parsed = await DeleteMedicationRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  await deleteMedicationRequestUseCase(parsed.data.id);
}
