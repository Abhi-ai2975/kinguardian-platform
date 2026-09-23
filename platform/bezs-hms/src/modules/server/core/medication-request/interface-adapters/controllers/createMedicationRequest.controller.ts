/**
 * createMedicationRequestController — validates input and invokes the create use case.
 *
 * Layer: server / core / medication-request / interface-adapters / controllers
 */

import { InputParseError } from "@/modules/server/shared/errors/schemaParseError";
import {
  CreateMedicationRequestValidationSchema,
  type TMedicationRequestResponse,
} from "@/modules/entities/schemas/medication-request";
import { createMedicationRequestUseCase } from "../../application/usecases/createMedicationRequest.usecase";

/** Presenter keeps the response shape stable regardless of internal changes. */
function presenter(data: TMedicationRequestResponse) {
  return data;
}

export type TCreateMedicationRequestControllerOutput = ReturnType<typeof presenter>;

/**
 * Parses the raw input, delegates to createMedicationRequestUseCase, and presents the result.
 *
 * @param input - Raw unknown value from the server action.
 * @returns The created MedicationRequest resource.
 * @throws InputParseError on schema validation failure.
 */
export async function createMedicationRequestController(
  input: unknown,
): Promise<TCreateMedicationRequestControllerOutput> {
  const parsed = await CreateMedicationRequestValidationSchema.safeParseAsync(input);
  if (!parsed.success) throw new InputParseError(parsed.error);
  const data = await createMedicationRequestUseCase(parsed.data);
  return presenter(data);
}
